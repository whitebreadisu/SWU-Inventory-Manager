# Enables Firebase on swu-prod (P2 stage 4). This is the prerequisite for
# Firebase Hosting; the Hosting site itself and its content are managed via
# the Firebase CLI (frontend/firebase.json + `firebase deploy`), the same
# split as Artifact Registry repo (Terraform) vs. image push (docker, stage 1).
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.p2_stage4]
}

# P5 stage 4 prerequisite: registers a Firebase Web App under swu-prod's
# Firebase project, so the deployed frontend can use real Firebase
# Authentication instead of the local Auth Emulator's "demo-swu" fallback
# config (frontend/src/firebase.ts).
resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = var.project_id
  display_name = "SWU Inventory Manager"

  depends_on = [google_firebase_project.default]
}

# Reads the Web App's SDK config (apiKey, authDomain) so CI can pass it to
# the frontend build as VITE_FIREBASE_* env vars -- see outputs.tf and
# .github/workflows/ci.yml's frontend-deploy job.
data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.default.app_id
}
