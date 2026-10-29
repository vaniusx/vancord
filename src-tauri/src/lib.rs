#[cfg(desktop)]
mod games;

#[cfg(desktop)]
use tauri::{
    Emitter, WindowEvent,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg(desktop)]
const TRAY_ID: &str = "main";

#[cfg(desktop)]
fn focus_main_window(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(desktop)]
fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    // Kept in one place so the Turkish labels cannot drift between the menu and
    // the client: the ids are stable, the text lives here.
    let open = MenuItem::with_id(app, "open", "Vancord'u Aç", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Ayarlar", true, None::<&str>)?;
    let status_online = MenuItem::with_id(app, "status:online", "Çevrimiçi", true, None::<&str>)?;
    let status_idle = MenuItem::with_id(app, "status:idle", "Boşta", true, None::<&str>)?;
    let status_dnd = MenuItem::with_id(app, "status:dnd", "Rahatsız Etme", true, None::<&str>)?;
    let status_invisible =
        MenuItem::with_id(app, "status:invisible", "Görünmez", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
    let separator_top = PredefinedMenuItem::separator(app)?;
    let separator_bottom = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &settings,
            &separator_top,
            &status_online,
            &status_idle,
            &status_dnd,
            &status_invisible,
            &separator_bottom,
            &quit,
        ],
    )?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(
            app.default_window_icon()
                .expect("missing default window icon")
                .clone(),
        )
        .tooltip("Vancord")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => focus_main_window(app),
            "settings" => {
                focus_main_window(app);
                let _ = app.emit("tray://settings", ());
            }
            "quit" => app.exit(0),
            id if id.starts_with("status:") => {
                let _ = app.emit("tray://status", id.trim_start_matches("status:"));
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                focus_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Warn)
                .build(),
        );

    // Desktop-only plugins: tray, autostart, single instance, updater and window
    // state have no meaning (or no implementation) on Android and iOS.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build());

    let builder = builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                build_tray(app.handle())?;
            }
            #[cfg(not(desktop))]
            let _ = app;
            Ok(())
        })
        .on_window_event(|window, event| {
            if !cfg!(desktop) {
                return;
            }
            #[cfg(desktop)]
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        });

    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        games::detect_running_game,
        games::detect_running_games,
        games::steam_library
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running Vancord");
}
