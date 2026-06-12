output "project_id" {
  value = var.project_id
}

output "enabled_apis" {
  value = [for s in google_project_service.baseline : s.service]
}
