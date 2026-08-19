# ADR-016: Observability & Product Analytics Architecture

## Status
Accepted

## Context
Teman Belajar requires an observability stack to answer operational questions ("Is the system healthy and fast?") and a product analytics stack to answer business questions ("How is the platform being used?"). 
The existing architecture (ADR-004) dictates an "observability-by-default" approach using OpenTelemetry, Prometheus, and centralized logs, as well as an analytics module running within the Portal API. We need to concretely select the backends and design the topology.

## Decision
1. **Metrics Backend**: We will use Prometheus for storing OpenTelemetry metrics. Grafana will be used for visualization. 
2. **Tracing & Logging Backends**: To maintain a cohesive open-source stack compatible with Grafana, we will use Grafana Tempo for traces and Grafana Loki for centralized logs.
3. **Telemetry Pipeline**: An OpenTelemetry Collector will run as a central gateway. All applications (Go API) will push metrics, traces, and structured logs to the OTel Collector via OTLP. The Collector will batch and export them to Prometheus, Tempo, and Loki.
4. **Product Analytics Store**: We will use the canonical Portal PostgreSQL database within a logical `analytics` schema to store business analytics events.
5. **Product Analytics Ingestion**: The Go Portal API will expose a bounded ingestion endpoint for client-side events. We will not use commercial SaaS APM, Google Analytics, or third-party trackers.
6. **Moodle Aggregation**: Moodle learning data will be retrieved via aggregate Web Services hosted in `local_temanbelajar`. The Portal API will never query Moodle's database directly.
7. **Cuba Admin UI**: Business statistics will be presented natively in the Cuba Admin application via a `/statistics` route. Grafana will strictly remain an infrastructure/technical dashboard and will not be embedded in the product UI.

## Consequences
- Operations gains deep technical insight via Grafana without PII leakage.
- Product owners receive curated business dashboards natively.
- Running Loki and Tempo locally increases Docker memory/CPU footprint, so retention and sampling must be minimal in development.
- Portal API takes on the responsibility of ingesting and rolling up analytical events via an `analytics-worker`.
