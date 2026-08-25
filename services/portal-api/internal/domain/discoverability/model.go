package discoverability

import "time"

type ContentType string

const (
	ContentNews         ContentType = "news"
	ContentAnnouncement ContentType = "announcement"
	ContentKnowledge    ContentType = "knowledge"
)

type TermKind string

const (
	KindCategory TermKind = "category"
	KindTag      TermKind = "tag"
)

type Term struct {
	ID             string    `json:"id"`
	Kind           TermKind  `json:"kind"`
	Domain         string    `json:"domain,omitempty"`
	Slug           string    `json:"slug"`
	Name           string    `json:"name"`
	NormalizedName string    `json:"normalized_name,omitempty"`
	Description    string    `json:"description,omitempty"`
	Status         string    `json:"status"`
	UsageCount     int       `json:"usage_count"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateTermInput struct {
	Kind        TermKind `json:"kind"`
	Domain      string   `json:"domain,omitempty"`
	Slug        string   `json:"slug"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
}

type ProfileInput struct {
	Slug              string   `json:"slug"`
	CategoryID        *string  `json:"category_id"`
	TagIDs            []string `json:"tag_ids"`
	SEOTitle          string   `json:"seo_title"`
	MetaDescription   string   `json:"meta_description"`
	SocialTitle       string   `json:"social_title"`
	SocialDescription string   `json:"social_description"`
	SocialMediaID     *string  `json:"social_media_id"`
	Indexable         bool     `json:"indexable"`
	CanonicalPath     *string  `json:"canonical_path"`
}

type Profile struct {
	ProfileInput
	ContentType    ContentType `json:"content_type"`
	ContentID      string      `json:"content_id"`
	Category       *Term       `json:"category,omitempty"`
	Tags           []Term      `json:"tags"`
	SocialImageAlt string      `json:"social_image_alt"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type ContentRecord struct {
	ID               string
	ContentType      ContentType
	Slug             string
	Title            string
	Summary          string
	Status           string
	PublishedAt      *time.Time
	UpdatedAt        time.Time
	FeaturedMediaID  *string
	FeaturedMediaAlt string
}

type Metadata struct {
	ContentType       ContentType `json:"content_type"`
	ContentID         string      `json:"content_id"`
	Slug              string      `json:"slug"`
	Title             string      `json:"title"`
	Description       string      `json:"description"`
	CanonicalPath     string      `json:"canonical_path"`
	Indexable         bool        `json:"indexable"`
	OpenGraphTitle    string      `json:"open_graph_title"`
	OpenGraphSummary  string      `json:"open_graph_description"`
	OpenGraphImageURL string      `json:"open_graph_image_url,omitempty"`
	OpenGraphImageAlt string      `json:"open_graph_image_alt,omitempty"`
	Category          *Term       `json:"category,omitempty"`
	Tags              []Term      `json:"tags"`
	PublishedAt       *time.Time  `json:"published_at,omitempty"`
	UpdatedAt         time.Time   `json:"updated_at"`
	Health            []Health    `json:"health"`
}

type Health struct {
	Code    string `json:"code"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

type Redirect struct {
	Location string `json:"location"`
	Status   int    `json:"status"`
}

type SitemapEntry struct {
	URL          string    `json:"url"`
	LastModified time.Time `json:"last_modified"`
}

type Landing struct {
	Term      Term             `json:"term"`
	Indexable bool             `json:"indexable"`
	Items     []LandingContent `json:"items"`
}

type LandingContent struct {
	ContentType ContentType `json:"content_type"`
	Slug        string      `json:"slug"`
	Title       string      `json:"title"`
	Summary     string      `json:"summary"`
	URL         string      `json:"url"`
	UpdatedAt   time.Time   `json:"updated_at"`
}
