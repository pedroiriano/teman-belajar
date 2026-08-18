package searchindex

import (
	"context"
	"errors"
	"reflect"
	"testing"

	domainsearch "teman-belajar-api/internal/domain/search"
)

type sourceStub struct {
	typeName  string
	documents []domainsearch.IndexDocument
	err       error
}

func (s sourceStub) Type() string { return s.typeName }
func (s sourceStub) Fetch(context.Context) ([]domainsearch.IndexDocument, error) {
	return append([]domainsearch.IndexDocument(nil), s.documents...), s.err
}

type memoryIndex struct {
	documents map[string][]domainsearch.IndexDocument
	calls     map[string]int
}

func newMemoryIndex() *memoryIndex {
	return &memoryIndex{documents: map[string][]domainsearch.IndexDocument{}, calls: map[string]int{}}
}
func (*memoryIndex) Configure(context.Context) error { return nil }
func (i *memoryIndex) ReplaceSource(_ context.Context, sourceType string, documents []domainsearch.IndexDocument) error {
	i.calls[sourceType]++
	i.documents[sourceType] = append([]domainsearch.IndexDocument(nil), documents...)
	return nil
}

func TestSyncPreservesFailedSourceAndReconcilesSuccessfulSources(t *testing.T) {
	index := newMemoryIndex()
	index.documents["course"] = []domainsearch.IndexDocument{{DocumentID: "course_7"}}
	syncer := NewSyncer(index,
		sourceStub{typeName: "news", documents: []domainsearch.IndexDocument{{DocumentID: "news_1"}}},
		sourceStub{typeName: "course", err: errors.New("Moodle unavailable")},
	)
	report := syncer.Sync(context.Background())
	if report["course"].Error == nil {
		t.Fatal("expected course failure")
	}
	if index.calls["course"] != 0 {
		t.Fatal("failed source must not be reconciled")
	}
	if got := index.documents["course"][0].DocumentID; got != "course_7" {
		t.Fatalf("old course document was not preserved: %s", got)
	}
	if got := index.documents["news"][0].DocumentID; got != "news_1" {
		t.Fatalf("news was not reconciled: %s", got)
	}
}

func TestSyncIsIdempotentAndRemovesStaleDocuments(t *testing.T) {
	index := newMemoryIndex()
	source := sourceStub{typeName: "news", documents: []domainsearch.IndexDocument{{DocumentID: "news_1"}, {DocumentID: "news_2"}}}
	syncer := NewSyncer(index, source)
	syncer.Sync(context.Background())
	firstIDs := []string{index.documents["news"][0].DocumentID, index.documents["news"][1].DocumentID}
	syncer.Sync(context.Background())
	secondIDs := []string{index.documents["news"][0].DocumentID, index.documents["news"][1].DocumentID}
	if !reflect.DeepEqual(firstIDs, secondIDs) || len(secondIDs) != 2 {
		t.Fatalf("reindex changed stable IDs or count: %v -> %v", firstIDs, secondIDs)
	}

	source.documents = source.documents[:1]
	NewSyncer(index, source).Sync(context.Background())
	if got := len(index.documents["news"]); got != 1 {
		t.Fatalf("stale document was not removed, count=%d", got)
	}
}
