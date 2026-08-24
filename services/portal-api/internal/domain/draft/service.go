package draft

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

const cleanupBatch = 100

type Service struct {
	repo      Repository
	auditRepo audit.Repository
	retention time.Duration
	now       func() time.Time
}

func NewService(repo Repository, auditRepo audit.Repository, retentionDays int) *Service {
	if retentionDays < 1 || retentionDays > 365 {
		retentionDays = 30
	}
	return &Service{repo: repo, auditRepo: auditRepo, retention: time.Duration(retentionDays) * 24 * time.Hour, now: func() time.Time { return time.Now().UTC() }}
}

func (s *Service) Save(ctx context.Context, actorSubject string, input SaveInput) (*FormDraft, error) {
	if _, err := uuid.Parse(actorSubject); err != nil {
		return nil, fmt.Errorf("%w: invalid actor", ErrValidation)
	}
	if _, err := uuid.Parse(input.DraftKey); err != nil {
		return nil, fmt.Errorf("%w: invalid draft key", ErrValidation)
	}
	if input.EntityID != nil {
		if _, err := uuid.Parse(*input.EntityID); err != nil {
			return nil, fmt.Errorf("%w: invalid entity ID", ErrValidation)
		}
	}
	if input.SchemaVersion != SchemaVersion || input.ExpectedRevision < 0 {
		return nil, fmt.Errorf("%w: unsupported schema or revision", ErrValidation)
	}
	if input.ClientUpdatedAt.IsZero() || input.ClientUpdatedAt.After(s.now().Add(5*time.Minute)) {
		return nil, fmt.Errorf("%w: invalid client timestamp", ErrValidation)
	}
	payload, err := validatePayload(input)
	if err != nil {
		return nil, err
	}

	_, _ = s.repo.CleanupExpired(ctx, cleanupBatch)
	now := s.now()
	current, getErr := s.repo.Get(ctx, actorSubject, input.DraftKey)
	if getErr != nil && !errors.Is(getErr, ErrNotFound) {
		return nil, getErr
	}

	if errors.Is(getErr, ErrNotFound) {
		if input.ExpectedRevision != 0 {
			return nil, &Conflict{}
		}
		if input.EntityID != nil {
			existing, existingErr := s.repo.GetByEntity(ctx, actorSubject, input.EntityType, *input.EntityID)
			if existingErr == nil {
				return existing, &Conflict{Current: existing}
			}
			if !errors.Is(existingErr, ErrNotFound) {
				return nil, existingErr
			}
		}
		created := &FormDraft{
			ID: uuid.NewString(), ActorSubject: actorSubject, DraftKey: input.DraftKey,
			FormKey: input.FormKey, EntityType: input.EntityType, EntityID: input.EntityID,
			SchemaVersion: input.SchemaVersion, Payload: payload, BaseEntityVersion: input.BaseEntityVersion,
			Revision: 1, ClientUpdatedAt: input.ClientUpdatedAt.UTC(), ExpiresAt: now.Add(s.retention),
			CreatedAt: now, UpdatedAt: now,
		}
		if err := s.repo.Create(ctx, created); err != nil {
			return nil, err
		}
		s.audit(ctx, actorSubject, "DRAFT_CREATED", created.DraftKey, "SUCCESS")
		return created, nil
	}

	if current.FormKey != input.FormKey || current.EntityType != input.EntityType || !sameOptionalString(current.EntityID, input.EntityID) {
		return current, ErrIdentityLocked
	}
	if current.Revision != input.ExpectedRevision {
		s.audit(ctx, actorSubject, "DRAFT_CONFLICT", current.DraftKey, "CONFLICT")
		return current, &Conflict{Current: current}
	}
	current.Payload = payload
	current.BaseEntityVersion = input.BaseEntityVersion
	current.SchemaVersion = input.SchemaVersion
	current.ClientUpdatedAt = input.ClientUpdatedAt.UTC()
	current.ExpiresAt = now.Add(s.retention)
	current.UpdatedAt = now
	current.Revision++
	if err := s.repo.Update(ctx, current, input.ExpectedRevision); err != nil {
		if errors.Is(err, ErrConflict) {
			latest, _ := s.repo.Get(ctx, actorSubject, input.DraftKey)
			s.audit(ctx, actorSubject, "DRAFT_CONFLICT", input.DraftKey, "CONFLICT")
			return latest, &Conflict{Current: latest}
		}
		return nil, err
	}
	return current, nil
}

func (s *Service) Get(ctx context.Context, actorSubject, draftKey string) (*FormDraft, error) {
	if _, err := uuid.Parse(draftKey); err != nil {
		return nil, ErrNotFound
	}
	return s.repo.Get(ctx, actorSubject, draftKey)
}

func (s *Service) List(ctx context.Context, actorSubject string, filter ListFilter) ([]FormDraft, error) {
	if _, ok := formDefinitions[filter.FormKey]; !ok {
		return nil, ErrUnsupported
	}
	return s.repo.List(ctx, actorSubject, filter)
}

func (s *Service) RecordRecovery(ctx context.Context, actorSubject, draftKey string) error {
	if _, err := s.repo.Get(ctx, actorSubject, draftKey); err != nil {
		return err
	}
	s.audit(ctx, actorSubject, "DRAFT_RECOVERED", draftKey, "SUCCESS")
	return nil
}

func (s *Service) Delete(ctx context.Context, actorSubject, draftKey string, reason DeleteReason) error {
	if reason != DeleteDiscarded && reason != DeleteFinalized {
		return fmt.Errorf("%w: invalid delete reason", ErrValidation)
	}
	if err := s.repo.Delete(ctx, actorSubject, draftKey); err != nil {
		return err
	}
	action := "DRAFT_DISCARDED"
	if reason == DeleteFinalized {
		action = "DRAFT_FINALIZED"
	}
	s.audit(ctx, actorSubject, action, draftKey, "SUCCESS")
	return nil
}

func (s *Service) audit(ctx context.Context, actor, action, target, result string) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, TargetType: "form_draft", TargetID: target, Result: result, OccurredAt: s.now()})
}

func sameOptionalString(left, right *string) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return *left == *right
}
