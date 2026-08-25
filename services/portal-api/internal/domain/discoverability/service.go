package discoverability

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

var (
	ErrInvalid       = errors.New("invalid discoverability input")
	ErrNotFound      = errors.New("discoverability resource not found")
	ErrConflict      = errors.New("discoverability conflict")
	ErrForbidden     = errors.New("discoverability operation forbidden")
	ErrInvalidMedia  = errors.New("social media must be an active image asset")
	ErrRedirectCycle = errors.New("slug redirect would create a cycle")
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

var reservedSlugs = map[string]struct{}{
	"admin": {}, "api": {}, "auth": {}, "dashboard": {}, "login": {}, "logout": {},
	"media": {}, "preview": {}, "recovery": {}, "robots": {}, "search": {}, "sitemap": {},
}

type Service struct {
	repo      Repository
	auditRepo audit.Repository
}

func NewService(repo Repository, auditRepos ...audit.Repository) *Service {
	service := &Service{repo: repo}
	if len(auditRepos) > 0 {
		service.auditRepo = auditRepos[0]
	}
	return service
}

func ValidContentType(value ContentType) bool {
	return value == ContentNews || value == ContentAnnouncement || value == ContentKnowledge
}

func ValidTermKind(value TermKind) bool { return value == KindCategory || value == KindTag }

func NormalizeName(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(value)), " "))
}

func ValidateSlug(value string) error {
	if utf8.RuneCountInString(value) < 2 || utf8.RuneCountInString(value) > 120 || !slugPattern.MatchString(value) {
		return ErrInvalid
	}
	if _, reserved := reservedSlugs[value]; reserved {
		return ErrInvalid
	}
	return nil
}

func (s *Service) CreateTerm(ctx context.Context, input CreateTermInput, actorID string) (*Term, error) {
	input.Name = strings.Join(strings.Fields(strings.TrimSpace(input.Name)), " ")
	input.Slug = strings.TrimSpace(input.Slug)
	input.Description = strings.TrimSpace(input.Description)
	if !ValidTermKind(input.Kind) || input.Name == "" || utf8.RuneCountInString(input.Name) > 120 || utf8.RuneCountInString(input.Description) > 1000 {
		return nil, ErrInvalid
	}
	if err := ValidateSlug(input.Slug); err != nil {
		return nil, err
	}
	if input.Kind == KindCategory {
		if input.Domain == "" {
			input.Domain = "public"
		}
		if input.Domain != "public" && !ValidContentType(ContentType(input.Domain)) {
			return nil, ErrInvalid
		}
	} else {
		input.Domain = ""
	}
	term, err := s.repo.CreateTerm(ctx, input, actorID)
	if err == nil {
		s.audit(ctx, actorID, "TAXONOMY_"+strings.ToUpper(string(input.Kind))+"_CREATED", "taxonomy", term.ID)
	}
	return term, err
}

func (s *Service) ListTerms(ctx context.Context, kind TermKind, includeArchived bool) ([]Term, error) {
	if !ValidTermKind(kind) {
		return nil, ErrInvalid
	}
	items, err := s.repo.ListTerms(ctx, kind, includeArchived)
	if items == nil {
		items = []Term{}
	}
	return items, err
}

func (s *Service) ArchiveTerm(ctx context.Context, kind TermKind, id, actorID string) error {
	if !ValidTermKind(kind) {
		return ErrInvalid
	}
	if _, err := uuid.Parse(id); err != nil {
		return ErrInvalid
	}
	err := s.repo.ArchiveTerm(ctx, kind, id, actorID)
	if err == nil {
		s.audit(ctx, actorID, "TAXONOMY_"+strings.ToUpper(string(kind))+"_ARCHIVED", "taxonomy", id)
	}
	return err
}

func (s *Service) SaveProfile(ctx context.Context, contentType ContentType, contentID string, input ProfileInput, actorID string) (*Profile, error) {
	if !ValidContentType(contentType) {
		return nil, ErrInvalid
	}
	if _, err := uuid.Parse(contentID); err != nil {
		return nil, ErrInvalid
	}
	input.Slug = strings.TrimSpace(input.Slug)
	input.SEOTitle = strings.TrimSpace(input.SEOTitle)
	input.MetaDescription = strings.TrimSpace(input.MetaDescription)
	input.SocialTitle = strings.TrimSpace(input.SocialTitle)
	input.SocialDescription = strings.TrimSpace(input.SocialDescription)
	if input.CanonicalPath != nil {
		trimmed := strings.TrimSpace(*input.CanonicalPath)
		if trimmed == "" {
			input.CanonicalPath = nil
		} else {
			input.CanonicalPath = &trimmed
		}
	}
	if input.TagIDs == nil {
		input.TagIDs = []string{}
	}
	if err := validateProfileInput(contentType, input); err != nil {
		return nil, err
	}
	record, profile, err := s.repo.SaveProfile(ctx, contentType, contentID, input, actorID)
	if err != nil {
		return nil, err
	}
	profile.Slug = record.Slug
	s.audit(ctx, actorID, "DISCOVERABILITY_PROFILE_UPDATED", string(contentType), contentID)
	return profile, nil
}

func (s *Service) GetProfile(ctx context.Context, contentType ContentType, contentID string) (*Profile, error) {
	if !ValidContentType(contentType) {
		return nil, ErrInvalid
	}
	if _, err := uuid.Parse(contentID); err != nil {
		return nil, ErrInvalid
	}
	record, profile, err := s.repo.GetProfile(ctx, contentType, contentID)
	if err != nil {
		return nil, err
	}
	profile.Slug = record.Slug
	return profile, nil
}

func validateProfileInput(contentType ContentType, input ProfileInput) error {
	if err := ValidateSlug(input.Slug); err != nil {
		return err
	}
	if utf8.RuneCountInString(input.SEOTitle) > 200 || utf8.RuneCountInString(input.MetaDescription) > 500 ||
		utf8.RuneCountInString(input.SocialTitle) > 200 || utf8.RuneCountInString(input.SocialDescription) > 500 || len(input.TagIDs) > 20 {
		return ErrInvalid
	}
	seen := make(map[string]struct{}, len(input.TagIDs))
	for _, id := range input.TagIDs {
		if _, err := uuid.Parse(id); err != nil {
			return ErrInvalid
		}
		if _, exists := seen[id]; exists {
			return ErrInvalid
		}
		seen[id] = struct{}{}
	}
	for _, id := range []*string{input.CategoryID, input.SocialMediaID} {
		if id != nil {
			if _, err := uuid.Parse(*id); err != nil {
				return ErrInvalid
			}
		}
	}
	if input.CanonicalPath != nil {
		candidate := strings.TrimSpace(*input.CanonicalPath)
		parsed, err := url.Parse(candidate)
		if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.RawQuery != "" || parsed.Fragment != "" || !strings.HasPrefix(candidate, "/") || strings.Contains(candidate, "\\") || strings.Contains(candidate, "..") || strings.HasPrefix(candidate, "//") {
			return ErrInvalid
		}
		allowedPrefix := map[ContentType]string{ContentNews: "/news/", ContentAnnouncement: "/announcements/", ContentKnowledge: "/knowledge/"}[contentType]
		if !strings.HasPrefix(candidate, allowedPrefix) {
			return ErrInvalid
		}
		input.CanonicalPath = &candidate
	}
	return nil
}

func (s *Service) Metadata(ctx context.Context, contentType ContentType, contentID string) (*Metadata, error) {
	record, profile, err := s.repo.GetProfile(ctx, contentType, contentID)
	if err != nil {
		return nil, err
	}
	canonical := publicPath(contentType, record.Slug)
	if profile.CanonicalPath != nil {
		canonical = *profile.CanonicalPath
	}
	title := strings.TrimSpace(profile.SEOTitle)
	if title == "" {
		title = record.Title
	}
	description := strings.TrimSpace(profile.MetaDescription)
	if description == "" {
		description = record.Summary
	}
	ogTitle := strings.TrimSpace(profile.SocialTitle)
	if ogTitle == "" {
		ogTitle = title
	}
	ogDescription := strings.TrimSpace(profile.SocialDescription)
	if ogDescription == "" {
		ogDescription = description
	}
	imageID := profile.SocialMediaID
	imageAlt := profile.SocialImageAlt
	if imageID == nil {
		imageID = record.FeaturedMediaID
		imageAlt = record.FeaturedMediaAlt
	}
	imageURL := "/teman-belajar-social.svg"
	if imageID != nil {
		imageURL = "/media/" + *imageID
	} else {
		imageAlt = "Teman Belajar"
	}
	published := record.PublishedAt != nil && (contentType == ContentKnowledge || record.Status == "published")
	indexable := profile.Indexable && published
	category := profile.Category
	if category != nil && category.Status != "active" {
		category = nil
	}
	activeTags := make([]Term, 0, len(profile.Tags))
	for _, tag := range profile.Tags {
		if tag.Status == "active" {
			activeTags = append(activeTags, tag)
		}
	}
	metadata := &Metadata{
		ContentType: contentType, ContentID: contentID, Slug: record.Slug, Title: title,
		Description: description, CanonicalPath: canonical, Indexable: indexable,
		OpenGraphTitle: ogTitle, OpenGraphSummary: ogDescription, OpenGraphImageURL: imageURL, OpenGraphImageAlt: imageAlt,
		Category: category, Tags: activeTags, PublishedAt: record.PublishedAt, UpdatedAt: record.UpdatedAt,
	}
	metadata.Health = evaluateHealth(*metadata, profile)
	return metadata, nil
}

func evaluateHealth(metadata Metadata, profile *Profile) []Health {
	checks := make([]Health, 0, 7)
	add := func(code, status, message string) {
		checks = append(checks, Health{Code: code, Status: status, Message: message})
	}
	if metadata.Title == "" {
		add("title", "BLOCKER", "Judul SEO dan fallback judul kosong.")
	} else {
		add("title", "PASS", "Judul tersedia melalui metadata atau fallback konten.")
	}
	if metadata.Description == "" {
		add("description", "WARNING", "Tambahkan ringkasan atau meta description yang informatif.")
	} else {
		add("description", "PASS", "Deskripsi tersedia.")
	}
	if ValidateSlug(metadata.Slug) != nil {
		add("slug", "BLOCKER", "Slug tidak aman.")
	} else {
		add("slug", "PASS", "Slug aman dan terbatas.")
	}
	if metadata.Category == nil {
		add("category", "WARNING", "Pilih satu kategori editorial.")
	} else {
		add("category", "PASS", "Kategori editorial tersedia.")
	}
	if metadata.OpenGraphImageAlt != "" {
		add("social_image_alt", "PASS", "Gambar sosial/fallback memiliki teks alternatif.")
	} else {
		add("social_image_alt", "WARNING", "Media sosial terpilih belum memiliki teks alternatif kanonis di Media Library.")
	}
	if profile.SocialMediaID != nil {
		add("social_image", "PASS", "Gambar sosial eksplisit tersedia.")
	} else {
		add("social_image", "WARNING", "Gambar unggulan atau gambar situs digunakan sebagai fallback.")
	}
	if profile.CanonicalPath != nil {
		add("canonical", "PASS", "Canonical internal override tervalidasi.")
	} else {
		add("canonical", "PASS", "Canonical menggunakan URL publik utama.")
	}
	if metadata.Indexable {
		add("indexability", "PASS", "Konten diterbitkan dan dapat diindeks.")
	} else {
		add("indexability", "WARNING", "Konten tidak akan diindeks sampai status dan kebijakan mengizinkan.")
	}
	return checks
}

func (s *Service) ResolveRedirect(ctx context.Context, contentType ContentType, oldSlug string) (*Redirect, error) {
	if !ValidContentType(contentType) || ValidateSlug(oldSlug) != nil {
		return nil, ErrInvalid
	}
	return s.repo.ResolveRedirect(ctx, contentType, oldSlug)
}

func (s *Service) Sitemap(ctx context.Context) ([]SitemapEntry, error) {
	items, err := s.repo.ListSitemap(ctx)
	if items == nil {
		items = []SitemapEntry{}
	}
	return items, err
}

func (s *Service) Landing(ctx context.Context, kind TermKind, slug string) (*Landing, error) {
	if !ValidTermKind(kind) || ValidateSlug(slug) != nil {
		return nil, ErrInvalid
	}
	return s.repo.GetLanding(ctx, kind, slug)
}

func publicPath(contentType ContentType, slug string) string {
	switch contentType {
	case ContentNews:
		return "/news/" + slug
	case ContentAnnouncement:
		return "/announcements/" + slug
	default:
		return "/knowledge/" + slug
	}
}

func (s *Service) audit(ctx context.Context, actorID, action, targetType, targetID string) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actorID, Action: action, TargetType: targetType, TargetID: targetID, Result: "SUCCESS", OccurredAt: time.Now().UTC()})
}
