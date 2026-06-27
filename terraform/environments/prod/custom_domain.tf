# Stage E (jeremy-portfolio portal): maps swu.jeremybradenapps.com to this
# project's Firebase Hosting site. wait_dns_verification = false on first
# apply so Terraform doesn't block waiting for DNS records that don't exist
# yet - required_dns_updates tells us what to add to jeremy-portfolio's
# Cloud DNS zone, then we apply again.
resource "google_firebase_hosting_custom_domain" "swu_subdomain" {
  provider = google-beta
  project  = var.project_id

  site_id       = var.project_id
  custom_domain = "swu.jeremybradenapps.com"

  wait_dns_verification = false

  # google_firebase_project.default now lives inside module.app.
  depends_on = [module.app]
}
