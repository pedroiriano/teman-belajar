package enrollment

import (
	"context"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/training"
)

type mockRepo struct {
	items map[string]*Enrollment
}

func newMockRepo() *mockRepo {
	return &mockRepo{items: make(map[string]*Enrollment)}
}

func (m *mockRepo) Create(ctx context.Context, e *Enrollment) error {
	m.items[e.ID] = e
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*Enrollment, error) {
	e, ok := m.items[id]
	if !ok {
		return nil, ErrNotFound
	}
	return e, nil
}

func (m *mockRepo) GetByUserAndProgram(ctx context.Context, userSubject, programSlug string) (*Enrollment, error) {
	for _, e := range m.items {
		if e.UserSubject == userSubject && e.ProgramSlug == programSlug {
			return e, nil
		}
	}
	return nil, ErrNotFound
}

func (m *mockRepo) UpdateStatus(ctx context.Context, id string, status Status, confirmedBy string, rejectionReason string) (*Enrollment, error) {
	e, ok := m.items[id]
	if !ok {
		return nil, ErrNotFound
	}
	e.Status = status
	if status == StatusConfirmed {
		now := time.Now().UTC()
		e.ConfirmedAt = &now
		e.ConfirmedBy = confirmedBy
	}
	if status == StatusRejected {
		e.RejectionReason = rejectionReason
	}
	return e, nil
}

func (m *mockRepo) List(ctx context.Context, filter Filter) ([]Enrollment, int, Metrics, error) {
	var list []Enrollment
	metrics := Metrics{}
	for _, e := range m.items {
		metrics.TotalApplications++
		switch e.Status {
		case StatusPending:
			metrics.PendingCount++
		case StatusConfirmed:
			metrics.ConfirmedCount++
		case StatusRejected:
			metrics.RejectedCount++
		}
		list = append(list, *e)
	}
	return list, len(list), metrics, nil
}

type mockTrainingRepo struct {
	program *training.Program
}

func (m *mockTrainingRepo) Create(context.Context, *training.Program, string) error { return nil }
func (m *mockTrainingRepo) Update(context.Context, *training.Program, int64, string) error { return nil }
func (m *mockTrainingRepo) GetByID(context.Context, string) (*training.Program, error) {
	if m.program != nil {
		return m.program, nil
	}
	return nil, training.ErrNotFound
}
func (m *mockTrainingRepo) GetPublishedBySlug(context.Context, string) (*training.Program, error) {
	if m.program != nil {
		return m.program, nil
	}
	return nil, training.ErrNotFound
}
func (m *mockTrainingRepo) ListPublic(context.Context, training.ListFilter) ([]training.Program, int, error) {
	return nil, 0, nil
}
func (m *mockTrainingRepo) ListAdmin(context.Context, training.ListFilter) ([]training.Program, int, error) {
	return nil, 0, nil
}

type mockMoodleClient struct {
	enrolledCourses []int
}

func (m *mockMoodleClient) ResolveCurrentUser(ctx context.Context, identity learning.FederatedIdentity) (*learning.LearningUser, error) {
	return &learning.LearningUser{ID: 10, Username: identity.Username, Email: identity.Email}, nil
}

func (m *mockMoodleClient) EnrolUser(ctx context.Context, userID int, courseID int, roleID int) error {
	m.enrolledCourses = append(m.enrolledCourses, courseID)
	return nil
}

func TestApply_Success(t *testing.T) {
	cohortID := "cohort-1"
	prog := &training.Program{
		ID:    "prog-1",
		Slug:  "mtcna",
		Title: "MTCNA Training",
		Cohorts: []training.Cohort{
			{ID: cohortID, Label: "Gelombang 1"},
		},
	}

	repo := newMockRepo()
	trainingRepo := &mockTrainingRepo{program: prog}
	moodleMock := &mockMoodleClient{}
	svc := NewService(repo, trainingRepo, moodleMock)

	in := ApplyInput{CohortID: cohortID, Notes: "Semangat belajar"}
	enr, err := svc.Apply(context.Background(), "user-sub-1", "Budi", "budi@example.com", "mtcna", in)
	if err != nil {
		t.Fatalf("Apply failed: %v", err)
	}

	if enr.Status != StatusPending {
		t.Errorf("expected status pending, got %s", enr.Status)
	}
	if enr.CohortLabel != "Gelombang 1" {
		t.Errorf("expected cohort label 'Gelombang 1', got %s", enr.CohortLabel)
	}

	// Re-applying should fail with ErrAlreadyApplied
	_, err = svc.Apply(context.Background(), "user-sub-1", "Budi", "budi@example.com", "mtcna", in)
	if !errors.Is(err, ErrAlreadyApplied) {
		t.Errorf("expected ErrAlreadyApplied, got %v", err)
	}
}

func TestConfirm_AutoEnrolsMoodle(t *testing.T) {
	cohortID := "cohort-1"
	prog := &training.Program{
		ID:    "prog-1",
		Slug:  "mtcna",
		Title: "MTCNA Training",
		Cohorts: []training.Cohort{
			{ID: cohortID, Label: "Gelombang 1"},
		},
		Courses: []training.CourseRef{
			{MoodleCourseID: 29, Required: true},
			{MoodleCourseID: 30, Required: false},
		},
	}

	repo := newMockRepo()
	trainingRepo := &mockTrainingRepo{program: prog}
	moodleMock := &mockMoodleClient{}
	svc := NewService(repo, trainingRepo, moodleMock)

	in := ApplyInput{CohortID: cohortID}
	enr, err := svc.Apply(context.Background(), "user-sub-1", "Budi", "budi@example.com", "mtcna", in)
	if err != nil {
		t.Fatalf("Apply failed: %v", err)
	}

	confirmed, err := svc.Confirm(context.Background(), enr.ID, "admin-user")
	if err != nil {
		t.Fatalf("Confirm failed: %v", err)
	}

	if confirmed.Status != StatusConfirmed {
		t.Errorf("expected status confirmed, got %s", confirmed.Status)
	}
	if confirmed.ConfirmedBy != "admin-user" {
		t.Errorf("expected confirmed_by 'admin-user', got %s", confirmed.ConfirmedBy)
	}

	if len(moodleMock.enrolledCourses) != 2 {
		t.Fatalf("expected 2 enrolled courses in moodle, got %d", len(moodleMock.enrolledCourses))
	}
	if moodleMock.enrolledCourses[0] != 29 || moodleMock.enrolledCourses[1] != 30 {
		t.Errorf("unexpected courses enrolled: %v", moodleMock.enrolledCourses)
	}
}
