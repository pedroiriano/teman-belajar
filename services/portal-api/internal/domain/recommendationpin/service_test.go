package recommendationpin

import (
	"context"
	"testing"
)

type mockRepo struct {
	pins []RecommendationPin
}

func (m *mockRepo) List(ctx context.Context, targetType string, limit int) ([]RecommendationPin, error) {
	var result []RecommendationPin
	for _, p := range m.pins {
		if targetType == "" || p.TargetType == targetType {
			result = append(result, p)
		}
	}
	return result, nil
}

func (m *mockRepo) Create(ctx context.Context, pin RecommendationPin) (*RecommendationPin, error) {
	pin.ID = "pin-1"
	m.pins = append(m.pins, pin)
	return &pin, nil
}

func (m *mockRepo) Delete(ctx context.Context, id string) error {
	var remaining []RecommendationPin
	for _, p := range m.pins {
		if p.ID != id {
			remaining = append(remaining, p)
		}
	}
	m.pins = remaining
	return nil
}

func TestRecommendationPinService(t *testing.T) {
	repo := &mockRepo{}
	svc := NewService(repo)
	ctx := context.Background()

	// Test validation
	_, err := svc.Create(ctx, CreatePinInput{}, "admin-1")
	if err == nil {
		t.Fatal("expected error on empty input")
	}

	// Test create
	pin, err := svc.Create(ctx, CreatePinInput{
		TargetType: "knowledge",
		TargetID:   "art-123",
		Title:      "Pengantar Keamanan Informasi",
		Weight:     150,
	}, "admin-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pin.Title != "Pengantar Keamanan Informasi" || pin.Weight != 150 {
		t.Fatalf("unexpected pin: %+v", pin)
	}

	// Test list
	pins, err := svc.List(ctx, "knowledge", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pins) != 1 {
		t.Fatalf("expected 1 pin, got %d", len(pins))
	}

	// Test delete
	if err := svc.Delete(ctx, pin.ID); err != nil {
		t.Fatalf("unexpected error on delete: %v", err)
	}
	pins, _ = svc.List(ctx, "knowledge", 10)
	if len(pins) != 0 {
		t.Fatalf("expected 0 pins after delete, got %d", len(pins))
	}
}
