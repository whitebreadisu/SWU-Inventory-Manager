module "app" {
  source = "../../modules/app"

  project_id        = var.project_id
  region            = var.region
  backend_image_tag = var.backend_image_tag

  # Dev-specific overrides
  sql_instance_name = "swu-dev-pg"
  sql_tier          = "db-f1-micro"
  deletion_protection = false # dev environment must be tear-down-able
  environment_name  = "development"

  notification_email                = "jeremy.braden@gmail.com"
  notification_channel_display_name = "Jeremy (dev)"

  # Module contains firebase.tf and identity_platform.tf resources that require
  # google-beta; pass both providers explicitly so Terraform can route correctly.
  providers = {
    google      = google
    google-beta = google-beta
  }
}
