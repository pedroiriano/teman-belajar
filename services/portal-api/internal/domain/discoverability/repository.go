package discoverability

import "context"

type Repository interface {
	CreateTerm(ctx context.Context, input CreateTermInput, actorID string) (*Term, error)
	ListTerms(ctx context.Context, kind TermKind, includeArchived bool) ([]Term, error)
	ArchiveTerm(ctx context.Context, kind TermKind, id, actorID string) error
	GetProfile(ctx context.Context, contentType ContentType, contentID string) (*ContentRecord, *Profile, error)
	SaveProfile(ctx context.Context, contentType ContentType, contentID string, input ProfileInput, actorID string) (*ContentRecord, *Profile, error)
	ResolveRedirect(ctx context.Context, contentType ContentType, oldSlug string) (*Redirect, error)
	ListSitemap(ctx context.Context) ([]SitemapEntry, error)
	GetLanding(ctx context.Context, kind TermKind, slug string) (*Landing, error)
}
