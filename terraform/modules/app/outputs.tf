output "backend_repository_url" {
  description = "Base path for backend image tags, e.g. <this>/api:<tag>"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}"
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "firebase_web_app_api_key" {
  description = "Firebase Web App API key, passed to the frontend build as VITE_FIREBASE_API_KEY."
  value       = data.google_firebase_web_app_config.default.api_key
}

output "firebase_web_app_auth_domain" {
  description = "Firebase Web App auth domain, passed to the frontend build as VITE_FIREBASE_AUTH_DOMAIN."
  value       = data.google_firebase_web_app_config.default.auth_domain
}
