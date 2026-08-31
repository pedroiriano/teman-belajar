package healthprobe

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/integrationhealth"
)

func TestHTTPProbeUsesOnlyFixedTargetAndSanitizesFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.RawQuery != "" {
			t.Fatal("probe forwarded unexpected query")
		}
		http.Error(w, "token=secret-value", http.StatusInternalServerError)
	}))
	defer server.Close()
	probe, err := NewHTTP(integrationhealth.Definition{Key: "fixed", Name: "Fixed", Group: "test"}, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	observation := probe.Check(context.Background())
	if observation.Status != integrationhealth.StatusDown || observation.ErrorClass != "unhealthy_response" {
		t.Fatalf("observation=%#v", observation)
	}
}

func TestHTTPProbeRejectsNonHTTPAndWorkerRejectsMalformedState(t *testing.T) {
	if _, err := NewHTTP(integrationhealth.Definition{}, "file:///etc/passwd"); err == nil {
		t.Fatal("non-HTTP target must be rejected")
	}
	if _, err := NewHTTP(integrationhealth.Definition{}, "http://user:secret@service/health"); err == nil {
		t.Fatal("target credentials must be rejected")
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"status":"healthy","secret":"must-not-matter"}`))
	}))
	defer server.Close()
	probe, err := NewWorker(integrationhealth.Definition{Key: "worker"}, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if got := probe.Check(context.Background()); got.Status != integrationhealth.StatusHealthy {
		t.Fatalf("worker=%#v", got)
	}
}

func TestHTTPProbeDoesNotFollowRedirects(t *testing.T) {
	targetReached := false
	target := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { targetReached = true }))
	defer target.Close()
	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		http.Redirect(w, request, target.URL, http.StatusFound)
	}))
	defer redirect.Close()
	probe, err := NewHTTP(integrationhealth.Definition{Key: "fixed"}, redirect.URL)
	if err != nil {
		t.Fatal(err)
	}
	observation := probe.Check(context.Background())
	if targetReached || observation.Status != integrationhealth.StatusHealthy || observation.ErrorClass != "" {
		t.Fatalf("redirect followed=%v observation=%#v", targetReached, observation)
	}
}
