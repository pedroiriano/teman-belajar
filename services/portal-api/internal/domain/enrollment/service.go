package enrollment

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/training"
)

type MoodleClient interface {
	ResolveCurrentUser(ctx context.Context, identity learning.FederatedIdentity) (*learning.LearningUser, error)
	EnrolUser(ctx context.Context, userID int, courseID int, roleID int) error
}

type Service struct {
	repo         Repository
	trainingRepo training.Repository
	moodleClient MoodleClient
}

func NewService(repo Repository, trainingRepo training.Repository, moodleClient MoodleClient) *Service {
	return &Service{
		repo:         repo,
		trainingRepo: trainingRepo,
		moodleClient: moodleClient,
	}
}

func (s *Service) Apply(ctx context.Context, userSubject, userName, userEmail, programSlug string, in ApplyInput) (*Enrollment, error) {
	if err := in.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrValidation, err)
	}

	prog, err := s.trainingRepo.GetPublishedBySlug(ctx, programSlug)
	if err != nil {
		if errors.Is(err, training.ErrNotFound) {
			return nil, ErrProgramNotFound
		}
		return nil, err
	}

	var matchedCohort *training.Cohort
	for _, c := range prog.Cohorts {
		if c.ID == in.CohortID {
			cohortCopy := c
			matchedCohort = &cohortCopy
			break
		}
	}
	if matchedCohort == nil {
		return nil, ErrCohortNotFound
	}

	// Check if already applied
	existing, err := s.repo.GetByUserAndProgram(ctx, userSubject, programSlug)
	if err == nil && existing != nil {
		if existing.Status == StatusPending || existing.Status == StatusConfirmed {
			return nil, ErrAlreadyApplied
		}
	}

	now := time.Now().UTC()
	cohortID := matchedCohort.ID
	enrollment := &Enrollment{
		ID:           uuid.New().String(),
		UserSubject:  userSubject,
		UserName:     userName,
		UserEmail:    userEmail,
		ProgramSlug:  prog.Slug,
		ProgramTitle: prog.Title,
		CohortID:     &cohortID,
		CohortLabel:  matchedCohort.Label,
		Status:       StatusPending,
		Notes:        strings.TrimSpace(in.Notes),
		AppliedAt:    now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, enrollment); err != nil {
		return nil, err
	}

	return enrollment, nil
}

func (s *Service) MyStatus(ctx context.Context, userSubject, programSlug string) (*UserEnrollmentStatus, error) {
	existing, err := s.repo.GetByUserAndProgram(ctx, userSubject, programSlug)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return &UserEnrollmentStatus{HasApplication: false}, nil
		}
		return nil, err
	}

	return &UserEnrollmentStatus{
		HasApplication: true,
		Enrollment:     existing,
	}, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter Filter) (*ListResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 100 {
		filter.PageSize = 10
	}

	items, total, metrics, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, err
	}

	totalPages := 1
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(filter.PageSize)))
	}

	return &ListResponse{
		Data: items,
		Pagination: Pagination{
			Page:       filter.Page,
			PageSize:   filter.PageSize,
			Total:      total,
			TotalPages: totalPages,
		},
		Metrics: metrics,
	}, nil
}

func (s *Service) Confirm(ctx context.Context, id string, confirmedBy string) (*Enrollment, error) {
	enrollment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if enrollment.Status == StatusConfirmed {
		return enrollment, nil
	}

	if enrollment.Status == StatusCancelled {
		return nil, fmt.Errorf("%w: cannot confirm cancelled application", ErrInvalidStatus)
	}

	// Auto-enrol into Moodle courses if Moodle client is configured
	if s.moodleClient != nil {
		prog, err := s.trainingRepo.GetPublishedBySlug(ctx, enrollment.ProgramSlug)
		if err == nil && prog != nil && len(prog.Courses) > 0 {
			identity := learning.FederatedIdentity{
				Subject:  enrollment.UserSubject,
				Email:    enrollment.UserEmail,
				Username: enrollment.UserName,
			}
			moodleUser, resolveErr := s.moodleClient.ResolveCurrentUser(ctx, identity)
			if resolveErr == nil && moodleUser != nil {
				for _, courseRef := range prog.Courses {
					if courseRef.MoodleCourseID > 0 {
						if enrolErr := s.moodleClient.EnrolUser(ctx, moodleUser.ID, courseRef.MoodleCourseID, 5); enrolErr != nil {
							log.Printf("[training-enrollment] failed to enrol moodle user %d in course %d: %v", moodleUser.ID, courseRef.MoodleCourseID, enrolErr)
						}
					}
				}
			} else {
				log.Printf("[training-enrollment] moodle user resolution skipped or failed for subject %s: %v", enrollment.UserSubject, resolveErr)
			}
		}
	}

	updated, err := s.repo.UpdateStatus(ctx, id, StatusConfirmed, confirmedBy, "")
	if err != nil {
		return nil, err
	}

	return updated, nil
}

func (s *Service) Reject(ctx context.Context, id string, confirmedBy string, in RejectInput) (*Enrollment, error) {
	if err := in.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrValidation, err)
	}

	enrollment, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if enrollment.Status == StatusConfirmed {
		return nil, fmt.Errorf("%w: cannot reject already confirmed enrollment", ErrInvalidStatus)
	}

	updated, err := s.repo.UpdateStatus(ctx, id, StatusRejected, confirmedBy, strings.TrimSpace(in.Reason))
	if err != nil {
		return nil, err
	}

	return updated, nil
}

func (s *Service) ManualEnroll(ctx context.Context, in ManualEnrollInput, confirmedBy string) (*Enrollment, error) {
	if err := in.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrValidation, err)
	}

	prog, err := s.trainingRepo.GetPublishedBySlug(ctx, in.ProgramSlug)
	if err != nil {
		if errors.Is(err, training.ErrNotFound) {
			return nil, ErrProgramNotFound
		}
		return nil, err
	}

	cohortLabel := in.CohortLabel
	if cohortLabel == "" && len(prog.Cohorts) > 0 {
		cohortLabel = prog.Cohorts[0].Label
	}

	// Auto-enrol into Moodle courses
	if s.moodleClient != nil && len(prog.Courses) > 0 {
		identity := learning.FederatedIdentity{
			Subject:  in.UserSubject,
			Email:    in.UserEmail,
			Username: in.UserName,
		}
		moodleUser, resolveErr := s.moodleClient.ResolveCurrentUser(ctx, identity)
		if resolveErr == nil && moodleUser != nil {
			for _, courseRef := range prog.Courses {
				if courseRef.MoodleCourseID > 0 {
					if enrolErr := s.moodleClient.EnrolUser(ctx, moodleUser.ID, courseRef.MoodleCourseID, 5); enrolErr != nil {
						log.Printf("[training-enrollment] manual enrol: failed to enrol moodle user %d in course %d: %v", moodleUser.ID, courseRef.MoodleCourseID, enrolErr)
					}
				}
			}
		}
	}

	now := time.Now().UTC()
	enrollment := &Enrollment{
		ID:           uuid.New().String(),
		UserSubject:  in.UserSubject,
		UserName:     in.UserName,
		UserEmail:    in.UserEmail,
		ProgramSlug:  prog.Slug,
		ProgramTitle: prog.Title,
		CohortID:     in.CohortID,
		CohortLabel:  cohortLabel,
		Status:       StatusConfirmed,
		Notes:        strings.TrimSpace(in.Notes),
		AppliedAt:    now,
		ConfirmedAt:  &now,
		ConfirmedBy:  confirmedBy,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, enrollment); err != nil {
		return nil, err
	}

	return enrollment, nil
}
