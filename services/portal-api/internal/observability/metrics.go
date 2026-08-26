package observability

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	HttpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests",
	}, []string{"method", "route", "status_class"})

	HttpRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "Duration of HTTP requests",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "route"})

	HttpInFlight = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "http_in_flight_requests",
		Help: "Current number of in-flight requests",
	}, []string{"method", "route"})
)

// responseWriter captures the status code for metrics
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		route := r.Pattern
		if route == "" {
			route = "unknown"
		}

		HttpInFlight.WithLabelValues(r.Method, route).Inc()
		defer HttpInFlight.WithLabelValues(r.Method, route).Dec()

		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		statusClass := strconv.Itoa(rw.status/100) + "xx"

		HttpRequestsTotal.WithLabelValues(r.Method, route, statusClass).Inc()
		HttpRequestDuration.WithLabelValues(r.Method, route).Observe(duration)
	})
}

var (
	SSOEventsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "sso_events_total",
		Help: "Total number of SSO events",
	}, []string{"event_type", "status"})

	// Event Inbox Metrics (TASK-011)
	EventInboxIngestTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "event_inbox_ingest_total",
		Help: "Total number of event inbox ingestion attempts",
	}, []string{"event_type", "result"})

	EventInboxProcessTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "event_inbox_process_total",
		Help: "Total number of event inbox processing results",
	}, []string{"event_type", "result"})

	EventInboxBacklog = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "event_inbox_backlog",
		Help: "Current number of events in each inbox status",
	}, []string{"status"})

	EventInboxProcessDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "event_inbox_process_duration_seconds",
		Help:    "Duration of event processing",
		Buckets: prometheus.DefBuckets,
	}, []string{"event_type"})

	NotificationActionsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "notification_actions_total",
		Help: "Total in-app notification actions by bounded result",
	}, []string{"action"})

	TrainingAggregationsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "training_program_aggregations_total",
		Help: "Total training program aggregations by bounded operation and state",
	}, []string{"operation", "state"})
)

func RecordSSOEvent(eventType, status string) {
	SSOEventsTotal.WithLabelValues(eventType, status).Inc()
}

// RecordEventIngest records an event ingestion result metric.
func RecordEventIngest(eventType, result string) {
	if eventType == "" {
		eventType = "unknown"
	}
	EventInboxIngestTotal.WithLabelValues(eventType, result).Inc()
}

// RecordEventProcess records an event processing result metric.
func RecordEventProcess(eventType, result string) {
	EventInboxProcessTotal.WithLabelValues(eventType, result).Inc()
}

// SetEventInboxBacklog sets the current backlog gauge for a given status.
func SetEventInboxBacklog(status string, count float64) {
	EventInboxBacklog.WithLabelValues(status).Set(count)
}

// RecordEventProcessDuration records event processing duration.
func RecordEventProcessDuration(eventType string, durationSec float64) {
	EventInboxProcessDuration.WithLabelValues(eventType).Observe(durationSec)
}

func RecordNotificationAction(action string) {
	NotificationActionsTotal.WithLabelValues(action).Inc()
}

func RecordTrainingAggregation(operation, state string) {
	TrainingAggregationsTotal.WithLabelValues(operation, state).Inc()
}
