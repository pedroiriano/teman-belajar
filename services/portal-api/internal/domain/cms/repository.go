package cms

import "context"

type Repository interface {
	// News
	CreateNews(ctx context.Context, news *News) error
	GetNewsByID(ctx context.Context, id string) (*News, error)
	GetNewsBySlug(ctx context.Context, slug string) (*News, error)
	UpdateNews(ctx context.Context, news *News, expectedVersion int64) error
	ListPublicNews(ctx context.Context, page, pageSize int) ([]News, int, error)
	ListAdminNews(ctx context.Context, page, pageSize int) ([]News, int, error)

	// Announcements
	CreateAnnouncement(ctx context.Context, ann *Announcement) error
	GetAnnouncementByID(ctx context.Context, id string) (*Announcement, error)
	GetAnnouncementBySlug(ctx context.Context, slug string) (*Announcement, error)
	UpdateAnnouncement(ctx context.Context, ann *Announcement, expectedVersion int64) error
	ListActiveAnnouncements(ctx context.Context) ([]Announcement, error)
	ListAdminAnnouncements(ctx context.Context, page, pageSize int) ([]Announcement, int, error)

	// Revisions
	CreateNewsRevision(ctx context.Context, rev *NewsRevision) error
	ListNewsRevisions(ctx context.Context, newsID string) ([]NewsRevision, error)
	CreateAnnouncementRevision(ctx context.Context, rev *AnnouncementRevision) error
	ListAnnouncementRevisions(ctx context.Context, announcementID string) ([]AnnouncementRevision, error)
}
