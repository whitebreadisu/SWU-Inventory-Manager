variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "swu-dev-jbapps"
}

variable "region" {
  description = "Default GCP region for resources"
  type        = string
  default     = "us-central1"
}
