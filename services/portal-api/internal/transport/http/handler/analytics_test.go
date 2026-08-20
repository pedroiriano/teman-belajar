package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestValidateMetadataRejectsInvalidAuthResults(t *testing.T) {
	tests := []struct {
		name     string
		metadata string
		wantErr  bool
	}{
		{name: "success", metadata: `{"result":"success"}`},
		{name: "failure", metadata: `{"result":"failure"}`},
		{name: "unknown", metadata: `{"result":"denied"}`, wantErr: true},
		{name: "missing", metadata: `{}`, wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := validateMetadata("auth.login", []byte(test.metadata))
			if (err != nil) != test.wantErr {
				t.Fatalf("validateMetadata() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestValidateMetadataRequiresCanonicalContent(t *testing.T) {
	if _, err := validateMetadata("content.viewed", []byte(`{"content_type":"video","target_id":"a"}`)); err == nil {
		t.Fatal("unknown content type was accepted")
	}
	if _, err := validateMetadata("content.viewed", []byte(`{"content_type":"knowledge","target_id":""}`)); err == nil {
		t.Fatal("empty target id was accepted")
	}
	if _, err := validateMetadata("content.viewed", []byte(`{"content_type":"knowledge","target_id":"article-a"}`)); err != nil {
		t.Fatalf("canonical content metadata rejected: %v", err)
	}
}

func TestPrometheusMetricStates(t *testing.T) {
	tests := []struct {
		name      string
		body      string
		available bool
		reason    string
		value     float64
	}{
		{name: "real zero", body: `{"status":"success","data":{"result":[{"value":[1710000000,"0"]}]}}`, available: true, value: 0},
		{name: "no series", body: `{"status":"success","data":{"result":[]}}`, reason: "no_data"},
		{name: "invalid NaN", body: `{"status":"success","data":{"result":[{"value":[1710000000,"NaN"]}]}}`, reason: "invalid_value"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(test.body))
			}))
			defer server.Close()
			promURL, err := validatePrometheusURL(server.URL)
			if err != nil {
				t.Fatalf("validatePrometheusURL: %v", err)
			}
			value := getPrometheusMetric(context.Background(), server.Client(), promURL, "up")
			if value.Available != test.available || value.Reason != test.reason {
				t.Fatalf("state = %+v", value)
			}
			if test.available && (value.Value == nil || *value.Value != test.value || value.ObservedAt == nil) {
				t.Fatalf("available value = %+v", value)
			}
			if !test.available && value.Value != nil {
				t.Fatalf("unavailable value must be null: %+v", value)
			}
		})
	}
}

func TestSourceStateFreshAndStale(t *testing.T) {
	now := time.Now().UTC()
	freshAt := now.Add(-time.Minute)
	staleAt := now.Add(-time.Hour)
	if got := sourceState(&freshAt, now); got.Status != "fresh" {
		t.Fatalf("fresh status = %s", got.Status)
	}
	if got := sourceState(&staleAt, now); got.Status != "stale" {
		t.Fatalf("stale status = %s", got.Status)
	}
}
