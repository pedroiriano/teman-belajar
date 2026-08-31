package training

import (
	"context"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/learning"
)

type fakeRepository struct {
	item *Program
	last *Program
}

func (r *fakeRepository) Create(_ context.Context, item *Program, _ string) error {
	r.item, r.last = item, item
	return nil
}
func (r *fakeRepository) Update(_ context.Context, item *Program, _ int64, _ string) error {
	r.item, r.last = item, item
	return nil
}
func (r *fakeRepository) GetByID(_ context.Context, _ string) (*Program, error) {
	if r.item == nil {
		return nil, ErrNotFound
	}
	return r.item, nil
}
func (r *fakeRepository) GetPublishedBySlug(_ context.Context, slug string) (*Program, error) {
	if r.item == nil || r.item.Slug != slug || r.item.Status != StatusPublished {
		return nil, ErrNotFound
	}
	return r.item, nil
}
func (r *fakeRepository) ListPublic(_ context.Context, _ ListFilter) ([]Program, int, error) {
	if r.item == nil || r.item.Status != StatusPublished {
		return nil, 0, nil
	}
	return []Program{*r.item}, 1, nil
}
func (r *fakeRepository) ListAdmin(_ context.Context, _ ListFilter) ([]Program, int, error) {
	if r.item == nil {
		return nil, 0, nil
	}
	return []Program{*r.item}, 1, nil
}

type fakeLearning struct {
	courses     []learning.LearningCourse
	enrolled    []learning.EnrolledCourse
	listErr     error
	userErr     error
	enrolledErr error
}

func (f *fakeLearning) ListCourses(context.Context, learning.CourseFilter) ([]learning.LearningCourse, error) {
	return f.courses, f.listErr
}
func (f *fakeLearning) ResolveCurrentUser(context.Context, learning.FederatedIdentity) (*learning.LearningUser, error) {
	if f.userErr != nil {
		return nil, f.userErr
	}
	return &learning.LearningUser{ID: 7}, nil
}
func (f *fakeLearning) ListUserCourses(context.Context, *learning.LearningUser) ([]learning.EnrolledCourse, error) {
	return f.enrolled, f.enrolledErr
}

func publishedProgram() *Program {
	now := time.Date(2026, 8, 27, 0, 0, 0, 0, time.UTC)
	return &Program{ID: "13000000-0000-4000-8000-000000000001", Slug: "kepemimpinan-dasar", Title: "Kepemimpinan Dasar", Summary: "Program terstruktur untuk pemimpin baru.", Description: "Pelajari fondasi kepemimpinan melalui rangkaian course formal yang terarah.", Status: StatusPublished, Version: 1, PublishedAt: &now, Courses: []CourseRef{{MoodleCourseID: 10, SortOrder: 10, Required: true}, {MoodleCourseID: 20, SortOrder: 20, Required: true}}}
}

func TestGetPublicKeepsProgramAvailableWhenMoodleDegrades(t *testing.T) {
	repo := &fakeRepository{item: publishedProgram()}
	svc := NewService(repo, &fakeLearning{listErr: learning.ErrMoodleTimeout}, nil, "https://moodle.example.test")
	detail, err := svc.GetPublic(context.Background(), "kepemimpinan-dasar")
	if err != nil {
		t.Fatal(err)
	}
	if detail.Provenance.State != "degraded" || len(detail.Courses) != 2 || detail.Courses[0].Availability != "unavailable" {
		t.Fatalf("expected safe partial degradation, got %#v", detail)
	}
}

func TestProgressUsesOnlyMoodleConfirmedEnrollment(t *testing.T) {
	progressValue := 40.0
	repo := &fakeRepository{item: publishedProgram()}
	provider := &fakeLearning{
		courses:  []learning.LearningCourse{{ID: 10, FullName: "Dasar", Visible: true}, {ID: 20, FullName: "Praktik", Visible: true}},
		enrolled: []learning.EnrolledCourse{{ID: 10, Progress: &progressValue}},
	}
	svc := NewService(repo, provider, nil, "https://moodle.example.test")
	result, err := svc.GetProgress(context.Background(), "kepemimpinan-dasar", learning.FederatedIdentity{Subject: "subject-1"})
	if err != nil {
		t.Fatal(err)
	}
	if result.Eligibility.Status != "partial" || result.EnrolledCourses != 1 || result.CompletedCourses != 0 || result.ProgressPercent == nil || *result.ProgressPercent != 20 {
		t.Fatalf("unexpected aggregate: %#v", result)
	}
	if result.CTA.Kind != "start" || result.CTA.URL != "https://moodle.example.test/course/view.php?id=10" {
		t.Fatalf("CTA must use confirmed Moodle enrolment, got %#v", result.CTA)
	}
	if result.Courses[1].LearnerState != "not_enrolled" || result.Courses[1].StartURL != "" {
		t.Fatalf("non-enrolled course must not receive a start CTA: %#v", result.Courses[1])
	}
}

func TestProgressDoesNotPromiseAccessWhenUserIsNotMapped(t *testing.T) {
	repo := &fakeRepository{item: publishedProgram()}
	provider := &fakeLearning{courses: []learning.LearningCourse{{ID: 10, Visible: true}, {ID: 20, Visible: true}}, userErr: learning.ErrLearningUserNotMapped}
	svc := NewService(repo, provider, nil, "https://moodle.example.test")
	result, err := svc.GetProgress(context.Background(), "kepemimpinan-dasar", learning.FederatedIdentity{Subject: "subject-1"})
	if err != nil {
		t.Fatal(err)
	}
	if result.Eligibility.Status != "unverified" || result.CTA.Kind != "check_access" || result.Provenance.State != "degraded" {
		t.Fatalf("unmapped user must receive unverified CTA, got %#v", result)
	}
}

func TestCreateRequiresWriterAndValidVisibleCourses(t *testing.T) {
	input := ProgramInput{Slug: "program-aman", Title: "Program Aman", Summary: "Ringkasan program yang cukup panjang.", Description: "Deskripsi program yang cukup panjang untuk validasi.", Courses: []CourseInput{{MoodleCourseID: 10, Required: true}}}
	repo := &fakeRepository{}
	svc := NewService(repo, &fakeLearning{courses: []learning.LearningCourse{{ID: 10, Visible: true}}}, nil, "https://moodle.example.test")
	if _, err := svc.Create(context.Background(), input, []string{"Reviewer"}, "actor"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("reviewer mutation should be denied, got %v", err)
	}
	item, err := svc.Create(context.Background(), input, []string{"Content Editor"}, "actor")
	if err != nil {
		t.Fatal(err)
	}
	if item.Status != StatusDraft || item.Courses[0].MoodleCourseID != 10 {
		t.Fatalf("unexpected item: %#v", item)
	}
}

func TestCreateRejectsUnknownMoodleCourse(t *testing.T) {
	input := ProgramInput{Slug: "program-aman", Title: "Program Aman", Summary: "Ringkasan program yang cukup panjang.", Description: "Deskripsi program yang cukup panjang untuk validasi.", Courses: []CourseInput{{MoodleCourseID: 99, Required: true}}}
	svc := NewService(&fakeRepository{}, &fakeLearning{courses: []learning.LearningCourse{{ID: 10, Visible: true}}}, nil, "https://moodle.example.test")
	if _, err := svc.Create(context.Background(), input, []string{"Content Editor"}, "actor"); !errors.Is(err, ErrValidation) {
		t.Fatalf("unknown course should be rejected, got %v", err)
	}
}

func TestDisposableProgramFullWorkflowAndLearnerProjection(t *testing.T) {
	progress := 100.0
	repo := &fakeRepository{}
	provider := &fakeLearning{
		courses:  []learning.LearningCourse{{ID: 20, ShortName: "TASK013-VISIBLE", FullName: "TASK-013 Visible Course", Visible: true}},
		enrolled: []learning.EnrolledCourse{{ID: 20, Progress: &progress, Completed: true}},
	}
	svc := NewService(repo, provider, nil, "http://localhost:8082")
	input := ProgramInput{
		Slug:            "task-013-disposable",
		Title:           "Program Pelatihan TASK-013",
		Summary:         "Program disposable untuk regression test TASK-013.",
		Description:     "Program hanya disimpan oleh repository in-memory selama pengujian berlangsung.",
		Audience:        "Learner lokal non-production",
		EligibilityText: "Enrolment harus dikonfirmasi Moodle.",
		Courses:         []CourseInput{{MoodleCourseID: 20, Required: true}},
	}

	item, err := svc.Create(context.Background(), input, []string{"Content Editor"}, "local-qa")
	if err != nil || item.Status != StatusDraft {
		t.Fatalf("draft failed: item=%#v err=%v", item, err)
	}
	for _, transition := range []struct {
		status Status
		roles  []string
	}{{StatusInReview, []string{"Content Editor"}}, {StatusApproved, []string{"Reviewer"}}, {StatusPublished, []string{"Reviewer"}}} {
		item, err = svc.Transition(context.Background(), item.ID, transition.status, transition.roles, "local-qa")
		if err != nil || item.Status != transition.status {
			t.Fatalf("transition %s failed: item=%#v err=%v", transition.status, item, err)
		}
	}

	list, err := svc.ListPublic(context.Background(), ListFilter{Page: 1, PageSize: 12})
	if err != nil || list.Pagination.Total != 1 || len(list.Data) != 1 {
		t.Fatalf("public catalogue failed: list=%#v err=%v", list, err)
	}
	detail, err := svc.GetPublic(context.Background(), item.Slug)
	if err != nil || detail.Provenance.State != "fresh" || detail.Courses[0].Availability != "available" {
		t.Fatalf("public detail failed: detail=%#v err=%v", detail, err)
	}
	learner, err := svc.GetProgress(context.Background(), item.Slug, learning.FederatedIdentity{Subject: "sanitized-subject"})
	if err != nil || learner.ProgressPercent == nil || *learner.ProgressPercent != 100 || learner.CompletedCourses != 1 || learner.CTA.Kind != "review" || learner.CTA.URL != "http://localhost:8082/course/view.php?id=20" {
		t.Fatalf("learner projection failed: learner=%#v err=%v", learner, err)
	}
	if _, err := svc.Create(context.Background(), input, []string{"Reviewer"}, "local-qa"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("reviewer create must fail closed: %v", err)
	}
}
