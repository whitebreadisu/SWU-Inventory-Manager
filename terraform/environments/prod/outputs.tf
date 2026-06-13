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

output "custom_domain_required_dns_updates" {
  description = "DNS records Firebase needs for the swu.jeremybradenapps.com custom domain (TXT verification, A/AAAA hosting). Add these to jeremy-portfolio's dns.tf."
  value       = google_firebase_hosting_custom_domain.swu_subdomain.required_dns_updates
}

output "custom_domain_state" {
  description = "Ownership and hosting state of the swu.jeremybradenapps.com custom domain"
  value = {
    ownership_state = google_firebase_hosting_custom_domain.swu_subdomain.ownership_state
    host_state      = google_firebase_hosting_custom_domain.swu_subdomain.host_state
  }
}
