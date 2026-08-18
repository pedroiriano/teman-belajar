package searchindex

import (
	"context"
	"fmt"
	"time"

	"teman-belajar-api/internal/domain/learning"
	domainsearch "teman-belajar-api/internal/domain/search"
)

type courseProvider interface {
	ListCourses(ctx context.Context, filter learning.CourseFilter) ([]learning.LearningCourse, error)
}

type CourseSource struct {
	provider courseProvider
}

func NewCourseSource(provider courseProvider) *CourseSource { return &CourseSource{provider: provider} }
func (*CourseSource) Type() string                          { return string(domainsearch.ContentTypeCourse) }

func (s *CourseSource) Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error) {
	courses, err := s.provider.ListCourses(ctx, learning.CourseFilter{})
	if err != nil {
		return nil, fmt.Errorf("fetch visible Moodle courses: %w", err)
	}
	now := time.Now().UTC()
	documents := make([]domainsearch.IndexDocument, 0, len(courses))
	for _, course := range courses {
		if course.ID == 1 || !course.Visible {
			continue
		}
		id := fmt.Sprintf("%d", course.ID)
		documents = append(documents, domainsearch.IndexDocument{
			DocumentID: "course_" + id, SourceType: s.Type(), SourceID: id,
			Title: plainText(course.FullName), Summary: plainText(course.Summary), BodyText: plainText(course.Summary),
			CategoryName: plainText(course.Category), Tags: []string{}, URL: "/my-learning", UpdatedAt: now,
		})
	}
	return documents, nil
}
