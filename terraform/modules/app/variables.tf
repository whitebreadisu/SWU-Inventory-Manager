variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Default GCP region for resources"
  type        = string
}

variable "backend_image_tag" {
  description = "Tag of the backend image (in Artifact Registry) to deploy to Cloud Run."
  type        = string
}

variable "sql_instance_name" {
  description = "Cloud SQL instance name. Differs per environment (e.g. swu-prod-pg vs swu-dev-pg)."
  type        = string
}

variable "sql_tier" {
  description = "Cloud SQL instance machine tier."
  type        = string
  default     = "db-f1-micro"
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection on the Cloud SQL instance. Set to false for non-prod environments."
  type        = bool
  default     = true
}

variable "environment_name" {
  description = "Environment label passed to Cloud Run as the ENVIRONMENT env var (e.g. 'production', 'development')."
  type        = string
  default     = "production"
}

variable "notification_email" {
  description = "Email address for the Cloud Monitoring alert notification channel."
  type        = string
}

variable "notification_channel_display_name" {
  description = "Display name for the Cloud Monitoring email notification channel."
  type        = string
}
