package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

type mockLearningAuditRepo struct {
	events []*audit.AuditEvent
}

func (m *mockLearningAuditRepo) CreateEvent(_ context.Context, event *audit.AuditEvent) error {
	m.events = append(m.events, event)
	return nil
}

type MockProvider struct{}

func (m *MockProvider) ListCourses(ctx context.Context, filter learning.CourseFilter) ([]learning.LearningCourse, error) {
	return nil, nil
}
func (m *MockProvider) ResolveCurrentUser(ctx context.Context, identity learning.FederatedIdentity) (*learning.LearningUser, error) {
	if identity.Subject == "mapped" {
		return &learning.LearningUser{ID: 1, Username: "mapped", Email: "mapped@test.com"}, nil
	}
	return nil, learning.ErrLearningUserNotMapped
}
func (m *MockProvider) ListUserCourses(ctx context.Context, user *learning.LearningUser) ([]learning.EnrolledCourse, error) {
	return []learning.EnrolledCourse{
		{ID: 1, ShortName: "E1"},
	}, nil
}
func (m *MockProvider) GetCourseCompletion(ctx context.Context, user *learning.LearningUser, courseID int) (*learning.CourseCompletion, error) {
	return &learning.CourseCompletion{CourseID: courseID, Completed: true, Status: "completed"}, nil
}
func (m *MockProvider) GetCourseGrades(ctx context.Context, user *learning.LearningUser, courseID int) ([]learning.GradeItem, error) {
	return []learning.GradeItem{}, nil
}
func (m *MockProvider) GetUserCertificates(ctx context.Context, user *learning.LearningUser) ([]learning.UserCertificate, error) {
	return []learning.UserCertificate{
		{
			ID:              1,
			CustomCertID:    10,
			CourseID:        1,
			CourseName:      "Test Course",
			CourseShortName: "TC",
			CertificateName: "Sertifikat Kelulusan",
			Code:            "TB-TEST-1234",
			TimeCreated:     1726000000,
			DownloadURL:     "http://localhost:8082/mod/customcert/my_certificates.php?downloadcert=1",
			VerifyURL:       "http://localhost:8082/mod/customcert/verify_certificate.php?code=TB-TEST-1234",
		},
	}, nil
}
func (m *MockProvider) VerifyCertificate(ctx context.Context, code string) (*learning.CertificateVerificationResult, error) {
	if code == "PROVIDER-VALID" {
		return &learning.CertificateVerificationResult{
			Valid: true,
			Certificate: &learning.VerifiedCertificate{
				Code:            code,
				RecipientName:   "Provider Student",
				CourseName:      "Provider Course",
				CertificateName: "Provider Certificate",
				IssuedAt:        1726000000,
				Issuer:          "Provider Issuer",
				VerificationURL: "http://localhost:3100/certificates/verify?code=" + code,
			},
		}, nil
	}
	return &learning.CertificateVerificationResult{
		Valid:   false,
		Message: "Sertifikat tidak ditemukan",
	}, nil
}


func TestIDORGetMyCourseCompletion(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc, &mockLearningAuditRepo{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/courses/2/completion", nil)
	req.SetPathValue("courseId", "2") // User is enrolled in course 1, not 2

	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.GetMyCourseCompletion(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unenrolled course, got %d", w.Code)
	}
}

func TestIDORGetMyCourseGrades(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc, &mockLearningAuditRepo{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/courses/2/grades", nil)
	req.SetPathValue("courseId", "2") // User is enrolled in course 1, not 2

	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.GetMyCourseGrades(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for unenrolled course, got %d", w.Code)
	}
}

func TestGetMyCourseCompletion_Allowed(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc, &mockLearningAuditRepo{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/courses/1/completion", nil)
	req.SetPathValue("courseId", "1") // User is enrolled in course 1

	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.GetMyCourseCompletion(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for enrolled course, got %d", w.Code)
	}
}

func TestListMyCertificates(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	h := handler.NewLearningHandler(svc, &mockLearningAuditRepo{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/certificates", nil)
	claims := middleware.CustomClaims{Subject: "mapped"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.ListMyCertificates(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for certificates, got %d", w.Code)
	}
}

func TestVerifyCertificate(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	auditMock := &mockLearningAuditRepo{}
	h := handler.NewLearningHandler(svc, auditMock)

	tests := []struct {
		name         string
		code         string
		expectedCode int
		expectValid  bool
	}{
		{
			name:         "Empty Code",
			code:         "",
			expectedCode: http.StatusBadRequest,
			expectValid:  false,
		},
		{
			name:         "Too Long Code",
			code:         "a-very-long-code-that-exceeds-sixty-four-characters-limit-which-is-invalid-1234567890",
			expectedCode: http.StatusBadRequest,
			expectValid:  false,
		},
		{
			name:         "Valid Canonical Code TB-TEST-1234",
			code:         "TB-TEST-1234",
			expectedCode: http.StatusOK,
			expectValid:  true,
		},
		{
			name:         "Valid Canonical Code TB-2026-X8K9L",
			code:         "TB-2026-X8K9L",
			expectedCode: http.StatusOK,
			expectValid:  true,
		},
		{
			name:         "Valid Provider Fallback Code",
			code:         "PROVIDER-VALID",
			expectedCode: http.StatusOK,
			expectValid:  true,
		},
		{
			name:         "Invalid Not Found Code",
			code:         "NON-EXISTENT-CODE",
			expectedCode: http.StatusNotFound,
			expectValid:  false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			url := "/api/v1/certificates/verify"
			if tc.code != "" {
				url += "?code=" + tc.code
			}
			req := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			h.VerifyCertificate(w, req)

			if w.Code != tc.expectedCode {
				t.Errorf("expected status %d, got %d. Body: %s", tc.expectedCode, w.Code, w.Body.String())
			}
		})
	}
}

func TestGetMyTranscript(t *testing.T) {
	svc := learning.NewService(&MockProvider{})
	auditMock := &mockLearningAuditRepo{}
	h := handler.NewLearningHandler(svc, auditMock)

	t.Run("Unauthorized missing claims", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/transcript", nil)
		w := httptest.NewRecorder()
		h.GetMyTranscript(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Code)
		}
	})

	t.Run("Unmapped user", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/transcript", nil)
		claims := middleware.CustomClaims{Subject: "unmapped"}
		ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.GetMyTranscript(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", w.Code)
		}
	})

	t.Run("Authorized mapped learner returns transcript", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/learning/me/transcript", nil)
		claims := middleware.CustomClaims{
			Subject:           "mapped",
			PreferredUsername: "budi.pratama",
			Email:             "budi@example.com",
			Name:              "Budi Pratama",
		}
		ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()
		h.GetMyTranscript(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", w.Code, w.Body.String())
		}

		if !strings.Contains(w.Body.String(), "TB-TRX-") {
			t.Errorf("expected document number with TB-TRX- prefix in body: %s", w.Body.String())
		}

		if !strings.Contains(w.Body.String(), "Budi Pratama") {
			t.Errorf("expected learner name Budi Pratama in body: %s", w.Body.String())
		}

		if len(auditMock.events) == 0 {
			t.Errorf("expected audit event to be recorded for transcript access")
		} else {
			lastEvent := auditMock.events[len(auditMock.events)-1]
			if lastEvent.Action != "TRANSCRIPT_ACCESSED" {
				t.Errorf("expected TRANSCRIPT_ACCESSED, got %s", lastEvent.Action)
			}
		}
	})
}

