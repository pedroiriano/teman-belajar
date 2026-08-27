package moodle

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/webinar"
)

func TestListWebinarsUsesNarrowMoodleFunctionAndMapsProvenance(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatal(err)
		}
		if r.Form.Get("wsfunction") != "local_temanbelajar_list_webinars" || r.Form.Get("subject") == "" {
			t.Fatalf("unexpected form: %#v", r.Form)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"items":[{"id":17,"course_id":3,"title":"Live","summary":"Safe","starts_at":"2026-08-28T01:00:00Z","ends_at":"2026-08-28T02:00:00Z","timezone":"Asia/Jakarta","speakers":[],"capacity":100,"registered_count":1,"registration_state":"open","status":"scheduled","registered":false,"cancellation_allowed":false,"join_path":"","recording_path":"","attendance_seconds":0,"attendance_state":"pending","source":"moodle_mod_zoom","synced_at":"2026-08-27T01:00:00Z"}],"page":1,"page_size":12,"total":1,"total_pages":1,"synced_at":"2026-08-27T01:00:00Z"}`))
	}))
	defer server.Close()
	client := NewClient(Config{BaseURL: server.URL, PublicBaseURL: "https://lms.example.test", Token: "test-token", Timeout: time.Second})
	page, err := client.List(context.Background(), webinar.Identity{Subject: "11111111-1111-4111-8111-111111111111"}, 1, 12)
	if err != nil || len(page.Items) != 1 || page.Items[0].Source != "moodle_mod_zoom" || page.Items[0].Timezone != "Asia/Jakarta" {
		t.Fatalf("page=%#v err=%v", page, err)
	}
}

func TestSafeMoodleURLAllowsOnlyModZoomRouteAndNumericIDQuery(t *testing.T) {
	client := NewClient(Config{PublicBaseURL: "https://lms.example.test"})
	value, err := client.safeMoodleURL("/mod/zoom/view.php?id=17")
	if err != nil || value != "https://lms.example.test/mod/zoom/view.php?id=17" {
		t.Fatalf("value=%q err=%v", value, err)
	}
	for _, unsafe := range []string{"https://zoom.us/j/123?pwd=secret", "//evil.test/mod/zoom/view.php?id=17", "/mod/zoom/view.php?id=17&token=secret", "/mod/zoom/view.php?id=abc", "/mod/zoom/view.php?id=0", "/login/index.php?id=17"} {
		if _, err := client.safeMoodleURL(unsafe); !errors.Is(err, webinar.ErrUnavailable) {
			t.Fatalf("unsafe path accepted: %s err=%v", unsafe, err)
		}
	}
}

func TestMapWebinarErrorPreservesBoundedBusinessStates(t *testing.T) {
	tests := map[string]error{
		"Webinar not found":                                    webinar.ErrNotFound,
		"Webinar capacity is not configured":                   webinar.ErrConfigurationNeeded,
		"Webinar capacity is full; waitlist is disabled":       webinar.ErrCapacityFull,
		"Cancellation is not allowed after the webinar starts": webinar.ErrRegistrationClosed,
	}
	for message, expected := range tests {
		mapped := mapWebinarError(fmt.Errorf("%w: %s", learning.ErrMoodleInvalidResponse, message))
		if !errors.Is(mapped, expected) {
			t.Fatalf("message=%q mapped=%v", message, mapped)
		}
	}
}
