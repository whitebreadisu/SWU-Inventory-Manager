variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "swu-prod"
}

variable "region" {
  description = "Default GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "backend_image_tag" {
  description = "Tag of the backend image (in the Artifact Registry repo) to deploy to Cloud Run."
  type        = string
  default     = "v1"
}
