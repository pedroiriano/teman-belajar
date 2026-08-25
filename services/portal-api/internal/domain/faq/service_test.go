package faq

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

type faqMemoryRepository struct {
	category Category
	items    map[string]*Item
}

func newFAQMemoryRepository() *faqMemoryRepository {
	return &faqMemoryRepository{category: Category{ID: uuid.NewString(), Slug: "memulai", Name: "Memulai", Status: "active"}, items: map[string]*Item{}}
}

func (r *faqMemoryRepository) CreateCategory(_ context.Context, value *Category, _ string) error {
	r.category = *value
	return nil
}
func (r *faqMemoryRepository) ListCategories(context.Context, bool) ([]Category, error) {
	return []Category{r.category}, nil
}
func (r *faqMemoryRepository) ArchiveCategory(context.Context, string, string) error {
	r.category.Status = "archived"
	return nil
}
func (r *faqMemoryRepository) CategoryActive(_ context.Context, id string) (bool, error) {
	return id == r.category.ID && r.category.Status == "active", nil
}
func (r *faqMemoryRepository) CategoryHasLiveItems(context.Context, string) (bool, error) {
	for _, item := range r.items {
		if item.Status != StatusArchived {
			return true, nil
		}
	}
	return false, nil
}
func (r *faqMemoryRepository) CreateItem(_ context.Context, value *Item, _ string) error {
	copyValue := *value
	r.items[value.ID] = &copyValue
	return nil
}
func (r *faqMemoryRepository) UpdateItem(_ context.Context, value *Item, expected int64, _ string) error {
	current := r.items[value.ID]
	if current == nil {
		return ErrNotFound
	}
	if current.Version != expected {
		return ErrConflict
	}
	copyValue := *value
	r.items[value.ID] = &copyValue
	return nil
}
func (r *faqMemoryRepository) GetItem(_ context.Context, id string) (*Item, error) {
	value := r.items[id]
	if value == nil {
		return nil, ErrNotFound
	}
	copyValue := *value
	return &copyValue, nil
}
func (r *faqMemoryRepository) ListAdminItems(context.Context, ListFilter) ([]Item, int, error) {
	return []Item{}, 0, nil
}
func (r *faqMemoryRepository) ListPublic(_ context.Context, query string) ([]PublicCategory, int, error) {
	items := []Item{}
	if r.category.Status == "active" {
		for _, item := range r.items {
			if item.Status == StatusPublished && (query == "" || strings.Contains(strings.ToLower(item.Question+" "+item.Answer), strings.ToLower(query))) {
				items = append(items, *item)
			}
		}
	}
	if len(items) == 0 {
		return []PublicCategory{}, 0, nil
	}
	return []PublicCategory{{Category: PublicCategoryInfo{ID: r.category.ID, Slug: r.category.Slug, Name: r.category.Name, Description: r.category.Description, SortOrder: r.category.SortOrder}, Items: items}}, len(items), nil
}

type faqAuditRecorder struct{ events []audit.AuditEvent }

func (r *faqAuditRecorder) CreateEvent(_ context.Context, event *audit.AuditEvent) error {
	r.events = append(r.events, *event)
	return nil
}

func validFAQInput(categoryID string) ItemInput {
	return ItemInput{CategoryID: categoryID, Slug: "cara-memulai", Question: "Bagaimana cara memulai?", Answer: "Masuk ke katalog lalu pilih kelas yang sesuai.", SortOrder: 10, SEOTitle: "Cara memulai", MetaDescription: "Panduan memulai pembelajaran.", Indexable: true}
}

func TestFAQWorkflowAuthorizationPublicationAndAudit(t *testing.T) {
	repo, auditRepo := newFAQMemoryRepository(), &faqAuditRecorder{}
	service := NewService(repo, auditRepo)
	now := time.Date(2026, 8, 25, 9, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return now }

	if _, err := service.CreateItem(context.Background(), validFAQInput(repo.category.ID), []string{"Reviewer"}, "reviewer"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("Reviewer authored FAQ: %v", err)
	}
	created, err := service.CreateItem(context.Background(), validFAQInput(repo.category.ID), []string{"Content Editor"}, "editor")
	if err != nil || created.Status != StatusDraft {
		t.Fatalf("create=%v err=%v", created, err)
	}
	if _, err := service.Transition(context.Background(), created.ID, StatusApproved, []string{"Reviewer"}, "reviewer"); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("workflow skipped review: %v", err)
	}
	inReview, err := service.Transition(context.Background(), created.ID, StatusInReview, []string{"Content Editor"}, "editor")
	if err != nil {
		t.Fatal(err)
	}
	approved, err := service.Transition(context.Background(), inReview.ID, StatusApproved, []string{"Reviewer"}, "reviewer")
	if err != nil {
		t.Fatal(err)
	}
	published, err := service.Transition(context.Background(), approved.ID, StatusPublished, []string{"Reviewer"}, "reviewer")
	if err != nil || published.PublishedAt == nil {
		t.Fatalf("publish=%v err=%v", published, err)
	}
	public, err := service.ListPublic(context.Background(), "memulai")
	if err != nil || public.Total != 1 || len(public.Data) != 1 {
		t.Fatalf("public=%v err=%v", public, err)
	}
	if len(auditRepo.events) != 4 || auditRepo.events[3].Action != "FAQ_TRANSITION_PUBLISHED" {
		t.Fatalf("audit=%#v", auditRepo.events)
	}
}

func TestFAQValidationRequiresMediaAltAndOptimisticVersion(t *testing.T) {
	repo := newFAQMemoryRepository()
	service := NewService(repo, nil)
	mediaID := uuid.NewString()
	invalid := validFAQInput(repo.category.ID)
	invalid.MediaAssetID = &mediaID
	if _, err := service.CreateItem(context.Background(), invalid, []string{"Content Editor"}, "editor"); !errors.Is(err, ErrValidation) {
		t.Fatalf("missing alt accepted: %v", err)
	}
	created, err := service.CreateItem(context.Background(), validFAQInput(repo.category.ID), []string{"Content Editor"}, "editor")
	if err != nil {
		t.Fatal(err)
	}
	update := validFAQInput(repo.category.ID)
	update.ExpectedVersion = created.Version + 1
	if _, err := service.UpdateItem(context.Background(), created.ID, update, []string{"Content Editor"}, "editor"); !errors.Is(err, ErrConflict) {
		t.Fatalf("stale update accepted: %v", err)
	}
}

func TestFAQPublicSearchRejectsControlCharacters(t *testing.T) {
	service := NewService(newFAQMemoryRepository(), nil)
	if _, err := service.ListPublic(context.Background(), "akun\nrahasia"); !errors.Is(err, ErrValidation) {
		t.Fatalf("control character search accepted: %v", err)
	}
}
