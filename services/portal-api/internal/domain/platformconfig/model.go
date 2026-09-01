package platformconfig

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

var (
	ErrInvalidConfig   = errors.New("invalid platform configuration")
	ErrVersionConflict = errors.New("platform configuration version conflict")
	ErrNoDraft         = errors.New("platform configuration draft not found")
	ErrVersionNotFound = errors.New("platform configuration version not found")
)

const MaxPayloadBytes = 64 * 1024

type Config struct {
	Identity   IdentityConfig        `json:"identity"`
	Homepage   HomepageConfig        `json:"homepage"`
	Navigation []NavigationItem      `json:"navigation"`
	Banner     BannerConfig          `json:"banner"`
	Footer     FooterConfig          `json:"footer"`
	Contact    ContactConfig         `json:"contact"`
	SEO        SEOConfig             `json:"seo"`
	Features   []FeaturePresentation `json:"features"`
}

type IdentityConfig struct {
	Tagline     string `json:"tagline"`
	LogoMediaID string `json:"logo_media_id,omitempty"`
}

type HomepageConfig struct {
	Sections []HomepageSection `json:"sections"`
}
type HomepageSection struct {
	Key     string `json:"key"`
	Visible bool   `json:"visible"`
	Order   int    `json:"order"`
}
type NavigationItem struct {
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
	Href        string `json:"href"`
	Visible     bool   `json:"visible"`
}
type BannerConfig struct {
	Enabled bool   `json:"enabled"`
	Title   string `json:"title"`
	Body    string `json:"body"`
	Href    string `json:"href,omitempty"`
	MediaID string `json:"media_id,omitempty"`
}
type FooterConfig struct {
	Summary string           `json:"summary"`
	Links   []NavigationItem `json:"links"`
}
type ContactConfig struct {
	HelpLabel string `json:"help_label"`
	HelpHref  string `json:"help_href"`
	Email     string `json:"email,omitempty"`
}
type SEOConfig struct {
	DefaultTitle       string `json:"default_title"`
	DefaultDescription string `json:"default_description"`
	SocialMediaID      string `json:"social_media_id,omitempty"`
}
type FeaturePresentation struct {
	Key     string `json:"key"`
	Label   string `json:"label"`
	Visible bool   `json:"visible"`
}

type Revision struct {
	ID             string     `json:"id"`
	Version        int64      `json:"version"`
	Status         string     `json:"status"`
	Config         Config     `json:"config"`
	BasedOnVersion *int64     `json:"based_on_version,omitempty"`
	CreatedBy      string     `json:"created_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	PublishedAt    *time.Time `json:"published_at,omitempty"`
}

type State struct {
	HeadVersion int64      `json:"head_version"`
	Draft       *Revision  `json:"draft,omitempty"`
	Published   *Revision  `json:"published,omitempty"`
	Versions    []Revision `json:"versions,omitempty"`
}

type PublicSnapshot struct {
	Version int64  `json:"version"`
	Source  string `json:"source"`
	Config  Config `json:"config"`
}

type Repository interface {
	GetState(ctx context.Context, includeHistory bool) (State, error)
	GetPublished(ctx context.Context) (*Revision, error)
	SaveDraft(ctx context.Context, expectedVersion int64, config Config, actor string) (*Revision, error)
	Publish(ctx context.Context, version int64, actor string) (*Revision, error)
	Rollback(ctx context.Context, sourceVersion, expectedVersion int64, actor string) (*Revision, error)
}

func Decode(reader io.Reader) (Config, error) {
	limited := io.LimitReader(reader, MaxPayloadBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil || len(data) == 0 || len(data) > MaxPayloadBytes {
		return Config{}, ErrInvalidConfig
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var config Config
	if err := decoder.Decode(&config); err != nil {
		return Config{}, ErrInvalidConfig
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return Config{}, ErrInvalidConfig
	}
	return config, nil
}

var forbiddenValue = regexp.MustCompile(`(?i)(authorization\s*:|bearer\s+|client[_-]?secret|api[_-]?key|database[_-]?url|postgres(?:ql)?://|mysql://|password\s*=|token\s*=|private\s+key)`)
var emailPattern = regexp.MustCompile(`^[A-Za-z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$`)

func Validate(config Config, externalHosts []string) error {
	serialized, err := json.Marshal(config)
	if err != nil || len(serialized) > MaxPayloadBytes || forbiddenValue.Match(serialized) {
		return ErrInvalidConfig
	}
	if !validText(config.Identity.Tagline, 120, true) || !validText(config.Banner.Title, 120, true) || !validText(config.Banner.Body, 400, true) ||
		!validText(config.Footer.Summary, 400, false) || !validText(config.Contact.HelpLabel, 80, false) ||
		!validText(config.SEO.DefaultTitle, 70, false) || !validText(config.SEO.DefaultDescription, 180, false) {
		return ErrInvalidConfig
	}
	mediaIDs := MediaIDs(config)
	for _, id := range mediaIDs {
		if _, err := uuid.Parse(id); err != nil {
			return ErrInvalidConfig
		}
	}
	allowedSections := map[string]bool{"hero": true, "trust": true, "learning_paths": true, "topics": true, "knowledge": true, "media": true, "stats": true, "faq": true, "cta": true}
	if len(config.Homepage.Sections) == 0 || len(config.Homepage.Sections) > len(allowedSections) {
		return ErrInvalidConfig
	}
	seenSections, seenOrders := map[string]bool{}, map[int]bool{}
	for _, section := range config.Homepage.Sections {
		if !allowedSections[section.Key] || seenSections[section.Key] || seenOrders[section.Order] || section.Order < 1 || section.Order > len(allowedSections) {
			return ErrInvalidConfig
		}
		seenSections[section.Key], seenOrders[section.Order] = true, true
	}
	hosts := map[string]bool{}
	for _, host := range externalHosts {
		host = strings.ToLower(strings.TrimSpace(host))
		if host != "" {
			hosts[host] = true
		}
	}
	if len(config.Navigation) > 20 || len(config.Footer.Links) > 12 {
		return ErrInvalidConfig
	}
	for _, item := range append(append([]NavigationItem{}, config.Navigation...), config.Footer.Links...) {
		if !validText(item.Label, 80, false) || !validText(item.Description, 180, true) || !validateHref(item.Href, hosts) {
			return ErrInvalidConfig
		}
	}
	if config.Banner.Enabled && (!validText(config.Banner.Title, 120, false) || !validateHref(config.Banner.Href, hosts)) {
		return ErrInvalidConfig
	}
	if config.Banner.Href != "" && !validateHref(config.Banner.Href, hosts) {
		return ErrInvalidConfig
	}
	if !validateHref(config.Contact.HelpHref, hosts) {
		return ErrInvalidConfig
	}
	if config.Contact.Email != "" && (len(config.Contact.Email) > 254 || !emailPattern.MatchString(config.Contact.Email)) {
		return ErrInvalidConfig
	}
	allowedFeatures := map[string]bool{"training_programs": true, "microlearning": true, "media_gallery": true, "knowledge": true, "news": true, "announcements": true, "faq": true, "search": true}
	seenFeatures := map[string]bool{}
	for _, feature := range config.Features {
		if !allowedFeatures[feature.Key] || seenFeatures[feature.Key] || !validText(feature.Label, 80, false) {
			return ErrInvalidConfig
		}
		seenFeatures[feature.Key] = true
	}
	return nil
}

func MediaIDs(config Config) []string {
	values := []string{config.Identity.LogoMediaID, config.Banner.MediaID, config.SEO.SocialMediaID}
	seen, result := map[string]bool{}, make([]string, 0, len(values))
	for _, value := range values {
		if value != "" && !seen[value] {
			seen[value] = true
			result = append(result, value)
		}
	}
	sort.Strings(result)
	return result
}

func validText(value string, maximum int, allowEmpty bool) bool {
	trimmed := strings.TrimSpace(value)
	if !allowEmpty && trimmed == "" {
		return false
	}
	if utf8.RuneCountInString(trimmed) > maximum || strings.ContainsAny(trimmed, "<>{}\x00\r") {
		return false
	}
	return !forbiddenValue.MatchString(trimmed)
}

func validateHref(raw string, hosts map[string]bool) bool {
	if raw == "" || len(raw) > 500 || strings.HasPrefix(raw, "//") || strings.ContainsAny(raw, "\\\x00\r\n") {
		return false
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.User != nil {
		return false
	}
	if parsed.IsAbs() {
		return parsed.Scheme == "https" && parsed.Host != "" && (parsed.Port() == "" || parsed.Port() == "443") && hosts[strings.ToLower(parsed.Hostname())]
	}
	if parsed.Scheme != "" || parsed.Host != "" || !strings.HasPrefix(parsed.Path, "/") || strings.Contains(parsed.Path, "..") || strings.Contains(strings.ToLower(raw), "%2e") {
		return false
	}
	allowed := []string{"/", "/my-learning", "/training-programs", "/microlearning", "/media-gallery", "/knowledge", "/search", "/news", "/announcements", "/help", "/categories", "/tags"}
	for _, prefix := range allowed {
		if parsed.Path == prefix || (prefix != "/" && strings.HasPrefix(parsed.Path, prefix+"/")) {
			return true
		}
	}
	return false
}

func Default() Config {
	sections := []string{"hero", "trust", "learning_paths", "topics", "knowledge", "media", "stats", "faq", "cta"}
	home := make([]HomepageSection, 0, len(sections))
	for index, key := range sections {
		home = append(home, HomepageSection{Key: key, Visible: true, Order: index + 1})
	}
	return Config{
		Identity: IdentityConfig{Tagline: "Pengalaman Belajar"}, Homepage: HomepageConfig{Sections: home},
		Navigation: []NavigationItem{{Label: "Pelatihan Penuh", Description: "Program terstruktur melalui Moodle.", Href: "/training-programs", Visible: true}, {Label: "Pembelajaran Singkat", Description: "Materi editorial 3–15 menit.", Href: "/microlearning", Visible: true}, {Label: "Galeri Media", Description: "Foto dan video terkurasi.", Href: "/media-gallery", Visible: true}, {Label: "Pusat Pengetahuan", Description: "Panduan terkurasi.", Href: "/knowledge", Visible: true}},
		Banner:     BannerConfig{}, Footer: FooterConfig{Summary: "Ruang belajar terpadu untuk menemukan wawasan, mengikuti pembelajaran formal, dan bertumbuh bersama organisasi.", Links: []NavigationItem{{Label: "Pusat Pengetahuan", Href: "/knowledge", Visible: true}, {Label: "FAQ", Href: "/help", Visible: true}}},
		Contact: ContactConfig{HelpLabel: "Pusat Bantuan", HelpHref: "/help"}, SEO: SEOConfig{DefaultTitle: "Teman Belajar", DefaultDescription: "Platform pengalaman belajar digital perusahaan untuk belajar, berbagi pengetahuan, dan bertumbuh bersama."},
		Features: []FeaturePresentation{{Key: "training_programs", Label: "Pelatihan Penuh", Visible: true}, {Key: "microlearning", Label: "Pembelajaran Singkat", Visible: true}, {Key: "media_gallery", Label: "Galeri Media", Visible: true}, {Key: "knowledge", Label: "Pusat Pengetahuan", Visible: true}, {Key: "faq", Label: "FAQ", Visible: true}},
	}
}

// ApplyCurrentDefaults keeps older published configuration versions usable
// without rewriting immutable history. An explicit current entry, including a
// hidden one, always wins.
func ApplyCurrentDefaults(config Config) Config {
	hasFeature := false
	for _, feature := range config.Features {
		if feature.Key == "media_gallery" {
			hasFeature = true
			break
		}
	}
	if !hasFeature {
		config.Features = append(config.Features, FeaturePresentation{Key: "media_gallery", Label: "Galeri Media", Visible: true})
	}
	hasNavigation := false
	for _, item := range config.Navigation {
		if item.Href == "/media-gallery" {
			hasNavigation = true
			break
		}
	}
	if !hasNavigation {
		config.Navigation = append(config.Navigation, NavigationItem{Label: "Galeri Media", Description: "Foto dan video terkurasi.", Href: "/media-gallery", Visible: true})
	}
	return config
}

func WrapInvalid(field string) error { return fmt.Errorf("%w: %s", ErrInvalidConfig, field) }
