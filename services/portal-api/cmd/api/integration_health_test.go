package main

import (
	"context"
	"testing"
)

func TestFixedPathRejectsUnsafeTargetsAndDropsQuery(t *testing.T) {
	if got := fixedPath("file:///etc/passwd", "/health"); got != "" {
		t.Fatalf("unsafe scheme accepted: %q", got)
	}
	if got := fixedPath("http://user:secret@service/base", "/health"); got != "" {
		t.Fatalf("credential-bearing target accepted: %q", got)
	}
	if got := fixedPath("http://service:8080/base?token=secret#fragment", "/health"); got != "http://service:8080/base/health" {
		t.Fatalf("fixed path=%q", got)
	}
}

func TestIntegrationHealthServiceHasOnlyCanonicalDependencies(t *testing.T) {
	service := buildIntegrationHealthService(nil, integrationHealthConfig{})
	snapshot := service.Snapshot(context.Background(), "test")
	want := []string{
		"portal-api", "portal-database", "moodle", "keycloak", "meilisearch", "redis", "minio",
		"search-worker", "analytics-worker", "prometheus", "grafana", "otel-collector", "loki", "tempo",
	}
	if len(snapshot.Dependencies) != len(want) {
		t.Fatalf("dependency count=%d want=%d", len(snapshot.Dependencies), len(want))
	}
	for index, key := range want {
		if snapshot.Dependencies[index].Key != key {
			t.Fatalf("dependency[%d]=%q want=%q", index, snapshot.Dependencies[index].Key, key)
		}
	}
}
