package moodle

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/learning"
)

func TestClient_MoodleError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"exception":"moodle_exception","errorcode":"invalidtoken","message":"Invalid token"}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	err := client.callWS(context.Background(), "test_func", nil, nil)

	if err != learning.ErrMoodleAuthentication {
		t.Errorf("expected ErrMoodleAuthentication, got %v", err)
	}
}

func TestClient_MoodleErrorWithoutErrorCode(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"exception":"Error","message":"Runtime class not found"}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: time.Second})
	err := client.callWS(context.Background(), "test_func", nil, nil)
	if err == nil || !strings.Contains(err.Error(), "moodle is currently unavailable") {
		t.Fatalf("expected Moodle error envelope to be rejected, got %v", err)
	}
}

func TestClient_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(20 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 10 * time.Millisecond})

	err := client.callWS(context.Background(), "test_func", nil, nil)

	if err != learning.ErrMoodleTimeout {
		t.Errorf("expected ErrMoodleTimeout, got %v", err)
	}
}

func TestClient_HTTP500(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	err := client.callWS(context.Background(), "test_func", nil, nil)

	if err == nil {
		t.Errorf("expected error, got nil")
	}
}

func TestClient_MalformedJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{malformed json`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	var dst map[string]interface{}
	err := client.callWS(context.Background(), "test_func", nil, &dst)

	if err == nil {
		t.Errorf("expected error on malformed json")
	}
}

func TestClient_LargeResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		// Write 6MB of data
		_, _ = w.Write(make([]byte, 6*1024*1024))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 5 * time.Second})

	var dst map[string]interface{}
	err := client.callWS(context.Background(), "test_func", nil, &dst)

	if err == nil || !strings.Contains(err.Error(), "response too large") {
		t.Errorf("expected response too large error, got %v", err)
	}
}

func TestClient_NullFalse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`null`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	err := client.callWS(context.Background(), "test_func", nil, nil)

	if err == nil || !strings.Contains(err.Error(), "received null or false") {
		t.Errorf("expected received null or false error, got %v", err)
	}
}

func TestResolveCurrentUser_Mapped(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id": 12, "username": "testuser", "email": "test@test.com"}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	user, err := client.ResolveCurrentUser(context.Background(), learning.FederatedIdentity{Subject: "testuser"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if user.ID != 12 {
		t.Errorf("expected ID 12, got %d", user.ID)
	}
}

func TestResolveCurrentUser_Unmapped(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"exception":"moodle_exception","errorcode":"invalidrecord","message":"Invalid record"}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	_, err := client.ResolveCurrentUser(context.Background(), learning.FederatedIdentity{Subject: "unknown"})
	if err != learning.ErrLearningUserNotMapped {
		t.Errorf("expected ErrLearningUserNotMapped, got %v", err)
	}
}

func TestResolveCurrentUser_Ambiguous(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"exception":"moodle_exception","errorcode":"ambiguous_identity","message":"Ambiguous identity resolution"}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})

	_, err := client.ResolveCurrentUser(context.Background(), learning.FederatedIdentity{Subject: "ambiguous"})
	if err == nil || err != learning.ErrLearningUserNotMapped {
		t.Errorf("expected ErrLearningUserNotMapped, got %v", err)
	}
}

func TestListCourses_Filters(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm: %v", err)
		}
		if got := r.Form.Get("wsfunction"); got != "local_temanbelajar_list_visible_courses" {
			t.Fatalf("wsfunction = %q", got)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[
			{"id": 1, "shortname": "site", "visible": 1},
			{"id": 2, "shortname": "visible course", "visible": 1},
			{"id": 3, "shortname": "hidden course", "visible": 0}
		]`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})
	courses, err := client.ListCourses(context.Background(), learning.CourseFilter{})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(courses) != 1 {
		t.Errorf("expected 1 courses (id=1 and visible=0 omitted), got %d", len(courses))
	}
	if len(courses) > 0 && courses[0].ID != 2 {
		t.Errorf("expected course ID 2, got %d", courses[0].ID)
	}
}

func TestMyCourses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[
			{"id": 2, "shortname": "course 1", "progress": 50.5, "completed": false}
		]`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})
	courses, err := client.ListUserCourses(context.Background(), &learning.LearningUser{ID: 12})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(courses) != 1 {
		t.Errorf("expected 1 course, got %d", len(courses))
	}
	if *courses[0].Progress != 50.5 {
		t.Errorf("expected 50.5 progress, got %f", *courses[0].Progress)
	}
}

func TestGetCourseCompletion(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"completionstatus": {"completed": true}}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})
	completion, err := client.GetCourseCompletion(context.Background(), &learning.LearningUser{ID: 12}, 2)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !completion.Completed || completion.Status != "completed" {
		t.Errorf("expected completed status, got %v", completion)
	}
}

func TestGetCourseGrades(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"usergrades": [{"gradeitems": [
			{"id": 1, "itemname": "Visible Grade", "graderaw": 80, "hidden": false},
			{"id": 2, "itemname": "Hidden Grade", "graderaw": 90, "hidden": true}
		]}]}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: 1 * time.Second})
	grades, err := client.GetCourseGrades(context.Background(), &learning.LearningUser{ID: 12}, 2)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(grades) != 1 {
		t.Errorf("expected 1 visible grade, got %d", len(grades))
	}
	if grades[0].ItemName != "Visible Grade" {
		t.Errorf("expected Visible Grade, got %s", grades[0].ItemName)
	}
}

// Token Redaction Test
func TestClient_Redaction(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"exception":"moodle_exception","errorcode":"custom_error","message":"Something failed"}`))
	}))
	defer server.Close()

	token := "secret_moodle_token_123"
	client := NewClient(Config{BaseURL: server.URL, Token: token, Timeout: 1 * time.Second})

	err := client.callWS(context.Background(), "test_func", nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}

	// Error message must not contain the token
	errStr := err.Error()
	if strings.Contains(errStr, token) {
		t.Errorf("error message leaked token! %s", errStr)
	}

	// Print JSON to ensure it also doesn't leak. (It's an internal error struct anyway)
	errBytes, _ := json.Marshal(err)
	if strings.Contains(string(errBytes), token) {
		t.Errorf("json serialization leaked token! %s", string(errBytes))
	}
}

func TestGetLearningAnalyticsUsesExplicitPeriod(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm: %v", err)
		}
		if got := r.Form.Get("start_date"); got != "2026-08-01" {
			t.Fatalf("start_date = %q", got)
		}
		if got := r.Form.Get("end_date"); got != "2026-08-10" {
			t.Fatalf("end_date = %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"active_learners":4,"learning_starts":5,"eligible_enrolments":10,"completions":4,"completion_rate":40,"top_courses":[]}`))
	}))
	defer server.Close()

	client := NewClient(Config{BaseURL: server.URL, Token: "test", Timeout: time.Second})
	result, err := client.GetLearningAnalytics(context.Background(), "2026-08-01", "2026-08-10")
	if err != nil {
		t.Fatalf("GetLearningAnalytics: %v", err)
	}
	if result.EligibleEnrolments != 10 || result.Completions != 4 || result.CompletionRate != 40 {
		t.Fatalf("unexpected cohort result: %+v", result)
	}
}
