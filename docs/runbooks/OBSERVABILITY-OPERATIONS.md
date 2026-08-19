# Observability Operations

## Prometheus
Prometheus scrapes metrics from the API and infrastructure.
- Config: `infrastructure/observability/prometheus.yml`
- Internal UI: `http://localhost:9090` (Admin only)

## Grafana
Grafana visualizes Prometheus data.
- Dashboards: `infrastructure/observability/grafana/dashboards`
- Admin credentials: See ignored `.env`

## Loki & Tempo
Loki handles logs, Tempo handles distributed traces.
- Queries can be done in Grafana via the Explore tab.
- Trace IDs in logs correlate directly to Tempo traces.
