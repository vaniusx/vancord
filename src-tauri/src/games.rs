//! Local game detection. On Windows this reads the Steam library manifests and
//! the running process list; elsewhere it reports nothing and the client falls
//! back to the manual "playing" picker.


#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedGame {
    pub app_id: u32,
    pub name: String,
    pub process: String,
}

#[cfg(windows)]
mod platform {
    use super::DetectedGame;
    use std::fs;
    use std::path::{Path, PathBuf};

    fn steam_roots() -> Vec<PathBuf> {
        let mut roots = Vec::new();

        for key in ["HKCU\\Software\\Valve\\Steam", "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam"] {
            if let Some(path) = read_registry_string(key, "SteamPath") {
                roots.push(PathBuf::from(path));
            }
        }

        if let Some(program_files) = std::env::var_os("ProgramFiles(x86)") {
            roots.push(PathBuf::from(program_files).join("Steam"));
        }

        roots.retain(|path| path.join("steamapps").is_dir());
        roots.dedup();
        roots
    }

    fn read_registry_string(key: &str, value: &str) -> Option<String> {
        let output = std::process::Command::new("reg")
            .args(["query", key, "/v", value])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        let line = text.lines().find(|line| line.contains(value))?;
        let parts: Vec<&str> = line.split("REG_SZ").collect();
        parts.get(1).map(|value| value.trim().to_string())
    }

    fn library_paths(root: &Path) -> Vec<PathBuf> {
        let mut libraries = vec![root.to_path_buf()];
        let vdf = root.join("steamapps").join("libraryfolders.vdf");
        if let Ok(content) = fs::read_to_string(vdf) {
            for line in content.lines() {
                let trimmed = line.trim();
                if !trimmed.starts_with("\"path\"") {
                    continue;
                }
                if let Some(value) = trimmed.split('"').nth(3) {
                    let path = PathBuf::from(value.replace("\\\\", "\\"));
                    if path.join("steamapps").is_dir() {
                        libraries.push(path);
                    }
                }
            }
        }
        libraries
    }

    fn installed_games() -> Vec<(u32, String, PathBuf)> {
        let mut games = Vec::new();
        for root in steam_roots() {
            for library in library_paths(&root) {
                let steamapps = library.join("steamapps");
                let Ok(entries) = fs::read_dir(&steamapps) else {
                    continue;
                };
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if !name.starts_with("appmanifest_") || !name.ends_with(".acf") {
                        continue;
                    }
                    let Ok(content) = fs::read_to_string(entry.path()) else {
                        continue;
                    };
                    let app_id = extract(&content, "appid").and_then(|value| value.parse::<u32>().ok());
                    let game_name = extract(&content, "name");
                    let install_dir = extract(&content, "installdir");
                    if let (Some(app_id), Some(game_name), Some(install_dir)) =
                        (app_id, game_name, install_dir)
                    {
                        let path = steamapps.join("common").join(install_dir);
                        games.push((app_id, game_name, path));
                    }
                }
            }
        }
        games
    }

    fn extract(content: &str, key: &str) -> Option<String> {
        let needle = format!("\"{key}\"");
        content.lines().find(|line| line.trim_start().starts_with(&needle)).and_then(|line| {
            let mut parts = line.split('"').filter(|part| !part.trim().is_empty());
            parts.next();
            parts.next().map(|value| value.trim().to_string())
        })
    }

    fn running_processes() -> Vec<String> {
        let output = std::process::Command::new("tasklist")
            .args(["/fo", "csv", "/nh"])
            .output();
        let Ok(output) = output else {
            return Vec::new();
        };
        String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| line.split(',').next())
            .map(|name| name.trim_matches('"').to_lowercase())
            .collect()
    }

    pub fn installed() -> Vec<(u32, String)> {
        installed_games()
            .into_iter()
            .map(|(app_id, name, _)| (app_id, name))
            .collect()
    }

    pub fn detect() -> Vec<DetectedGame> {
        let games = installed_games();
        if games.is_empty() {
            return Vec::new();
        }

        let processes = running_processes();
        let mut found: Vec<DetectedGame> = Vec::new();

        for (app_id, name, directory) in games {
            // The executable name is the same as the install directory in most
            // Steam titles, but not all of them, so both are checked.
            let Ok(entries) = fs::read_dir(&directory) else {
                continue;
            };
            let mut executables: Vec<String> = Vec::new();
            for entry in entries.flatten() {
                let path = entry.path();
                let is_dir = path.is_dir();
                let file_name = entry.file_name().to_string_lossy().to_lowercase();
                if !is_dir && file_name.ends_with(".exe") {
                    executables.push(file_name);
                }
                if is_dir {
                    if let Ok(inner) = fs::read_dir(&path) {
                        for nested in inner.flatten() {
                            let inner_name = nested.file_name().to_string_lossy().to_lowercase();
                            if inner_name.ends_with(".exe")
                                && (inner_name.contains("shipping")
                                    || inner_name.contains("win64")
                                    || inner_name.contains("game"))
                            {
                                executables.push(inner_name);
                            }
                        }
                    }
                }
            }

            if let Some(process) = executables
                .into_iter()
                .find(|executable| processes.iter().any(|running| running == executable))
            {
                found.push(DetectedGame { app_id, name, process });
            }
        }

        found
    }
}

#[cfg(not(windows))]
mod platform {
    use super::DetectedGame;

    pub fn detect() -> Vec<DetectedGame> {
        Vec::new()
    }

    pub fn installed() -> Vec<(u32, String)> {
        Vec::new()
    }
}

#[tauri::command]
pub fn detect_running_game() -> Option<DetectedGame> {
    platform::detect().into_iter().next()
}

#[tauri::command]
pub fn detect_running_games() -> Vec<DetectedGame> {
    platform::detect()
}

/// Manual library listing, used by the "playing" picker when detection is off.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryGame {
    pub app_id: u32,
    pub name: String,
}

#[tauri::command]
pub fn steam_library() -> Vec<LibraryGame> {
    platform::installed()
        .into_iter()
        .map(|(app_id, name)| LibraryGame { app_id, name })
        .collect()
}
