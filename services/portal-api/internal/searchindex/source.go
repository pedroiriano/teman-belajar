package searchindex

import (
	"context"
	"html"
	"regexp"
	"strings"

	domainsearch "teman-belajar-api/internal/domain/search"
)

var htmlTag = regexp.MustCompile(`<[^>]*>`)

type Source interface {
	Type() string
	Fetch(ctx context.Context) ([]domainsearch.IndexDocument, error)
}

type Index interface {
	Configure(ctx context.Context) error
	ReplaceSource(ctx context.Context, sourceType string, documents []domainsearch.IndexDocument) error
}

func plainText(value string) string {
	withoutTags := htmlTag.ReplaceAllString(value, " ")
	return strings.Join(strings.Fields(html.UnescapeString(withoutTags)), " ")
}
