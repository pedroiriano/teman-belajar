package integrationhealth

import (
	"context"
	"strings"
	"testing"
	"time"
)

type probeStub struct {
	definition Definition
	check      func(context.Context) Observation
}

func (p probeStub) Definition() Definition                { return p.definition }
func (p probeStub) Check(ctx context.Context) Observation { return p.check(ctx) }

func TestSnapshotAggregatesWithoutLeakingErrors(t *testing.T) {
	now := time.Date(2026, 8, 31, 3, 0, 0, 0, time.UTC)
	last := now.Add(-time.Minute)
	service := NewService([]Probe{
		probeStub{Definition{Key: "api", Name: "Portal API", Group: "platform"}, func(context.Context) Observation { return Observation{Status: StatusHealthy} }},
		probeStub{Definition{Key: "moodle", Name: "Moodle", Group: "learning"}, func(context.Context) Observation {
			return Observation{Status: StatusDown, LastSuccess: &last, ErrorClass: "https://secret.example/token?client_secret=leak"}
		}},
	}, 50*time.Millisecond)
	service.now = func() time.Time { return now }

	snapshot := service.Snapshot(context.Background(), "safe-correlation")
	if snapshot.Status != StatusDegraded || len(snapshot.Dependencies) != 2 {
		t.Fatalf("snapshot=%#v", snapshot)
	}
	failed := snapshot.Dependencies[1]
	if failed.Status != StatusDegraded || failed.ErrorClass != "unhealthy_response" || failed.CorrelationPath != correlationPath {
		t.Fatalf("failed dependency=%#v", failed)
	}
	if failed.FreshnessSeconds == nil || *failed.FreshnessSeconds != 60 {
		t.Fatalf("freshness=%v", failed.FreshnessSeconds)
	}
	if strings.Contains(failed.ErrorClass, "secret") {
		t.Fatal("raw dependency error leaked")
	}
}

func TestSnapshotTimeoutAndCircuitOpen(t *testing.T) {
	now := time.Date(2026, 8, 31, 3, 0, 0, 0, time.UTC)
	service := NewService([]Probe{probeStub{Definition{Key: "slow", Name: "Slow", Group: "test"}, func(ctx context.Context) Observation {
		<-ctx.Done()
		return Observation{Status: StatusDown, ErrorClass: "timeout"}
	}}}, 5*time.Millisecond)
	service.now = func() time.Time { return now }
	for index := 0; index < 3; index++ {
		if got := service.Snapshot(context.Background(), "id").Dependencies[0]; got.Status != StatusDown || got.ErrorClass != "timeout" {
			t.Fatalf("attempt %d=%#v", index, got)
		}
	}
	if got := service.Snapshot(context.Background(), "id").Dependencies[0]; got.ErrorClass != "circuit_open" {
		t.Fatalf("circuit=%#v", got)
	}
}

func TestSnapshotUnknownProbeRemainsNonHealthy(t *testing.T) {
	service := NewService([]Probe{probeStub{Definition{Key: "worker", Name: "Worker", Group: "worker"}, func(context.Context) Observation {
		return Observation{Status: StatusUnknown, ErrorClass: "never_reported"}
	}}}, time.Second)
	snapshot := service.Snapshot(context.Background(), "id")
	if snapshot.Status != StatusDegraded || snapshot.Dependencies[0].Status != StatusUnknown {
		t.Fatalf("snapshot=%#v", snapshot)
	}
}
