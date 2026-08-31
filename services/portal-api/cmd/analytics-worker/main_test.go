package main

import (
	"context"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/analytics"
)

type fakeWorkerRepository struct {
	rollupError error
	updateError error
	marks       []analytics.WorkerStateKey
}

func (f *fakeWorkerRepository) RollupPageDaily(context.Context, string, time.Time, time.Time) error {
	return f.rollupError
}
func (f *fakeWorkerRepository) RollupSSODaily(context.Context, string, time.Time, time.Time) error {
	return nil
}
func (f *fakeWorkerRepository) RollupSearchDaily(context.Context, string, time.Time, time.Time) error {
	return nil
}
func (f *fakeWorkerRepository) RollupContentDaily(context.Context, string, time.Time, time.Time) error {
	return nil
}
func (f *fakeWorkerRepository) UpdateLearningDaily(context.Context, analytics.LearningDaily) error {
	return f.updateError
}
func (f *fakeWorkerRepository) CleanupOldEvents(context.Context, time.Time) error { return nil }
func (f *fakeWorkerRepository) MarkWorkerSuccess(_ context.Context, key analytics.WorkerStateKey, _ time.Time) error {
	f.marks = append(f.marks, key)
	return nil
}

type fakeLearningSource struct {
	result *analytics.PeriodLearningStats
	err    error
}

func (f fakeLearningSource) GetLearningAnalytics(context.Context, string, string) (*analytics.PeriodLearningStats, error) {
	return f.result, f.err
}

func TestReconcileDayDoesNotAdvanceFailedJobs(t *testing.T) {
	repo := &fakeWorkerRepository{rollupError: errors.New("rollup failed")}
	source := fakeLearningSource{err: errors.New("moodle failed")}
	if reconcileDay(context.Background(), repo, source, time.UTC, time.Now()) {
		t.Fatal("failed reconciliation reported success")
	}
	if len(repo.marks) != 0 {
		t.Fatalf("failed jobs advanced worker state: %v", repo.marks)
	}
}

func TestReconcileDayAdvancesOnlySuccessfulJobs(t *testing.T) {
	repo := &fakeWorkerRepository{}
	source := fakeLearningSource{result: &analytics.PeriodLearningStats{EligibleEnrolments: 10, Completions: 4, CompletionRate: 40}}
	if !reconcileDay(context.Background(), repo, source, time.UTC, time.Now()) {
		t.Fatal("successful reconciliation reported failure")
	}
	if len(repo.marks) != 2 || repo.marks[0] != analytics.WorkerStateRollup || repo.marks[1] != analytics.WorkerStateMoodleSync {
		t.Fatalf("unexpected worker state marks: %v", repo.marks)
	}
}
