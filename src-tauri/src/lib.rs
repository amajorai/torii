use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_decorum::WebviewWindowExt;

pub mod embeddings;
pub mod secure_storage;
pub mod security;

#[tauri::command]
async fn migrate_app_data(_app: tauri::AppHandle) -> Result<bool, String> {
    Ok(false)
}

#[tauri::command]
async fn fetch_as_base64(url: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let bytes = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    use base64::Engine;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.create_overlay_titlebar().unwrap();

            #[cfg(target_os = "macos")]
            {
                main_window.set_traffic_lights_inset(12.0, 16.0).unwrap();
            }

            let app_data_dir = app.path().app_data_dir().unwrap();
            let app_name = app.package_info().name.clone();

            secure_storage::init_secure_storage(&app_name, &app_data_dir)
                .expect("Failed to initialize secure storage");

            let embedding_conn = embeddings::init_embedding_db(&app_data_dir)
                .expect("Failed to initialize embeddings DB");
            app.manage(embeddings::EmbeddingDb(Mutex::new(embedding_conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            secure_storage::secure_storage_store,
            secure_storage::secure_storage_retrieve,
            secure_storage::secure_storage_remove_encrypted,
            secure_storage::secure_storage_exists,
            secure_storage::secure_storage_store_batch,
            secure_storage::secure_storage_retrieve_batch,
            secure_storage::secure_storage_list_keys,
            secure_storage::secure_storage_clear_all,
            fetch_as_base64,
            migrate_app_data,
            embeddings::store_embedding,
            embeddings::mark_embedding_failed,
            embeddings::delete_embedding,
            embeddings::search_similar_embeddings,
            embeddings::get_embedded_record_ids,
            embeddings::get_embedding_stats,
            embeddings::reset_failed_embeddings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
