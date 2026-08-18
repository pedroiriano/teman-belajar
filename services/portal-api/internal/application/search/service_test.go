package search

import (
	"context"
	"errors"
	"testing"

	domainsearch "teman-belajar-api/internal/domain/search"
)

type providerStub struct {
	query domainsearch.Query
}

func (p *providerStub) Search(_ context.Context, query domainsearch.Query) (domainsearch.Result, error) {
	p.query = query
	return domainsearch.Result{Hits: []domainsearch.Hit{}, Total: 0}, nil
}

func TestServiceValidatesAndNormalizesTypedQuery(t *testing.T) {
	provider := &providerStub{}
	service := NewService(provider)
	_, err := service.Search(context.Background(), domainsearch.Query{
		Text: "  keamanan informasi  ", Page: 1, PageSize: 20, Sort: domainsearch.SortNewest,
	})
	if err != nil {
		t.Fatalf("Search returned error: %v", err)
	}
	if provider.query.Text != "keamanan informasi" {
		t.Fatalf("query was not trimmed: %q", provider.query.Text)
	}
}

func TestServiceRejectsUnsafeOrOutOfBoundsValues(t *testing.T) {
	tests := []struct {
		name  string
		query domainsearch.Query
	}{
		{"blank", domainsearch.Query{Text: " ", Page: 1, PageSize: 20}},
		{"too-long", domainsearch.Query{Text: string(make([]rune, 201)), Page: 1, PageSize: 20}},
		{"control", domainsearch.Query{Text: "foo\nbar", Page: 1, PageSize: 20}},
		{"page", domainsearch.Query{Text: "foo", Page: 0, PageSize: 20}},
		{"page-size", domainsearch.Query{Text: "foo", Page: 1, PageSize: 51}},
		{"content-type", domainsearch.Query{Text: "foo", ContentType: "raw", Page: 1, PageSize: 20}},
		{"sort", domainsearch.Query{Text: "foo", Page: 1, PageSize: 20, Sort: "title:asc"}},
		{"category", domainsearch.Query{Text: "foo", CategoryID: "not-a-uuid", Page: 1, PageSize: 20}},
		{"tag-filter-injection", domainsearch.Query{Text: "foo", Tag: "x' OR source_type = 'news", Page: 1, PageSize: 20}},
	}
	service := NewService(&providerStub{})
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.Search(context.Background(), tt.query)
			if !errors.Is(err, ErrInvalidQuery) {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}
}
