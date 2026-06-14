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

locals {
  # APIs needed for P2 stage 4 (static frontend hosting), a separate session
  # from the other three P2 stages.
  p2_stage4_apis = [
    "firebase.googleapis.com",        # enables Firebase on this GCP project
    "firebasehosting.googleapis.com", # Hosting-specific API
  ]
}

resource "google_project_service" "p2_stage4" {
  for_each = toset(local.p2_stage4_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

locals {
  # APIs needed for P5 stage 1: Firebase Authentication is backed by the
  # Identity Platform / Identity Toolkit API.
  p5_apis = [
    "identitytoolkit.googleapis.com",
  ]
}

resource "google_project_service" "p5" {
  for_each = toset(local.p5_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}
