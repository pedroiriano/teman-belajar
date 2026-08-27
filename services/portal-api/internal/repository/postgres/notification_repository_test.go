package postgres

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	domain "teman-belajar-api/internal/domain/notification"
)

func requireNotificationMigration(t *testing.T, db *sql.DB) {
	t.Helper()
	var table sql.NullString
	if err := db.QueryRow(`SELECT to_regclass('notification.inbox')::TEXT`).Scan(&table); err != nil {
		t.Fatal(err)
	}
	if !table.Valid {
		t.Skip("notification migration is not applied to the integration database")
	}
}

func TestNotificationRepositoryIdempotencyIsolationReadAndPreference(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	requireNotificationMigration(t, db)
	repo := NewNotificationRepository(db)
	ctx := context.Background()
	user := uuid.NewString()
	other := uuid.NewString()
	eventID := "notification-repository-test-" + uuid.NewString()
	now := time.Now().UTC()
	input := domain.Delivery{EventID: eventID, SchemaVersion: domain.EventSchemaVersion, Source: "notification.test", UserSubject: user, Audience: domain.AudiencePortal, EventType: domain.EventSystemNotice, Title: "Uji notifikasi", Body: "Bukti integrasi.", DeepLink: "/my-learning", Priority: domain.PriorityNormal, AvailableAt: now}
	item := domain.Notification{ID: uuid.NewString(), Audience: input.Audience, EventType: input.EventType, Title: input.Title, Body: input.Body, DeepLink: input.DeepLink, Priority: input.Priority, AvailableAt: now, ExpiresAt: now.Add(24 * time.Hour), CreatedAt: now}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM notification.inbox WHERE user_subject IN ($1,$2)`, user, other)
		_, _ = db.Exec(`DELETE FROM notification.preferences WHERE user_subject IN ($1,$2)`, user, other)
	})

	first, err := repo.Deliver(ctx, input, item)
	if err != nil || !first.Created {
		t.Fatalf("first=%#v err=%v", first, err)
	}
	duplicate, err := repo.Deliver(ctx, input, domain.Notification{ID: uuid.NewString(), Audience: item.Audience, EventType: item.EventType, Title: item.Title, Body: item.Body, DeepLink: item.DeepLink, Priority: item.Priority, AvailableAt: now, ExpiresAt: now.Add(24 * time.Hour), CreatedAt: now})
	if err != nil || duplicate.Created || duplicate.Notification == nil || duplicate.Notification.ID != item.ID {
		t.Fatalf("duplicate=%#v err=%v", duplicate, err)
	}
	if _, err := repo.MarkRead(ctx, other, domain.AudiencePortal, item.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-user read=%v", err)
	}
	if _, err := repo.MarkRead(ctx, user, domain.AudienceAdmin, item.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-audience read=%v", err)
	}
	if _, err := repo.MarkRead(ctx, user, domain.AudiencePortal, item.ID); err != nil {
		t.Fatal(err)
	}
	if count, err := repo.UnreadCount(ctx, user, domain.AudiencePortal); err != nil || count != 0 {
		t.Fatalf("unread=%d err=%v", count, err)
	}
	futureInput := input
	futureInput.EventID += "-future"
	futureInput.AvailableAt = now.Add(time.Hour)
	futureItem := domain.Notification{ID: uuid.NewString(), Audience: item.Audience, EventType: item.EventType, Title: item.Title, Body: item.Body, DeepLink: item.DeepLink, Priority: item.Priority, AvailableAt: futureInput.AvailableAt, ExpiresAt: futureInput.AvailableAt.Add(24 * time.Hour), CreatedAt: now}
	if delivered, err := repo.Deliver(ctx, futureInput, futureItem); err != nil || !delivered.Created {
		t.Fatalf("future delivery=%#v err=%v", delivered, err)
	}
	if cancelled, err := repo.CancelPending(ctx, user, domain.AudiencePortal, []string{futureInput.EventID}, now); err != nil || cancelled != 1 {
		t.Fatalf("cancelled=%d err=%v", cancelled, err)
	}

	if _, err := repo.SetPreference(ctx, user, domain.AudiencePortal, domain.EventSystemNotice, false); err != nil {
		t.Fatal(err)
	}
	suppressedInput := input
	suppressedInput.EventID += "-suppressed"
	suppressed, err := repo.Deliver(ctx, suppressedInput, domain.Notification{ID: uuid.NewString(), Audience: item.Audience, EventType: item.EventType, Title: item.Title, Body: item.Body, DeepLink: item.DeepLink, Priority: item.Priority, AvailableAt: now, ExpiresAt: now.Add(24 * time.Hour), CreatedAt: now})
	if err != nil || !suppressed.Suppressed {
		t.Fatalf("suppressed=%#v err=%v", suppressed, err)
	}
}
