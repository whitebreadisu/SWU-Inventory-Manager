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

variable "backend_image_tag" {
  description = "Tag of the backend image (in Artifact Registry) to deploy to Cloud Run. CI overrides this via -var with github.sha. The default keeps a local plan/apply pointed at a real deployed SHA rather than an empty string."
  type        = string
  # main HEAD at time of Phase 3 scaffold; update to a fresh SHA before apply.
  default = "62320bbf0d944dcc42f7db42d3f5b2e9258e0b8d"
}
