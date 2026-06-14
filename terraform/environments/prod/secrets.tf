resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.p2]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.p2]
}

# Full DSN for the Cloud Run backend, using the Cloud SQL Unix socket path
# (Cloud Run's native Cloud SQL volume mount, not the Auth Proxy used for the
# Stage 2 data load).
resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${google_sql_user.app.name}:${random_password.db_password.result}@/${google_sql_database.inventory.name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
}

resource "google_secret_manager_secret_iam_member" "backend_runtime_database_url" {
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_runtime.email}"
}

# P4 Stage 2: password for the swu_app role created by migration 0019.
# alembic upgrade head (run on every Cloud Run start) reads this so it can
# CREATE ROLE swu_app. Also used below (Stage 3) to build APP_DATABASE_URL,
# the request-serving connection string.
resource "random_password" "app_db_password" {
  length  = 32
  special = false
}

resource "google_secret_manager_secret" "app_db_password" {
  secret_id = "app-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.p2]
}

resource "google_secret_manager_secret_version" "app_db_password" {
  secret      = google_secret_manager_secret.app_db_password.id
  secret_data = random_password.app_db_password.result
}

resource "google_secret_manager_secret_iam_member" "backend_runtime_app_db_password" {
  secret_id = google_secret_manager_secret.app_db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_runtime.email}"
}

# P4 Stage 3: connection string for swu_app, the RLS-aware role migration
# 0019 creates. app/database.py reads APP_DATABASE_URL to build the
# request-serving (Depends(get_db)) connection -- swu_user/DATABASE_URL
# above remains the migration-running admin connection.
resource "google_secret_manager_secret" "app_database_url" {
  secret_id = "app-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.p2]
}

resource "google_secret_manager_secret_version" "app_database_url" {
  secret      = google_secret_manager_secret.app_database_url.id
  secret_data = "postgresql://swu_app:${random_password.app_db_password.result}@/${google_sql_database.inventory.name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
}

resource "google_secret_manager_secret_iam_member" "backend_runtime_app_database_url" {
  secret_id = google_secret_manager_secret.app_database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_runtime.email}"
}
