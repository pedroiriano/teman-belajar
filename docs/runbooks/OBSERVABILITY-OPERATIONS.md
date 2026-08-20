# Observability Operations

## Prometheus
Prometheus scrapes metrics from the API and infrastructure.
- Config: `infrastructure/observability/prometheus.yml`
- Internal UI: `http://localhost:9090` (Admin only)

The product Statistics API distinguishes:

- a returned sample whose numeric value is `0` (`available=true`);
- a successful query with no series (`available=false`, `reason=no_data`);
- an unavailable/failed query (`available=false`, `reason=unavailable`);
- NaN or infinity (`available=false`, `reason=invalid_value`).

`observed_at` comes from the Prometheus sample timestamp and remains null when
there is no valid sample. Never replace missing evidence with `time.Now()`.

## Grafana
Grafana visualizes Prometheus data.
- Dashboards: `infrastructure/observability/grafana/dashboards`
- Admin credentials: See ignored `.env`

## Loki & Tempo
Loki handles logs, Tempo handles distributed traces.
- Queries can be done in Grafana via the Explore tab.
- Trace IDs in logs correlate directly to Tempo traces.

## Keycloak management client

`teman-belajar-admin-management` is owned by
`infrastructure/keycloak/reconcile-sso-clients.sh`, not by the realm JSON. The
script creates or updates the confidential client, reconciles the configured
secret, and verifies only `manage-users`, `query-users`, and `view-users` on its
service account. It must reject `realm-admin` and `manage-realm`.

For local secret rotation, change only the ignored `.env`, run the governed
`sso` action twice, and verify a client-credentials token without printing the
old/new secret or token. Staging/production rotation requires the deployment
secret store and human-approved rollout; local evidence does not confirm global
production logout or credential rotation.
