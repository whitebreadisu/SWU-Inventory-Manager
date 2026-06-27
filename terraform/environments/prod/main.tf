locals {
  baseline_apis = [
    "storage.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "sts.googleapis.com",
  ]
}

resource "google_project_service" "baseline" {
  for_each = toset(local.baseline_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

module "app" {
  source = "../../modules/app"

  project_id                        = var.project_id
  region                            = var.region
  backend_image_tag                 = var.backend_image_tag
  sql_instance_name                 = "swu-prod-pg"
  notification_email                = "jeremy.braden@gmail.com"
  notification_channel_display_name = "Jeremy (primary)"
  # sql_tier, deletion_protection, and environment_name use module defaults
  # (db-f1-micro, true, "production") which match the prod configuration.

  providers = {
    google      = google
    google-beta = google-beta
  }
}
