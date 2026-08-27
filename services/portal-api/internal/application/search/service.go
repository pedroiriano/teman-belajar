package search

import (
	"context"
	"errors"
	"strings"
	"unicode"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/engagement"
	domainsearch "teman-belajar-api/internal/domain/search"
)

var ErrInvalidQuery = errors.New("invalid search query")

type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string { return e.Field + ": " + e.Message }
func (e *ValidationError) Unwrap() error { return ErrInvalidQuery }

type Service struct {
	provider domainsearch.Provider
}

type CandidateProvider interface {
	Discover(ctx context.Context, query engagement.CandidateQuery) ([]engagement.Candidate, error)
}

func NewService(provider domainsearch.Provider) *Service {
	return &Service{provider: provider}
}

func (s *Service) Discover(ctx context.Context, query engagement.CandidateQuery) ([]engagement.Candidate, error) {
	if query.TargetType != engagement.TargetKnowledge || query.Limit < 1 || query.Limit > 40 {
		return nil, ErrInvalidQuery
	}
	query.Text = strings.TrimSpace(query.Text)
	if len([]rune(query.Text)) > 200 || strings.IndexFunc(query.Text, unicode.IsControl) >= 0 {
		return nil, ErrInvalidQuery
	}
	if query.CategoryID != "" {
		if _, err := uuid.Parse(query.CategoryID); err != nil {
			return nil, ErrInvalidQuery
		}
	}
	provider, ok := s.provider.(CandidateProvider)
	if !ok {
		return nil, errors.New("search candidate discovery is unavailable")
	}
	return provider.Discover(ctx, query)
}

func (s *Service) Search(ctx context.Context, query domainsearch.Query) (domainsearch.Result, error) {
	query.Text = strings.TrimSpace(query.Text)
	if query.Text == "" {
		return domainsearch.Result{}, invalid("q", "wajib diisi")
	}
	if len([]rune(query.Text)) > 200 {
		return domainsearch.Result{}, invalid("q", "maksimum 200 karakter")
	}
	if strings.IndexFunc(query.Text, unicode.IsControl) >= 0 {
		return domainsearch.Result{}, invalid("q", "tidak boleh memuat karakter kontrol")
	}

	if query.Page < 1 {
		return domainsearch.Result{}, invalid("page", "harus bernilai minimal 1")
	}
	if query.PageSize < 1 || query.PageSize > 50 {
		return domainsearch.Result{}, invalid("page_size", "harus berada pada rentang 1 sampai 50")
	}
	if query.ContentType != "" && !knownContentType(query.ContentType) {
		return domainsearch.Result{}, invalid("content_type", "nilai tidak dikenal")
	}
	if query.Sort == "" {
		query.Sort = domainsearch.SortRelevance
	}
	if !knownSort(query.Sort) {
		return domainsearch.Result{}, invalid("sort", "nilai tidak dikenal")
	}
	if query.CategoryID != "" {
		if _, err := uuid.Parse(query.CategoryID); err != nil {
			return domainsearch.Result{}, invalid("category_id", "harus berupa UUID yang valid")
		}
	}
	if query.Tag != "" {
		if len([]rune(query.Tag)) > 64 || strings.IndexFunc(query.Tag, invalidTagRune) >= 0 {
			return domainsearch.Result{}, invalid("tag", "hanya huruf, angka, spasi, titik, garis bawah, dan tanda hubung yang diizinkan")
		}
	}

	return s.provider.Search(ctx, query)
}

func invalid(field, message string) error {
	return &ValidationError{Field: field, Message: message}
}

func knownContentType(value domainsearch.ContentType) bool {
	switch value {
	case domainsearch.ContentTypeCourse, domainsearch.ContentTypeKnowledge, domainsearch.ContentTypeNews, domainsearch.ContentTypeAnnouncement, domainsearch.ContentTypeFAQ, domainsearch.ContentTypeMicrolearning:
		return true
	default:
		return false
	}
}

func knownSort(value domainsearch.Sort) bool {
	switch value {
	case domainsearch.SortRelevance, domainsearch.SortNewest, domainsearch.SortOldest:
		return true
	default:
		return false
	}
}

func invalidTagRune(r rune) bool {
	return !(unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) || r == '.' || r == '_' || r == '-')
}
