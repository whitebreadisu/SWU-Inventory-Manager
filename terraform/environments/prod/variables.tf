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
  # CI's `deploy` job always overrides this via `-var="backend_image_tag=${{ github.sha }}"`.
  # The default only matters for a local `terraform apply` (e.g. an IAM grant)
  # run without that flag — keep it pointed at a recently-deployed SHA so a
  # local apply doesn't silently roll Cloud Run back to a stale image.
  default = "46243cc97db55838e590f657517e16656d5e688b"
}
