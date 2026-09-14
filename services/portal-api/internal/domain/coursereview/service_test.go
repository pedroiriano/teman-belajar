package coursereview

import (
	"context"
	"testing"
	"time"
)

type mockRepository struct {
	programs map[string]string // slug -> id
	reviews  map[string]*Review
	summary  *RatingSummary
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		programs: map[string]string{
			"pelatihan-go": "11111111-1111-1111-1111-111111111111",
		},
		reviews: make(map[string]*Review),
	}
}

func (m *mockRepository) GetSummaryBySlug(_ context.Context, slug string) (*RatingSummary, error) {
	if m.summary != nil {
		return m.summary, nil
	}
	var sum float64
	var count int
	dist := defaultDistribution()
	for _, r := range m.reviews {
		if r.ProgramSlug == slug && r.Status == StatusPublished {
			sum += float64(r.Rating)
			count++
			d := dist[r.Rating]
			d.Count++
			dist[r.Rating] = d
		}
	}
	if count > 0 {
		for i := 1; i <= 5; i++ {
			d := dist[i]
			d.Percentage = (float64(d.Count) / float64(count)) * 100
			dist[i] = d
		}
		return &RatingSummary{
			AverageRating: sum / float64(count),
			TotalReviews:  count,
			Distribution:  dist,
		}, nil
	}
	return &RatingSummary{
		AverageRating: 0,
		TotalReviews:  0,
		Distribution:  dist,
	}, nil
}

func (m *mockRepository) ListPublicBySlug(_ context.Context, slug string, _ ListFilter) ([]Review, int, error) {
	var list []Review
	for _, r := range m.reviews {
		if r.ProgramSlug == slug && r.Status == StatusPublished {
			list = append(list, *r)
		}
	}
	return list, len(list), nil
}

func (m *mockRepository) GetByUserAndSlug(_ context.Context, userSubject, slug string) (*Review, error) {
	for _, r := range m.reviews {
		if r.UserSubject == userSubject && r.ProgramSlug == slug {
			return r, nil
		}
	}
	return nil, ErrNotFound
}

func (m *mockRepository) Upsert(_ context.Context, review *Review) error {
	m.reviews[review.ID] = review
	return nil
}

func (m *mockRepository) DeleteByUserAndSlug(_ context.Context, userSubject, slug string) error {
	for id, r := range m.reviews {
		if r.UserSubject == userSubject && r.ProgramSlug == slug {
			delete(m.reviews, id)
			return nil
		}
	}
	return ErrNotFound
}

func (m *mockRepository) ListAdmin(_ context.Context, _ AdminFilter) ([]Review, int, error) {
	var list []Review
	for _, r := range m.reviews {
		list = append(list, *r)
	}
	return list, len(list), nil
}

func (m *mockRepository) UpdateStatus(_ context.Context, id string, status Status) error {
	r, ok := m.reviews[id]
	if !ok {
		return ErrNotFound
	}
	r.Status = status
	r.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *mockRepository) GetByID(_ context.Context, id string) (*Review, error) {
	r, ok := m.reviews[id]
	if !ok {
		return nil, ErrNotFound
	}
	return r, nil
}

func (m *mockRepository) GetProgramIDBySlug(_ context.Context, slug string) (string, error) {
	id, ok := m.programs[slug]
	if !ok {
		return "", ErrProgramNotFound
	}
	return id, nil
}

func TestSubmitReview(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	// 1. Invalid rating
	_, err := svc.SubmitReview(ctx, "user-1", "Budi", "pelatihan-go", ReviewInput{
		Rating:  6,
		Title:   "Bagus",
		Content: "Materi sangat menarik dan aplikatif.",
	})
	if err != ErrInvalidRating {
		t.Fatalf("expected ErrInvalidRating, got %v", err)
	}

	// 2. Invalid content (too short)
	_, err = svc.SubmitReview(ctx, "user-1", "Budi", "pelatihan-go", ReviewInput{
		Rating:  5,
		Title:   "Bagus",
		Content: "Ok",
	})
	if err != ErrInvalidContent {
		t.Fatalf("expected ErrInvalidContent, got %v", err)
	}

	// 3. Program not found
	_, err = svc.SubmitReview(ctx, "user-1", "Budi", "unknown-program", ReviewInput{
		Rating:  5,
		Title:   "Bagus",
		Content: "Materi sangat menarik dan aplikatif.",
	})
	if err != ErrProgramNotFound {
		t.Fatalf("expected ErrProgramNotFound, got %v", err)
	}

	// 4. Valid submit
	res, err := svc.SubmitReview(ctx, "user-1", "Budi", "pelatihan-go", ReviewInput{
		Rating:  5,
		Title:   "Sangat Membantu",
		Content: "Pelatihan ini memberikan wawasan mendalam mengenai arsitektur sistem.",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Rating != 5 || res.AuthorName != "Budi" || res.Status != StatusPublished {
		t.Errorf("unexpected review state: %+v", res)
	}

	// 5. Upsert review
	res2, err := svc.SubmitReview(ctx, "user-1", "Budi", "pelatihan-go", ReviewInput{
		Rating:  4,
		Title:   "Cukup Bagus",
		Content: "Setelah diulas kembali, materi cukup padat namun membutuhkan latihan lebih.",
	})
	if err != nil {
		t.Fatalf("unexpected error on upsert: %v", err)
	}
	if res2.ID != res.ID {
		t.Errorf("expected same ID on upsert, got %s vs %s", res2.ID, res.ID)
	}
	if res2.Rating != 4 {
		t.Errorf("expected updated rating 4, got %d", res2.Rating)
	}
}

func TestGetPublicReviewsAndSummary(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	_, _ = svc.SubmitReview(ctx, "user-1", "Budi", "pelatihan-go", ReviewInput{
		Rating:  5,
		Content: "Materi sangat menarik dan aplikatif.",
	})
	_, _ = svc.SubmitReview(ctx, "user-2", "Ani", "pelatihan-go", ReviewInput{
		Rating:  4,
		Content: "Penjelasan instruktur sangat jelas dan runtut.",
	})

	result, err := svc.GetPublicReviews(ctx, "pelatihan-go", ListFilter{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Summary.TotalReviews != 2 {
		t.Errorf("expected 2 reviews, got %d", result.Summary.TotalReviews)
	}
	if result.Summary.AverageRating != 4.5 {
		t.Errorf("expected average rating 4.5, got %f", result.Summary.AverageRating)
	}
	if len(result.Reviews) != 2 {
		t.Errorf("expected 2 reviews in list, got %d", len(result.Reviews))
	}

	// Non-existent slug should return ErrProgramNotFound
	_, err = svc.GetPublicReviews(ctx, "slug-tidak-ada", ListFilter{Page: 1, PageSize: 10})
	if err != ErrProgramNotFound {
		t.Errorf("expected ErrProgramNotFound, got %v", err)
	}
}

func TestAdminModeration(t *testing.T) {
	repo := newMockRepository()
	svc := NewService(repo)
	ctx := context.Background()

	rev, _ := svc.SubmitReview(ctx, "user-1", "Budi", "pelatihan-go", ReviewInput{
		Rating:  1,
		Content: "Ulasan dengan kata-kata yang perlu dimoderasi.",
	})

	// Hide review
	err := svc.UpdateReviewStatus(ctx, rev.ID, StatusHidden)
	if err != nil {
		t.Fatalf("unexpected error updating status: %v", err)
	}

	// Should no longer appear in public reviews
	pub, err := svc.GetPublicReviews(ctx, "pelatihan-go", ListFilter{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pub.Reviews) != 0 {
		t.Errorf("expected 0 public reviews after hiding, got %d", len(pub.Reviews))
	}

	// Admin list should still see it
	adm, err := svc.ListAdminReviews(ctx, AdminFilter{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(adm.Reviews) != 1 || adm.Reviews[0].Status != StatusHidden {
		t.Errorf("unexpected admin reviews: %+v", adm.Reviews)
	}
}
