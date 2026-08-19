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
)

func RecordSSOEvent(eventType, status string) {
	SSOEventsTotal.WithLabelValues(eventType, status).Inc()
}
