package integrationhealth

import (
	"context"
	"time"
)

type Status string

const (
	StatusHealthy  Status = "healthy"
	StatusDegraded Status = "degraded"
	StatusDown     Status = "down"
	StatusUnknown  Status = "unknown"
)

type Definition struct {
	Key   string
	Name  string
	Group string
}

type Observation struct {
	Status      Status
	LastSuccess *time.Time
	ErrorClass  string
}

type Probe interface {
	Definition() Definition
	Check(context.Context) Observation
}

type Dependency struct {
	Key              string     `json:"key"`
	Name             string     `json:"name"`
	Group            string     `json:"group"`
	Status           Status     `json:"status"`
	CheckedAt        time.Time  `json:"checked_at"`
	LastSuccessAt    *time.Time `json:"last_success_at,omitempty"`
	FreshnessSeconds *int64     `json:"freshness_seconds,omitempty"`
	ErrorClass       string     `json:"error_class,omitempty"`
	CorrelationPath  string     `json:"correlation_path,omitempty"`
}

type Snapshot struct {
	Status        Status       `json:"status"`
	CheckedAt     time.Time    `json:"checked_at"`
	CorrelationID string       `json:"correlation_id"`
	Dependencies  []Dependency `json:"dependencies"`
}
