package auditcenter

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/audit"
)

const (
	DefaultPageSize = 25
	MaxPageSize     = 100
	MaxExportRows   = 10000
	RetentionDays   = 365
	retentionBatch  = 5000
)

var (
	ErrInvalidQuery   = errors.New("invalid audit query")
	ErrInvalidCursor  = errors.New("invalid audit cursor")
	ErrExportRange    = errors.New("export requires a valid UTC date range of at most 31 days")
	ErrExportTooLarge = errors.New("audit export exceeds 10000 rows")
)

type Service struct {
	repository audit.CenterRepository
	now        func() time.Time
}

func NewService(repository audit.CenterRepository) *Service {
	return &Service{repository: repository, now: func() time.Time { return time.Now().UTC() }}
}

func (service *Service) List(ctx context.Context, query audit.Query, cursor string) (audit.Page, error) {
	if err := validateQuery(&query, false); err != nil {
		return audit.Page{}, err
	}
	if cursor != "" {
		occurredAt, id, err := decodeCursor(cursor)
		if err != nil {
			return audit.Page{}, ErrInvalidCursor
		}
		query.BeforeOccurred, query.BeforeID = occurredAt, id
	}
	query.Limit++
	items, err := service.repository.ListEvents(ctx, query)
	if err != nil {
		return audit.Page{}, err
	}
	page := audit.Page{Items: sanitize(items)}
	if len(page.Items) >= query.Limit {
		last := page.Items[query.Limit-2]
		page.Items = page.Items[:query.Limit-1]
		page.NextCursor = encodeCursor(last.OccurredAt, last.ID)
	}
	return page, nil
}

func (service *Service) Detail(ctx context.Context, id string) (audit.AuditEvent, error) {
	if !uuidLike(id) {
		return audit.AuditEvent{}, ErrInvalidQuery
	}
	event, err := service.repository.GetEvent(ctx, id)
	if err != nil {
		return audit.AuditEvent{}, err
	}
	return audit.SanitizeEvent(event), nil
}

func (service *Service) Export(ctx context.Context, query audit.Query) ([]audit.AuditEvent, error) {
	if err := validateQuery(&query, true); err != nil {
		return nil, err
	}
	query.Limit = MaxExportRows + 1
	items, err := service.repository.ListEvents(ctx, query)
	if err != nil {
		return nil, err
	}
	if len(items) > MaxExportRows {
		return nil, ErrExportTooLarge
	}
	return sanitize(items), nil
}

func (service *Service) PurgeExpired(ctx context.Context) (int64, error) {
	cutoff := service.now().AddDate(0, 0, -RetentionDays)
	return service.repository.DeleteBefore(ctx, cutoff, retentionBatch)
}

func validateQuery(query *audit.Query, export bool) error {
	query.ActorUserID = strings.TrimSpace(query.ActorUserID)
	query.Action = strings.TrimSpace(query.Action)
	query.Module = strings.TrimSpace(query.Module)
	query.TargetType = strings.TrimSpace(query.TargetType)
	query.TargetID = strings.TrimSpace(query.TargetID)
	query.Result = strings.TrimSpace(query.Result)
	query.TraceID = strings.TrimSpace(query.TraceID)
	if len(query.ActorUserID) > 64 || len(query.Action) > 100 || len(query.Module) > 100 || len(query.TargetType) > 100 || len(query.TargetID) > 255 || len(query.Result) > 50 || len(query.TraceID) > 64 {
		return ErrInvalidQuery
	}
	for _, value := range []string{query.Action, query.Module, query.TargetType, query.TargetID, query.Result} {
		if !audit.SafeFilterValue(value) {
			return ErrInvalidQuery
		}
	}
	if !audit.ValidCorrelationID(query.TraceID) {
		return ErrInvalidQuery
	}
	if query.ActorUserID != "" && !uuidLike(query.ActorUserID) {
		return ErrInvalidQuery
	}
	if query.OccurredFrom.IsZero() != query.OccurredTo.IsZero() || (!query.OccurredFrom.IsZero() && !query.OccurredFrom.Before(query.OccurredTo)) {
		return ErrInvalidQuery
	}
	if export {
		if query.OccurredFrom.IsZero() || query.OccurredTo.Sub(query.OccurredFrom) > 31*24*time.Hour {
			return ErrExportRange
		}
		return nil
	}
	if query.Limit == 0 {
		query.Limit = DefaultPageSize
	}
	if query.Limit < 1 || query.Limit > MaxPageSize {
		return ErrInvalidQuery
	}
	return nil
}

func sanitize(items []audit.AuditEvent) []audit.AuditEvent {
	result := make([]audit.AuditEvent, len(items))
	for index, item := range items {
		result[index] = audit.SanitizeEvent(item)
	}
	return result
}

func encodeCursor(occurredAt time.Time, id string) string {
	value := occurredAt.UTC().Format(time.RFC3339Nano) + "|" + id
	return base64.RawURLEncoding.EncodeToString([]byte(value))
}

func decodeCursor(cursor string) (time.Time, string, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil || len(decoded) > 128 {
		return time.Time{}, "", ErrInvalidCursor
	}
	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 || !uuidLike(parts[1]) {
		return time.Time{}, "", ErrInvalidCursor
	}
	occurredAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", ErrInvalidCursor
	}
	return occurredAt.UTC(), parts[1], nil
}

func uuidLike(value string) bool {
	if len(value) != 36 {
		return false
	}
	for index, character := range value {
		if index == 8 || index == 13 || index == 18 || index == 23 {
			if character != '-' {
				return false
			}
			continue
		}
		if !strings.ContainsRune("0123456789abcdefABCDEF", character) {
			return false
		}
	}
	return true
}

func CountFilters(query audit.Query) string {
	count := 0
	for _, value := range []string{query.ActorUserID, query.Action, query.Module, query.TargetType, query.TargetID, query.Result, query.TraceID} {
		if value != "" {
			count++
		}
	}
	if !query.OccurredFrom.IsZero() {
		count++
	}
	return fmt.Sprintf("%d", count)
}
