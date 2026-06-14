# P6 stage 2: a saved Cloud Monitoring dashboard for the backend Cloud Run
# service, built entirely from metrics Cloud Run already emits -- no
# application code changes. Three tiles: request rate (by response-code
# class), error rate (5xx as a % of total, via an MQL ratio query -- see the
# "Built-in Metrics vs. MQL" concept in the Learning Guide), and latency
# (p50/p95).
resource "google_monitoring_dashboard" "backend" {
  dashboard_json = jsonencode({
    displayName = "Backend Overview"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          xPos   = 0
          yPos   = 0
          width  = 6
          height = 4
          widget = {
            title = "Request Rate by Response Code"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_count\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner   = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                      groupByFields      = ["metric.label.response_code_class"]
                    }
                  }
                }
                plotType       = "STACKED_AREA"
                legendTemplate = "$${metric.labels.response_code_class}"
              }]
              yAxis = {
                label = "requests/sec"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          xPos   = 6
          yPos   = 0
          width  = 6
          height = 4
          widget = {
            title = "Error Rate (5xx % of requests)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesQueryLanguage = <<-MQL
                    { fetch cloud_run_revision
                      | metric 'run.googleapis.com/request_count'
                      | filter resource.service_name == '${google_cloud_run_v2_service.backend.name}' && metric.response_code_class == '5xx'
                      | align rate(1m)
                      | group_by [], [val: sum(value.request_count)]
                    ; fetch cloud_run_revision
                      | metric 'run.googleapis.com/request_count'
                      | filter resource.service_name == '${google_cloud_run_v2_service.backend.name}'
                      | align rate(1m)
                      | group_by [], [val: sum(value.request_count)]
                    }
                    | ratio
                    | value [error_rate_pct: val() * 100]
                  MQL
                }
                plotType = "LINE"
              }]
              yAxis = {
                label = "%"
                scale = "LINEAR"
              }
            }
          }
        },
        {
          xPos   = 0
          yPos   = 4
          width  = 12
          height = 4
          widget = {
            title = "Request Latency (p50 / p95)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_PERCENTILE_50"
                        crossSeriesReducer = "REDUCE_MEAN"
                        groupByFields      = []
                      }
                    }
                  }
                  plotType       = "LINE"
                  legendTemplate = "p50"
                },
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_PERCENTILE_95"
                        crossSeriesReducer = "REDUCE_MEAN"
                        groupByFields      = []
                      }
                    }
                  }
                  plotType       = "LINE"
                  legendTemplate = "p95"
                }
              ]
              yAxis = {
                label = "ms"
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })

  depends_on = [google_project_service.p6]
}

# P6 stage 3: an email notification channel plus an alert policy that fires
# when the backend returns any 5xx response. Reuses the exact filter and
# aggregation from the "Request Rate by Response Code" tile above, narrowed
# to the 5xx response-code class -- see "Alert Policies & Notification
# Channels" and "Alert Fatigue, Concretely" in the Learning Guide for why
# "any 5xx, sustained for 60s" is the right threshold at swu-prod's current
# traffic (a percentage-of-traffic threshold like Stage 2's dashboard tile
# would be meaningless at this volume).
resource "google_monitoring_notification_channel" "email" {
  display_name = "Jeremy (primary)"
  type         = "email"

  labels = {
    email_address = "jeremy.braden@gmail.com"
  }
}

resource "google_monitoring_alert_policy" "high_5xx_rate" {
  display_name = "Elevated 5xx Error Rate"
  combiner     = "OR"

  conditions {
    display_name = "Backend returning 5xx responses"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = []
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    content   = "The backend returned at least one 5xx response in the last minute. Check the \"Backend Overview\" dashboard and Cloud Logging (severity=ERROR) for the request's traceback."
    mime_type = "text/markdown"
  }

  depends_on = [google_project_service.p6]
}
