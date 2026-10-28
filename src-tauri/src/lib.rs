mod games;

use tauri::{
    Emitter, Manager, WindowEvent,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

const TRAY_ID: &str = "main";

fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Vancord'u AÃƒÂ§", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Ayarlar", true, None::<&str>)?;
    let status_online = MenuItem::with_id(app, "status:online", "Ãƒâ€¡evrimiÃƒÂ§i", true, None::<&str>)?;
    let status_idle = MenuItem::with_id(app, "status:idle", "BoÃ…Å¸ta", true, None::<&str>)?;
    let status_dnd = MenuItem::with_id(app, "status:dnd", "RahatsÃ„Â±z Etme", true, None::<&str>)?;
    let status_invisible =
        MenuItem::with_id(app, "status:invisible", "GÃƒÂ¶rÃƒÂ¼nmez", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Ãƒâ€¡Ã„Â±kÃ„Â±Ã…Å¸", true, None::<&str>)?;
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
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            build_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            games::detect_running_game,
            games::detect_running_games,
            games::steam_library
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vancord");
}
