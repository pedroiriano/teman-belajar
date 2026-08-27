package training

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/learning"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type LearningProvider interface {
	ListCourses(context.Context, learning.CourseFilter) ([]learning.LearningCourse, error)
	ResolveCurrentUser(context.Context, learning.FederatedIdentity) (*learning.LearningUser, error)
	ListUserCourses(context.Context, *learning.LearningUser) ([]learning.EnrolledCourse, error)
}

type Service struct {
	repo       Repository
	learning   LearningProvider
	auditRepo  audit.Repository
	moodleBase string
	now        func() time.Time
}

func NewService(repo Repository, provider LearningProvider, auditRepo audit.Repository, moodleBase string) *Service {
	return &Service{repo: repo, learning: provider, auditRepo: auditRepo, moodleBase: strings.TrimRight(moodleBase, "/"), now: func() time.Time { return time.Now().UTC() }}
}

func cleanSingleLine(value string) string { return strings.Join(strings.Fields(value), " ") }

func validText(value string, min, max int, singleLine bool) bool {
	value = strings.TrimSpace(value)
	if !utf8.ValidString(value) || utf8.RuneCountInString(value) < min || utf8.RuneCountInString(value) > max {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) && (singleLine || (r != '\n' && r != '\r' && r != '\t')) {
			return false
		}
	}
	return !singleLine || !strings.ContainsAny(value, "\r\n")
}

func normalizeInput(in *ProgramInput) error {
	in.Slug = strings.TrimSpace(in.Slug)
	in.Title = cleanSingleLine(in.Title)
	in.Summary = strings.TrimSpace(in.Summary)
	in.Description = strings.TrimSpace(in.Description)
	in.Audience = strings.TrimSpace(in.Audience)
	in.EligibilityText = strings.TrimSpace(in.EligibilityText)
	if !slugPattern.MatchString(in.Slug) || !validText(in.Slug, 2, 160, true) || !validText(in.Title, 3, 200, true) || !validText(in.Summary, 10, 500, false) || !validText(in.Description, 20, 20000, false) || !validText(in.Audience, 0, 500, false) || !validText(in.EligibilityText, 0, 1000, false) {
		return ErrValidation
	}
	if len(in.Courses) < 1 || len(in.Courses) > 50 || len(in.Cohorts) > 20 {
		return ErrValidation
	}
	seen := make(map[int]struct{}, len(in.Courses))
	for _, course := range in.Courses {
		if course.MoodleCourseID <= 1 {
			return ErrValidation
		}
		if _, exists := seen[course.MoodleCourseID]; exists {
			return ErrValidation
		}
		seen[course.MoodleCourseID] = struct{}{}
	}
	for i := range in.Cohorts {
		cohort := &in.Cohorts[i]
		cohort.Label = cleanSingleLine(cohort.Label)
		if !validText(cohort.Label, 2, 160, true) || (cohort.Status != "scheduled" && cohort.Status != "cancelled" && cohort.Status != "completed") {
			return ErrValidation
		}
		if cohort.StartsAt != nil && cohort.EndsAt != nil && !cohort.StartsAt.Before(*cohort.EndsAt) {
			return ErrValidation
		}
		if cohort.EnrollmentOpensAt != nil && cohort.EnrollmentClosesAt != nil && !cohort.EnrollmentOpensAt.Before(*cohort.EnrollmentClosesAt) {
			return ErrValidation
		}
	}
	return nil
}

func normalizeFilter(filter ListFilter, admin bool) (ListFilter, error) {
	filter.Query, filter.Status = strings.TrimSpace(filter.Query), strings.TrimSpace(filter.Status)
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 12
	}
	if filter.PageSize > 100 || !validText(filter.Query, 0, 100, true) {
		return filter, ErrValidation
	}
	if admin && filter.Status != "" && filter.Status != "all" && filter.Status != string(StatusDraft) && filter.Status != string(StatusInReview) && filter.Status != string(StatusApproved) && filter.Status != string(StatusPublished) && filter.Status != string(StatusArchived) {
		return filter, ErrValidation
	}
	if !admin && filter.Status != "" {
		return filter, ErrValidation
	}
	return filter, nil
}

func hasRole(roles []string, role string) bool {
	for _, current := range roles {
		if current == role || current == "Portal Administrator" {
			return true
		}
	}
	return false
}

func canWrite(roles []string) bool { return hasRole(roles, "Content Editor") }

func canTransition(current, next Status, roles []string) bool {
	editor, reviewer := canWrite(roles), hasRole(roles, "Reviewer")
	switch current {
	case StatusDraft:
		return (next == StatusInReview && editor) || (next == StatusArchived && editor)
	case StatusInReview:
		return reviewer && (next == StatusApproved || next == StatusDraft)
	case StatusApproved:
		return reviewer && (next == StatusPublished || next == StatusDraft)
	case StatusPublished:
		return next == StatusArchived && (editor || reviewer)
	}
	return false
}

func (s *Service) validateCourses(ctx context.Context, input []CourseInput) error {
	courses, err := s.learning.ListCourses(ctx, learning.CourseFilter{})
	if err != nil {
		return fmt.Errorf("%w: %v", ErrLearningUnavailable, err)
	}
	available := make(map[int]struct{}, len(courses))
	for _, course := range courses {
		if course.Visible {
			available[course.ID] = struct{}{}
		}
	}
	for _, course := range input {
		if _, ok := available[course.MoodleCourseID]; !ok {
			return ErrValidation
		}
	}
	return nil
}

func programFromInput(in ProgramInput, now time.Time) *Program {
	item := &Program{Slug: in.Slug, Title: in.Title, Summary: in.Summary, Description: in.Description, Audience: in.Audience, EligibilityText: in.EligibilityText}
	item.Courses = make([]CourseRef, len(in.Courses))
	for i, course := range in.Courses {
		item.Courses[i] = CourseRef{MoodleCourseID: course.MoodleCourseID, Required: course.Required, SortOrder: (i + 1) * 10}
	}
	item.Cohorts = make([]Cohort, len(in.Cohorts))
	for i, cohort := range in.Cohorts {
		item.Cohorts[i] = Cohort{ID: uuid.NewString(), Label: cohort.Label, StartsAt: cohort.StartsAt, EndsAt: cohort.EndsAt, EnrollmentOpensAt: cohort.EnrollmentOpensAt, EnrollmentClosesAt: cohort.EnrollmentClosesAt, Status: cohort.Status, SortOrder: (i + 1) * 10}
	}
	item.UpdatedAt = now
	return item
}

func (s *Service) Create(ctx context.Context, in ProgramInput, roles []string, actor string) (*Program, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if err := normalizeInput(&in); err != nil {
		return nil, err
	}
	if err := s.validateCourses(ctx, in.Courses); err != nil {
		return nil, err
	}
	now := s.now()
	item := programFromInput(in, now)
	item.ID, item.Status, item.Version, item.CreatedAt = uuid.NewString(), StatusDraft, 1, now
	if err := s.repo.Create(ctx, item, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "TRAINING_PROGRAM_CREATED", item.ID)
	return item, nil
}

func (s *Service) Update(ctx context.Context, id string, in ProgramInput, roles []string, actor string) (*Program, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if _, err := uuid.Parse(id); err != nil || in.ExpectedVersion < 1 {
		return nil, ErrValidation
	}
	if err := normalizeInput(&in); err != nil {
		return nil, err
	}
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.Status != StatusDraft {
		return nil, ErrForbidden
	}
	if current.Version != in.ExpectedVersion {
		return nil, ErrConflict
	}
	if err := s.validateCourses(ctx, in.Courses); err != nil {
		return nil, err
	}
	updated := programFromInput(in, s.now())
	updated.ID, updated.Status, updated.Version, updated.CreatedAt = current.ID, current.Status, current.Version+1, current.CreatedAt
	if err := s.repo.Update(ctx, updated, in.ExpectedVersion, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "TRAINING_PROGRAM_UPDATED", id)
	return updated, nil
}

func (s *Service) Transition(ctx context.Context, id string, next Status, roles []string, actor string) (*Program, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !canTransition(item.Status, next, roles) {
		return nil, ErrInvalidTransition
	}
	if next == StatusPublished {
		if err := s.validateCourseRefs(ctx, item.Courses); err != nil {
			return nil, err
		}
		now := s.now()
		item.PublishedAt = &now
	}
	expected := item.Version
	item.Status, item.Version, item.UpdatedAt = next, item.Version+1, s.now()
	if err := s.repo.Update(ctx, item, expected, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "TRAINING_PROGRAM_TRANSITION_"+strings.ToUpper(string(next)), id)
	return item, nil
}

func (s *Service) validateCourseRefs(ctx context.Context, refs []CourseRef) error {
	input := make([]CourseInput, len(refs))
	for i, ref := range refs {
		input[i] = CourseInput{MoodleCourseID: ref.MoodleCourseID, Required: ref.Required}
	}
	return s.validateCourses(ctx, input)
}

func listResult(items []Program, total int, filter ListFilter) *ProgramList {
	if items == nil {
		items = []Program{}
	}
	pages := total / filter.PageSize
	if total%filter.PageSize != 0 {
		pages++
	}
	return &ProgramList{Data: items, Pagination: Pagination{Page: filter.Page, PageSize: filter.PageSize, Total: total, TotalPages: pages}}
}

func (s *Service) ListPublic(ctx context.Context, filter ListFilter) (*ProgramList, error) {
	filter, err := normalizeFilter(filter, false)
	if err != nil {
		return nil, err
	}
	items, total, err := s.repo.ListPublic(ctx, filter)
	if err != nil {
		return nil, err
	}
	return listResult(items, total, filter), nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListFilter) (*ProgramList, error) {
	filter, err := normalizeFilter(filter, true)
	if err != nil {
		return nil, err
	}
	items, total, err := s.repo.ListAdmin(ctx, filter)
	if err != nil {
		return nil, err
	}
	return listResult(items, total, filter), nil
}

func (s *Service) GetAdmin(ctx context.Context, id string) (*Program, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) CourseOptions(ctx context.Context) ([]learning.LearningCourse, error) {
	items, err := s.learning.ListCourses(ctx, learning.CourseFilter{})
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrLearningUnavailable, err)
	}
	if items == nil {
		items = []learning.LearningCourse{}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].FullName < items[j].FullName })
	return items, nil
}

func (s *Service) GetPublic(ctx context.Context, slug string) (*ProgramDetail, error) {
	if !slugPattern.MatchString(slug) {
		return nil, ErrValidation
	}
	item, err := s.repo.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	courses, provenance := s.composeCourses(ctx, item.Courses)
	return &ProgramDetail{Program: *item, Courses: courses, Provenance: provenance}, nil
}

func (s *Service) composeCourses(ctx context.Context, refs []CourseRef) ([]ComposedCourse, Provenance) {
	checkedAt := s.now()
	result := make([]ComposedCourse, len(refs))
	for i, ref := range refs {
		result[i] = ComposedCourse{MoodleCourseID: ref.MoodleCourseID, Required: ref.Required, Availability: "unavailable"}
	}
	available, err := s.learning.ListCourses(ctx, learning.CourseFilter{})
	if err != nil {
		return result, Provenance{Source: "moodle", CheckedAt: checkedAt, State: "degraded", Detail: "course_catalogue_unavailable"}
	}
	byID := make(map[int]learning.LearningCourse, len(available))
	for _, course := range available {
		byID[course.ID] = course
	}
	degraded := false
	for i := range result {
		course, ok := byID[result[i].MoodleCourseID]
		if !ok || !course.Visible {
			degraded = true
			continue
		}
		result[i].ShortName, result[i].FullName, result[i].Summary, result[i].Category, result[i].Availability = course.ShortName, course.FullName, course.Summary, course.Category, "available"
	}
	if degraded {
		return result, Provenance{Source: "moodle", CheckedAt: checkedAt, State: "degraded", Detail: "one_or_more_courses_unavailable"}
	}
	return result, Provenance{Source: "moodle", CheckedAt: checkedAt, State: "fresh"}
}

func (s *Service) GetProgress(ctx context.Context, slug string, identity learning.FederatedIdentity) (*ProgramProgress, error) {
	if strings.TrimSpace(identity.Subject) == "" {
		return nil, ErrForbidden
	}
	item, err := s.repo.GetPublishedBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	courses, provenance := s.composeCourses(ctx, item.Courses)
	result := &ProgramProgress{ProgramSlug: slug, Courses: courses, TotalCourses: len(courses), Provenance: provenance, Eligibility: Eligibility{Status: "unverified", Message: "Akses program belum dikonfirmasi oleh Moodle."}, CTA: CTA{Kind: "check_access", Label: "Periksa akses di Moodle"}}
	user, err := s.learning.ResolveCurrentUser(ctx, identity)
	if err != nil {
		result.Provenance.State, result.Provenance.Detail = "degraded", "learner_mapping_unavailable"
		result.setFallbackURL(s.moodleBase)
		return result, nil
	}
	enrolled, err := s.learning.ListUserCourses(ctx, user)
	if err != nil {
		result.Provenance.State, result.Provenance.Detail = "degraded", "learner_progress_unavailable"
		result.setFallbackURL(s.moodleBase)
		return result, nil
	}
	byID := make(map[int]learning.EnrolledCourse, len(enrolled))
	for _, course := range enrolled {
		byID[course.ID] = course
	}
	totalProgress := float64(0)
	for i := range result.Courses {
		course, ok := byID[result.Courses[i].MoodleCourseID]
		if !ok {
			result.Courses[i].LearnerState = "not_enrolled"
			continue
		}
		result.EnrolledCourses++
		result.Courses[i].LearnerState = "enrolled"
		result.Courses[i].StartURL = courseURL(s.moodleBase, course.ID)
		progress := float64(0)
		if course.Progress != nil {
			progress = min(100, max(0, *course.Progress))
		}
		if course.Completed {
			progress = 100
			result.CompletedCourses++
			result.Courses[i].LearnerState = "completed"
		}
		result.Courses[i].Progress = &progress
		totalProgress += progress
	}
	if result.TotalCourses > 0 {
		progress := totalProgress / float64(result.TotalCourses)
		result.ProgressPercent = &progress
	}
	result.setCTA(s.moodleBase)
	return result, nil
}

func (p *ProgramProgress) setFallbackURL(base string) {
	if len(p.Courses) > 0 {
		p.CTA.URL = courseURL(base, p.Courses[0].MoodleCourseID)
	}
}

func (p *ProgramProgress) setCTA(base string) {
	switch {
	case p.EnrolledCourses == 0:
		p.Eligibility = Eligibility{Status: "unverified", Message: "Belum ada enrolment Moodle yang terkonfirmasi untuk program ini."}
		p.setFallbackURL(base)
	case p.EnrolledCourses < p.TotalCourses:
		p.Eligibility = Eligibility{Status: "partial", Message: "Sebagian akses course telah dikonfirmasi oleh Moodle."}
		p.CTA = firstCourseCTA(p.Courses, "Lanjutkan course", "start")
	case p.CompletedCourses == p.TotalCourses:
		p.Eligibility = Eligibility{Status: "confirmed", Message: "Akses seluruh course terkonfirmasi oleh Moodle."}
		p.CTA = firstCourseCTA(p.Courses, "Tinjau kembali di Moodle", "review")
	default:
		p.Eligibility = Eligibility{Status: "confirmed", Message: "Akses seluruh course terkonfirmasi oleh Moodle."}
		p.CTA = firstCourseCTA(p.Courses, "Mulai atau lanjutkan", "start")
	}
}

func firstCourseCTA(courses []ComposedCourse, label, kind string) CTA {
	for _, course := range courses {
		if course.StartURL != "" && course.LearnerState != "completed" {
			return CTA{Kind: kind, Label: label, URL: course.StartURL}
		}
	}
	for _, course := range courses {
		if course.StartURL != "" {
			return CTA{Kind: kind, Label: label, URL: course.StartURL}
		}
	}
	return CTA{Kind: "unavailable", Label: "Akses belum tersedia"}
}

func courseURL(base string, courseID int) string {
	parsed, err := url.Parse(base)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}
	parsed.Path = "/course/view.php"
	query := parsed.Query()
	query.Set("id", fmt.Sprintf("%d", courseID))
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func (s *Service) audit(ctx context.Context, actor, action, targetID string) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, TargetType: "training_program", TargetID: targetID, Result: "SUCCESS", OccurredAt: s.now()})
}

func IsUpstreamError(err error) bool {
	return errors.Is(err, ErrLearningUnavailable) || errors.Is(err, learning.ErrMoodleUnavailable) || errors.Is(err, learning.ErrMoodleTimeout)
}
