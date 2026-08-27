package moodle

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/webinar"
)

type webinarResponse struct {
	ID                  int      `json:"id"`
	CourseID            int      `json:"course_id"`
	Title               string   `json:"title"`
	Summary             string   `json:"summary"`
	StartsAt            string   `json:"starts_at"`
	EndsAt              string   `json:"ends_at"`
	Timezone            string   `json:"timezone"`
	Speakers            []string `json:"speakers"`
	Capacity            int      `json:"capacity"`
	RegisteredCount     int      `json:"registered_count"`
	RegistrationState   string   `json:"registration_state"`
	Status              string   `json:"status"`
	Registered          bool     `json:"registered"`
	CancellationAllowed bool     `json:"cancellation_allowed"`
	JoinPath            string   `json:"join_path"`
	RecordingPath       string   `json:"recording_path"`
	AttendanceSeconds   int      `json:"attendance_seconds"`
	AttendanceState     string   `json:"attendance_state"`
	Source              string   `json:"source"`
	SyncedAt            string   `json:"synced_at"`
}

func (c *Client) List(ctx context.Context, identity webinar.Identity, page, pageSize int) (webinar.Page, error) {
	params := url.Values{}
	params.Set("subject", identity.Subject)
	params.Set("page", strconv.Itoa(page))
	params.Set("page_size", strconv.Itoa(pageSize))
	var response struct {
		Items      []webinarResponse `json:"items"`
		Page       int               `json:"page"`
		PageSize   int               `json:"page_size"`
		Total      int               `json:"total"`
		TotalPages int               `json:"total_pages"`
		SyncedAt   string            `json:"synced_at"`
	}
	if err := c.callWS(ctx, "local_temanbelajar_list_webinars", params, &response); err != nil {
		return webinar.Page{}, mapWebinarError(err)
	}
	items := make([]webinar.Session, 0, len(response.Items))
	for _, item := range response.Items {
		mapped, err := c.mapWebinar(item)
		if err != nil {
			return webinar.Page{}, err
		}
		items = append(items, mapped)
	}
	syncedAt, err := time.Parse(time.RFC3339, response.SyncedAt)
	if err != nil {
		return webinar.Page{}, webinar.ErrUnavailable
	}
	return webinar.Page{Items: items, Page: response.Page, PageSize: response.PageSize, Total: response.Total, TotalPages: response.TotalPages, SyncedAt: syncedAt}, nil
}

func (c *Client) Get(ctx context.Context, identity webinar.Identity, id int) (webinar.Session, error) {
	return c.webinarAction(ctx, "local_temanbelajar_get_webinar", identity, id, "")
}

func (c *Client) Register(ctx context.Context, identity webinar.Identity, id int, key string) (webinar.Session, error) {
	return c.webinarAction(ctx, "local_temanbelajar_register_webinar", identity, id, key)
}

func (c *Client) Cancel(ctx context.Context, identity webinar.Identity, id int, key string) (webinar.Session, error) {
	return c.webinarAction(ctx, "local_temanbelajar_cancel_webinar", identity, id, key)
}

func (c *Client) webinarAction(ctx context.Context, function string, identity webinar.Identity, id int, key string) (webinar.Session, error) {
	params := url.Values{}
	params.Set("subject", identity.Subject)
	params.Set("course_module_id", strconv.Itoa(id))
	if key != "" {
		params.Set("idempotency_key", key)
	}
	var response webinarResponse
	if err := c.callWS(ctx, function, params, &response); err != nil {
		return webinar.Session{}, mapWebinarError(err)
	}
	return c.mapWebinar(response)
}

func (c *Client) mapWebinar(value webinarResponse) (webinar.Session, error) {
	start, startErr := time.Parse(time.RFC3339, value.StartsAt)
	end, endErr := time.Parse(time.RFC3339, value.EndsAt)
	synced, syncedErr := time.Parse(time.RFC3339, value.SyncedAt)
	if startErr != nil || endErr != nil || syncedErr != nil || value.Timezone != "Asia/Jakarta" || value.Source != "moodle_mod_zoom" {
		return webinar.Session{}, webinar.ErrUnavailable
	}
	joinURL, err := c.safeMoodleURL(value.JoinPath)
	if err != nil {
		return webinar.Session{}, err
	}
	recordingURL, err := c.safeMoodleURL(value.RecordingPath)
	if err != nil {
		return webinar.Session{}, err
	}
	return webinar.Session{
		ID: value.ID, CourseID: value.CourseID, Title: value.Title, Summary: value.Summary,
		StartsAt: start, EndsAt: end, Timezone: value.Timezone, Speakers: value.Speakers,
		Capacity: value.Capacity, RegisteredCount: value.RegisteredCount, RegistrationState: value.RegistrationState,
		Status: value.Status, Registered: value.Registered, CancellationAllowed: value.CancellationAllowed,
		JoinURL: joinURL, RecordingURL: recordingURL, AttendanceSeconds: value.AttendanceSeconds,
		AttendanceState: value.AttendanceState, Source: value.Source, SyncedAt: synced,
	}, nil
}

func (c *Client) safeMoodleURL(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	relative, err := url.Parse(path)
	if err != nil || relative.IsAbs() || relative.Host != "" || !strings.HasPrefix(relative.Path, "/mod/zoom/") || relative.Fragment != "" {
		return "", webinar.ErrUnavailable
	}
	id, parseErr := strconv.Atoi(relative.Query().Get("id"))
	if parseErr != nil || id < 1 || len(relative.Query()) != 1 {
		return "", webinar.ErrUnavailable
	}
	base, err := url.Parse(c.config.PublicBaseURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return "", webinar.ErrUnavailable
	}
	base.Path, base.RawQuery, base.Fragment = relative.Path, relative.RawQuery, ""
	return base.String(), nil
}

func mapWebinarError(err error) error {
	switch {
	case errors.Is(err, learning.ErrMoodleAuthentication), errors.Is(err, learning.ErrMoodlePermission):
		return webinar.ErrForbidden
	case errors.Is(err, learning.ErrMoodleTimeout), errors.Is(err, learning.ErrMoodleUnavailable), errors.Is(err, learning.ErrMoodleFunction):
		return webinar.ErrUnavailable
	case errors.Is(err, learning.ErrMoodleInvalidResponse):
		message := strings.ToLower(err.Error())
		switch {
		case strings.Contains(message, "capacity is not configured"):
			return webinar.ErrConfigurationNeeded
		case strings.Contains(message, "webinar not found"):
			return webinar.ErrNotFound
		case strings.Contains(message, "capacity is full"):
			return webinar.ErrCapacityFull
		case strings.Contains(message, "registration is closed"), strings.Contains(message, "cancellation is not allowed"):
			return webinar.ErrRegistrationClosed
		default:
			return fmt.Errorf("%w: invalid provider response", webinar.ErrUnavailable)
		}
	default:
		return webinar.ErrUnavailable
	}
}

var _ webinar.ProviderPort = (*Client)(nil)
