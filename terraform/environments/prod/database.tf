resource "google_sql_database_instance" "main" {
  name             = "swu-prod-pg"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-f1-micro"
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"

    backup_configuration {
      enabled = true
    }

    ip_configuration {
      # Public IP, but no authorized networks: Cloud Run reaches this
      # instance via the IAM-authenticated Cloud SQL Auth Proxy, not a
      # network-level allow-list.
      ipv4_enabled = true
    }
  }

  deletion_protection = true

  depends_on = [google_project_service.p2]
}

resource "google_sql_database" "inventory" {
  name     = "swu_inventory"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "swu_user"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}
