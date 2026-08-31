package integrationhealth

import (
	"context"
	"sync"
	"time"
)

const correlationPath = "/dashboard/statistics#api"

var allowedErrorClasses = map[string]struct{}{
	"circuit_open":        {},
	"connection_failed":   {},
	"never_reported":      {},
	"probe_misconfigured": {},
	"stale":               {},
	"timeout":             {},
	"unhealthy_response":  {},
	"worker_failed":       {},
}

type circuitState struct {
	failures    int
	lastSuccess *time.Time
	openUntil   time.Time
}

type Service struct {
	probes           []Probe
	timeout          time.Duration
	failureThreshold int
	coolDown         time.Duration
	now              func() time.Time
	mu               sync.Mutex
	circuits         map[string]circuitState
}

func NewService(probes []Probe, timeout time.Duration) *Service {
	if timeout <= 0 {
		timeout = 2 * time.Second
	}
	return &Service{
		probes: probes, timeout: timeout, failureThreshold: 3,
		coolDown: 30 * time.Second, now: func() time.Time { return time.Now().UTC() },
		circuits: make(map[string]circuitState, len(probes)),
	}
}

func (s *Service) Snapshot(ctx context.Context, correlationID string) Snapshot {
	checkedAt := s.now()
	items := make([]Dependency, len(s.probes))
	var wg sync.WaitGroup
	for index, probe := range s.probes {
		wg.Add(1)
		go func() {
			defer wg.Done()
			items[index] = s.check(ctx, probe, checkedAt)
		}()
	}
	wg.Wait()
	return Snapshot{Status: aggregateStatus(items), CheckedAt: checkedAt, CorrelationID: correlationID, Dependencies: items}
}

func (s *Service) check(parent context.Context, probe Probe, checkedAt time.Time) Dependency {
	definition := probe.Definition()
	dependency := Dependency{Key: definition.Key, Name: definition.Name, Group: definition.Group, Status: StatusUnknown, CheckedAt: checkedAt}

	s.mu.Lock()
	state := s.circuits[definition.Key]
	if checkedAt.Before(state.openUntil) {
		s.mu.Unlock()
		dependency.LastSuccessAt = state.lastSuccess
		dependency.ErrorClass = "circuit_open"
		dependency.CorrelationPath = correlationPath
		dependency.Status = StatusDown
		if state.lastSuccess != nil {
			dependency.Status = StatusDegraded
		}
		setFreshness(&dependency, checkedAt)
		return dependency
	}
	s.mu.Unlock()

	ctx, cancel := context.WithTimeout(parent, s.timeout)
	defer cancel()
	result := make(chan Observation, 1)
	go func() { result <- probe.Check(ctx) }()

	var observation Observation
	select {
	case observation = <-result:
		if ctx.Err() != nil {
			observation = Observation{Status: StatusDown, ErrorClass: "timeout"}
		}
	case <-ctx.Done():
		observation = Observation{Status: StatusDown, ErrorClass: "timeout"}
	}
	if !validStatus(observation.Status) {
		observation.Status = StatusUnknown
		observation.ErrorClass = "unhealthy_response"
	}
	observation.ErrorClass = sanitizeErrorClass(observation.ErrorClass)

	s.mu.Lock()
	state = s.circuits[definition.Key]
	if observation.Status == StatusHealthy {
		state.failures = 0
		state.openUntil = time.Time{}
		if observation.LastSuccess == nil {
			success := checkedAt
			observation.LastSuccess = &success
		}
		state.lastSuccess = observation.LastSuccess
	} else if observation.Status == StatusDown {
		state.failures++
		if observation.LastSuccess == nil {
			observation.LastSuccess = state.lastSuccess
		}
		if observation.LastSuccess != nil {
			observation.Status = StatusDegraded
		}
		if state.failures >= s.failureThreshold {
			state.openUntil = checkedAt.Add(s.coolDown)
		}
	}
	s.circuits[definition.Key] = state
	s.mu.Unlock()

	dependency.Status = observation.Status
	dependency.LastSuccessAt = observation.LastSuccess
	dependency.ErrorClass = observation.ErrorClass
	if dependency.Status != StatusHealthy {
		dependency.CorrelationPath = correlationPath
	}
	setFreshness(&dependency, checkedAt)
	return dependency
}

func setFreshness(dependency *Dependency, checkedAt time.Time) {
	if dependency.LastSuccessAt == nil {
		return
	}
	seconds := int64(checkedAt.Sub(dependency.LastSuccessAt.UTC()).Seconds())
	if seconds < 0 {
		seconds = 0
	}
	dependency.FreshnessSeconds = &seconds
}

func validStatus(status Status) bool {
	return status == StatusHealthy || status == StatusDegraded || status == StatusDown || status == StatusUnknown
}

func sanitizeErrorClass(value string) string {
	if value == "" {
		return ""
	}
	if _, ok := allowedErrorClasses[value]; ok {
		return value
	}
	return "unhealthy_response"
}

func aggregateStatus(items []Dependency) Status {
	if len(items) == 0 {
		return StatusUnknown
	}
	healthy, down, degraded := 0, 0, 0
	for _, item := range items {
		switch item.Status {
		case StatusHealthy:
			healthy++
		case StatusDown:
			down++
		case StatusDegraded:
			degraded++
		}
	}
	if healthy == len(items) {
		return StatusHealthy
	}
	if healthy == 0 && degraded == 0 && down > 0 {
		return StatusDown
	}
	return StatusDegraded
}
