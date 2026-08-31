package main

import (
	"database/sql"
	"net/url"
	"strings"
	"time"

	"teman-belajar-api/internal/adapters/healthprobe"
	"teman-belajar-api/internal/domain/integrationhealth"
)

type integrationHealthConfig struct {
	MoodleURL          string
	KeycloakIssuerURL  string
	MeilisearchURL     string
	RedisURL           string
	MinioEndpoint      string
	MinioUseSSL        bool
	PrometheusURL      string
	GrafanaURL         string
	OTelCollectorURL   string
	LokiURL            string
	TempoURL           string
	SearchWorkerURL    string
	AnalyticsWorkerURL string
}

func buildIntegrationHealthService(db *sql.DB, config integrationHealthConfig) *integrationhealth.Service {
	probes := []integrationhealth.Probe{
		healthprobe.NewStatic(definition("portal-api", "Portal API", "platform")),
		healthprobe.NewDatabase(definition("portal-database", "Database Portal", "database"), db),
	}
	probes = append(probes,
		httpProbe(definition("moodle", "Moodle", "learning"), fixedPath(config.MoodleURL, "/login/index.php")),
		httpProbe(definition("keycloak", "Keycloak", "identity"), fixedPath(config.KeycloakIssuerURL, "/.well-known/openid-configuration")),
		httpProbe(definition("meilisearch", "Meilisearch", "search"), fixedPath(config.MeilisearchURL, "/health")),
	)
	if probe, err := healthprobe.NewRedis(definition("redis", "Redis", "cache"), config.RedisURL); err == nil {
		probes = append(probes, probe)
	} else {
		probes = append(probes, healthprobe.NewUnknown(definition("redis", "Redis", "cache")))
	}
	minioScheme := "http://"
	if config.MinioUseSSL {
		minioScheme = "https://"
	}
	probes = append(probes,
		httpProbe(definition("minio", "MinIO", "storage"), fixedPath(minioScheme+config.MinioEndpoint, "/minio/health/live")),
		workerProbe(definition("search-worker", "Search Worker", "workers"), fixedPath(config.SearchWorkerURL, "/healthz")),
		workerProbe(definition("analytics-worker", "Analytics Worker", "workers"), fixedPath(config.AnalyticsWorkerURL, "/healthz")),
		httpProbe(definition("prometheus", "Prometheus", "observability"), fixedPath(config.PrometheusURL, "/-/ready")),
		httpProbe(definition("grafana", "Grafana", "observability"), fixedPath(config.GrafanaURL, "/api/health")),
		httpProbe(definition("otel-collector", "OpenTelemetry Collector", "observability"), fixedPath(config.OTelCollectorURL, "/")),
		httpProbe(definition("loki", "Loki", "observability"), fixedPath(config.LokiURL, "/ready")),
		httpProbe(definition("tempo", "Tempo", "observability"), fixedPath(config.TempoURL, "/ready")),
	)
	return integrationhealth.NewService(probes, 2*time.Second)
}

func definition(key, name, group string) integrationhealth.Definition {
	return integrationhealth.Definition{Key: key, Name: name, Group: group}
}

func httpProbe(definition integrationhealth.Definition, target string) integrationhealth.Probe {
	probe, err := healthprobe.NewHTTP(definition, target)
	if err != nil {
		return healthprobe.NewUnknown(definition)
	}
	return probe
}

func workerProbe(definition integrationhealth.Definition, target string) integrationhealth.Probe {
	probe, err := healthprobe.NewWorker(definition, target)
	if err != nil {
		return healthprobe.NewUnknown(definition)
	}
	return probe
}

func fixedPath(base, suffix string) string {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(base))
	if err != nil || parsed.Host == "" || parsed.User != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return ""
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	parsed.Path = strings.TrimRight(parsed.Path, "/") + suffix
	return parsed.String()
}
