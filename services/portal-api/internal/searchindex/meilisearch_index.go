package searchindex

import (
	"context"
	"fmt"
	"time"

	"github.com/meilisearch/meilisearch-go"

	domainsearch "teman-belajar-api/internal/domain/search"
)

type MeilisearchIndex struct {
	client meilisearch.ServiceManager
	index  meilisearch.IndexManager
	uid    string
}

func NewMeilisearchIndex(url, apiKey, uid string) *MeilisearchIndex {
	client := meilisearch.New(url, meilisearch.WithAPIKey(apiKey))
	return &MeilisearchIndex{client: client, index: client.Index(uid), uid: uid}
}

func (m *MeilisearchIndex) Configure(ctx context.Context) error {
	if _, err := m.client.GetIndexWithContext(ctx, m.uid); err != nil {
		task, createErr := m.client.CreateIndexWithContext(ctx, &meilisearch.IndexConfig{Uid: m.uid, PrimaryKey: "document_id"})
		if createErr != nil {
			return fmt.Errorf("create search index: %w", createErr)
		}
		if err := m.wait(ctx, task); err != nil {
			return err
		}
	}

	searchable := []string{"title", "summary", "body_text", "category_name", "tags"}
	filterable := []interface{}{"source_type", "category_id", "tags", "generation"}
	sortable := []string{"published_at", "updated_at"}
	settings := []struct {
		name string
		task *meilisearch.TaskInfo
		err  error
	}{
		func() struct {
			name string
			task *meilisearch.TaskInfo
			err  error
		} {
			t, e := m.index.UpdateSearchableAttributesWithContext(ctx, &searchable)
			return struct {
				name string
				task *meilisearch.TaskInfo
				err  error
			}{"searchable attributes", t, e}
		}(),
		func() struct {
			name string
			task *meilisearch.TaskInfo
			err  error
		} {
			t, e := m.index.UpdateFilterableAttributesWithContext(ctx, &filterable)
			return struct {
				name string
				task *meilisearch.TaskInfo
				err  error
			}{"filterable attributes", t, e}
		}(),
		func() struct {
			name string
			task *meilisearch.TaskInfo
			err  error
		} {
			t, e := m.index.UpdateSortableAttributesWithContext(ctx, &sortable)
			return struct {
				name string
				task *meilisearch.TaskInfo
				err  error
			}{"sortable attributes", t, e}
		}(),
	}
	for _, setting := range settings {
		if setting.err != nil {
			return fmt.Errorf("update %s: %w", setting.name, setting.err)
		}
		if err := m.wait(ctx, setting.task); err != nil {
			return fmt.Errorf("update %s: %w", setting.name, err)
		}
	}
	return nil
}

func (m *MeilisearchIndex) ReplaceSource(ctx context.Context, sourceType string, documents []domainsearch.IndexDocument) error {
	currentIDs, err := m.sourceDocumentIDs(ctx, sourceType)
	if err != nil {
		return err
	}

	desired := make(map[string]struct{}, len(documents))
	for _, document := range documents {
		desired[document.DocumentID] = struct{}{}
	}
	if len(documents) > 0 {
		task, err := m.index.AddDocumentsWithContext(ctx, documents, &meilisearch.DocumentOptions{PrimaryKey: meilisearch.StringPtr("document_id")})
		if err != nil {
			return fmt.Errorf("upsert %s documents: %w", sourceType, err)
		}
		if err := m.wait(ctx, task); err != nil {
			return fmt.Errorf("upsert %s documents: %w", sourceType, err)
		}
	}

	stale := make([]string, 0)
	for _, id := range currentIDs {
		if _, exists := desired[id]; !exists {
			stale = append(stale, id)
		}
	}
	if len(stale) > 0 {
		task, err := m.index.DeleteDocumentsWithContext(ctx, stale, nil)
		if err != nil {
			return fmt.Errorf("delete stale %s documents: %w", sourceType, err)
		}
		if err := m.wait(ctx, task); err != nil {
			return fmt.Errorf("delete stale %s documents: %w", sourceType, err)
		}
	}
	return nil
}

func (m *MeilisearchIndex) sourceDocumentIDs(ctx context.Context, sourceType string) ([]string, error) {
	const batchSize = int64(1000)
	ids := make([]string, 0)
	for offset := int64(0); ; offset += batchSize {
		var response meilisearch.DocumentsResult
		err := m.index.GetDocumentsWithContext(ctx, &meilisearch.DocumentsQuery{
			Offset: offset, Limit: batchSize, Fields: []string{"document_id"}, Filter: fmt.Sprintf("source_type = %q", sourceType),
		}, &response)
		if err != nil {
			return nil, fmt.Errorf("list existing %s documents: %w", sourceType, err)
		}
		for _, raw := range response.Results {
			var value struct {
				DocumentID string `json:"document_id"`
			}
			if err := raw.DecodeInto(&value); err != nil {
				return nil, fmt.Errorf("decode existing %s document: %w", sourceType, err)
			}
			ids = append(ids, value.DocumentID)
		}
		if int64(len(response.Results)) < batchSize {
			break
		}
	}
	return ids, nil
}

func (m *MeilisearchIndex) wait(ctx context.Context, taskInfo *meilisearch.TaskInfo) error {
	if taskInfo == nil {
		return fmt.Errorf("search engine returned an empty task")
	}
	task, err := m.client.WaitForTaskWithContext(ctx, taskInfo.TaskUID, 50*time.Millisecond)
	if err != nil {
		return fmt.Errorf("wait for search task %d: %w", taskInfo.TaskUID, err)
	}
	if task.Status != meilisearch.TaskStatusSucceeded {
		return fmt.Errorf("search task %d ended with status %s", taskInfo.TaskUID, task.Status)
	}
	return nil
}
