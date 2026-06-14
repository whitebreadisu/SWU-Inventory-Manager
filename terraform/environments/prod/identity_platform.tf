# P5 Stage 1: enables Firebase Authentication's Email/Password sign-in
# provider on the existing Firebase project (firebase.tf). This is the
# managed identity provider P5 builds on -- see Roadmap Section 5 and
# SWU_Platform_Learning_Guide.md's P5 chapter for the provider comparison.
resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = var.project_id

  sign_in {
    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [google_project_service.p5, google_firebase_project.default]
}
