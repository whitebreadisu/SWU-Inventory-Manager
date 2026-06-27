output "project_id" {
  value = var.project_id
}

output "enabled_apis" {
  value = [for s in google_project_service.baseline : s.service]
}

output "terraform_ci_service_account" {
  value = google_service_account.terraform_ci.email
}

output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

# App-stack outputs (surfaced from the shared module)
output "backend_repository_url" {
  description = "Base path for backend image tags, e.g. <this>/api:<tag>"
  value       = module.app.backend_repository_url
}

output "cloud_sql_connection_name" {
  value = module.app.cloud_sql_connection_name
}

output "backend_url" {
  value = module.app.backend_url
}

output "firebase_web_app_api_key" {
  description = "Firebase Web App API key, passed to the frontend build as VITE_FIREBASE_API_KEY."
  value       = module.app.firebase_web_app_api_key
}

output "firebase_web_app_auth_domain" {
  description = "Firebase Web App auth domain, passed to the frontend build as VITE_FIREBASE_AUTH_DOMAIN."
  value       = module.app.firebase_web_app_auth_domain
}
