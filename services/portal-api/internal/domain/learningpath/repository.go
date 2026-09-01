package learningpath

import "context"

type Repository interface {
	Create(context.Context, *Path, string) error
	SaveDraft(context.Context, *Path, int64, string) error
	SaveStatus(context.Context, *Path, int64, string) error
	CreateRevision(context.Context, *Path, int64, string) error
	GetAdminByID(context.Context, string) (*Path, error)
	GetPublicBySlug(context.Context, string) (*Path, error)
	List(context.Context, Filter, bool) ([]Path, int, error)
	BindLearnerVersion(context.Context, string, string) (*Path, error)
}

type SourcePort interface {
	Resolve(context.Context, ItemKind, string, string) (ResolvedSource, error)
	Progress(context.Context, []Item, string) (map[string]ItemProgress, map[string]string)
	Options(context.Context, string) (Options, error)
}
