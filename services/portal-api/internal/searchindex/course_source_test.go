package searchindex

import (
	"context"
	"testing"

	"teman-belajar-api/internal/domain/learning"
)

type courseProviderStub struct {
	courses []learning.LearningCourse
	err     error
}

func (p courseProviderStub) ListCourses(context.Context, learning.CourseFilter) ([]learning.LearningCourse, error) {
	return p.courses, p.err
}

func TestCourseSourceExcludesHiddenAndSiteCourses(t *testing.T) {
	source := NewCourseSource(courseProviderStub{courses: []learning.LearningCourse{
		{ID: 1, FullName: "Site", Visible: true},
		{ID: 8, FullName: "SEARCH_VISIBLE_COURSE_TOKEN", Visible: true},
		{ID: 9, FullName: "SEARCH_HIDDEN_COURSE_SECRET_TOKEN", Visible: false},
	}})
	documents, err := source.Fetch(context.Background())
	if err != nil {
		t.Fatalf("Fetch returned error: %v", err)
	}
	if len(documents) != 1 || documents[0].DocumentID != "course_8" {
		t.Fatalf("hidden/site course leaked: %#v", documents)
	}
}

func TestPlainTextRemovesMarkupWithoutProducingExecutableHTML(t *testing.T) {
	got := plainText(`<script>alert(1)</script><strong>Materi</strong>`)
	if got != "alert(1) Materi" {
		t.Fatalf("unexpected plain text: %q", got)
	}
}
