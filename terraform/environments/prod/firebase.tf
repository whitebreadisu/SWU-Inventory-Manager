# Enables Firebase on swu-prod (P2 stage 4). This is the prerequisite for
# Firebase Hosting; the Hosting site itself and its content are managed via
# the Firebase CLI (frontend/firebase.json + `firebase deploy`), the same
# split as Artifact Registry repo (Terraform) vs. image push (docker, stage 1).
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.p2_stage4]
}
