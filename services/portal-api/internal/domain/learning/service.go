package learning

import (
	"context"
)

type Service struct {
	provider LearningProvider
}

func NewService(provider LearningProvider) *Service {
	return &Service{
		provider: provider,
	}
}

func (s *Service) ListCourses(ctx context.Context, filter CourseFilter) ([]LearningCourse, error) {
	return s.provider.ListCourses(ctx, filter)
}

func (s *Service) GetMe(ctx context.Context, identity FederatedIdentity) (*LearningUser, error) {
	return s.provider.ResolveCurrentUser(ctx, identity)
}

func (s *Service) ListMyCourses(ctx context.Context, identity FederatedIdentity) ([]EnrolledCourse, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	return s.provider.ListUserCourses(ctx, user)
}

func (s *Service) GetMyCourseCompletion(ctx context.Context, identity FederatedIdentity, courseID int) (*CourseCompletion, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	return s.provider.GetCourseCompletion(ctx, user, courseID)
}

func (s *Service) GetMyCourseGrades(ctx context.Context, identity FederatedIdentity, courseID int) ([]GradeItem, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	return s.provider.GetCourseGrades(ctx, user, courseID)
}
