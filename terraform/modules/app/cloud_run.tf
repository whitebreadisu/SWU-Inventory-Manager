resource "google_service_account" "backend_runtime" {
  account_id   = "backend-runtime"
  display_name = "Backend Runtime"
  description  = "Identity used by the Cloud Run backend service at runtime (Cloud SQL connection, secret access)."
  # Note: depends_on [google_project_service.baseline] is handled at the
  # module call site via the prod env's dependency on the baseline APIs.
}

resource "google_project_iam_member" "backend_runtime_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend_runtime.email}"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # Wired to the env's deletion_protection (prod default true = no prod change;
  # dev passes false so a disposable env can be torn down). Added 2026-06-27
  # (BL-43 Phase 3) — see #69.
  deletion_protection = var.deletion_protection

  template {
    service_account = google_service_account.backend_runtime.email

    containers {
      image = "${google_artifact_registry_repository.backend.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.repository_id}/api:${var.backend_image_tag}"

      ports {
        # Matches the Dockerfile's hardcoded `uvicorn --port 8000`.
        container_port = 8000
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "APP_DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app_db_password.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "APP_DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app_database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment_name
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }
  }

  # Cloud Run reads these secrets via `versions/latest`; that reference does not
  # create a Terraform dependency on the *version* resources, so on a clean
  # from-scratch apply Cloud Run can deploy before the versions exist
  # ("Secret .../versions/latest was not found"). Explicit depends_on fixes the
  # ordering. (Surfaced by the BL-43 dev environment's first clean apply, 2026-06-27;
  # prod never hit it because it was built incrementally. depends_on is ordering-only,
  # so prod's plan stays 0/0/0.)
  depends_on = [
    google_project_service.p2,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.app_db_password,
    google_secret_manager_secret_version.app_database_url,
  ]
}

# Required for "It's alive" (P2 milestone): the API has no auth in front of
# it yet (auth is P5), so this makes it reachable on the public internet.
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = google_cloud_run_v2_service.backend.project
  location = google_cloud_run_v2_service.backend.location
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
