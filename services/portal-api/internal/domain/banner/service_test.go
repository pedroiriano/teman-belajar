package banner

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

type mockBannerRepo struct {
	banners map[string]*Banner
}

func newMockRepo() *mockBannerRepo {
	return &mockBannerRepo{banners: make(map[string]*Banner)}
}

func (m *mockBannerRepo) ListActive(ctx context.Context) ([]Banner, error) {
	var res []Banner
	for _, b := range m.banners {
		if b.IsActive {
			res = append(res, *b)
		}
	}
	return res, nil
}

func (m *mockBannerRepo) ListAll(ctx context.Context, page, pageSize int, search string, statusFilter string) ([]Banner, int, error) {
	var res []Banner
	for _, b := range m.banners {
		res = append(res, *b)
	}
	return res, len(res), nil
}

func (m *mockBannerRepo) GetByID(ctx context.Context, id string) (*Banner, error) {
	b, ok := m.banners[id]
	if !ok {
		return nil, nil
	}
	copy := *b
	return &copy, nil
}

func (m *mockBannerRepo) Create(ctx context.Context, b *Banner) error {
	m.banners[b.ID] = b
	return nil
}

func (m *mockBannerRepo) Update(ctx context.Context, b *Banner) error {
	m.banners[b.ID] = b
	return nil
}

func (m *mockBannerRepo) Delete(ctx context.Context, id string) error {
	delete(m.banners, id)
	return nil
}

func (m *mockBannerRepo) CountActive(ctx context.Context) (int, error) {
	cnt := 0
	for _, b := range m.banners {
		if b.IsActive {
			cnt++
		}
	}
	return cnt, nil
}

func TestBannerService_Max3ActiveConstraint(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo, nil)
	ctx := context.Background()

	// 1. Create 3 active banners -> Should succeed
	for i := 1; i <= 3; i++ {
		_, err := svc.Create(ctx, CreateBannerInput{
			Title:       "Banner " + string(rune('0'+i)),
			Description: "Desc",
			ImageURL:    "/img.jpg",
			Align:       "left",
			SortOrder:   i,
			IsActive:    true,
		}, "admin")
		if err != nil {
			t.Fatalf("expected success creating banner %d, got %v", i, err)
		}
	}

	// 2. Attempt to create 4th active banner -> Must fail with ErrMaxActiveBanners
	_, err := svc.Create(ctx, CreateBannerInput{
		Title:       "Banner 4",
		Description: "Desc",
		ImageURL:    "/img.jpg",
		Align:       "left",
		SortOrder:   4,
		IsActive:    true,
	}, "admin")
	if err != ErrMaxActiveBanners {
		t.Fatalf("expected ErrMaxActiveBanners, got %v", err)
	}

	// 3. Creating 4th as INACTIVE -> Must succeed
	b4, err := svc.Create(ctx, CreateBannerInput{
		Title:       "Banner 4",
		Description: "Desc",
		ImageURL:    "/img.jpg",
		Align:       "left",
		SortOrder:   4,
		IsActive:    false,
	}, "admin")
	if err != nil {
		t.Fatalf("expected success creating inactive banner, got %v", err)
	}

	// 4. Attempt to toggle inactive banner 4 to active -> Must fail with ErrMaxActiveBanners
	_, err = svc.ToggleActive(ctx, b4.ID, "admin")
	if err != ErrMaxActiveBanners {
		t.Fatalf("expected ErrMaxActiveBanners on toggle, got %v", err)
	}

	// 5. Delete one active banner
	var activeID string
	for id, b := range repo.banners {
		if b.IsActive {
			activeID = id
			break
		}
	}
	if err := svc.Delete(ctx, activeID, "admin"); err != nil {
		t.Fatalf("delete error: %v", err)
	}

	// 6. Now toggle banner 4 to active -> Must succeed
	toggled, err := svc.ToggleActive(ctx, b4.ID, "admin")
	if err != nil {
		t.Fatalf("expected toggle to succeed after deletion, got %v", err)
	}
	if !toggled.IsActive {
		t.Fatalf("expected banner 4 to be active")
	}
}

func TestBannerService_Validation(t *testing.T) {
	repo := newMockRepo()
	svc := NewService(repo, nil)
	ctx := context.Background()

	// Empty title
	_, err := svc.Create(ctx, CreateBannerInput{
		Title:       "",
		Description: "Desc",
		ImageURL:    "/img.jpg",
		Align:       "left",
	}, "admin")
	if err != ErrValidation {
		t.Fatalf("expected ErrValidation for empty title, got %v", err)
	}

	// Invalid align
	_, err = svc.Create(ctx, CreateBannerInput{
		Title:       "Valid Title",
		Description: "Desc",
		ImageURL:    "/img.jpg",
		Align:       "diagonal",
	}, "admin")
	if err != ErrValidation {
		t.Fatalf("expected ErrValidation for invalid align, got %v", err)
	}

	// Invalid UUID for GetByID
	_, err = svc.GetByID(ctx, "invalid-uuid")
	if err != ErrValidation {
		t.Fatalf("expected ErrValidation for bad UUID, got %v", err)
	}

	// Non-existent UUID
	b, err := svc.GetByID(ctx, uuid.NewString())
	if err != nil || b != nil {
		t.Fatalf("expected nil for non-existent banner, got %v, %v", b, err)
	}
}
