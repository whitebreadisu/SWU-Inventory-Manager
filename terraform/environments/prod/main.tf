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

locals {
  # APIs needed for P2 (Production Deploy), enabled together since all three
  # stages of this phase happen in the same session.
  p2_apis = [
    "artifactregistry.googleapis.com", # container image repo (stage 1)
    "sqladmin.googleapis.com",         # Cloud SQL Admin API (stage 2)
    "secretmanager.googleapis.com",    # DB password storage (stage 2)
    "run.googleapis.com",              # Cloud Run service (stage 3)
  ]
}

resource "google_project_service" "p2" {
  for_each = toset(local.p2_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}
