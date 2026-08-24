package middleware

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"teman-belajar-api/internal/domain/audit"
)

const (
	// HMACSignatureHeader carries the HMAC-SHA256 hex signature.
	HMACSignatureHeader = "X-TB-Signature"
	// HMACTimestampHeader carries the Unix epoch seconds of the request.
	HMACTimestampHeader = "X-TB-Timestamp"
	// hmacTimestampWindow is the maximum age of a signed request (±5 minutes).
	hmacTimestampWindow = 5 * time.Minute
	// maxBodySize is the maximum request body size (512KB).
	maxBodySize = 512 * 1024
)

// HMACAuthMiddleware validates service-to-service HMAC-SHA256 authentication.
// It reads the request body, verifies the signature, and replaces the body
// so downstream handlers can read it.
func HMACAuthMiddleware(secret string, auditRepo audit.Repository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sig := r.Header.Get(HMACSignatureHeader)
			tsStr := r.Header.Get(HMACTimestampHeader)

			if sig == "" || tsStr == "" {
				recordAuthFailure(r.Context(), auditRepo, "missing_auth_headers")
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Missing authentication headers"}`, http.StatusUnauthorized)
				return
			}

			// Parse and validate timestamp
			tsEpoch, err := strconv.ParseInt(tsStr, 10, 64)
			if err != nil {
				recordAuthFailure(r.Context(), auditRepo, "invalid_timestamp")
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Invalid timestamp"}`, http.StatusUnauthorized)
				return
			}

			requestTime := time.Unix(tsEpoch, 0)
			now := time.Now()
			if math.Abs(now.Sub(requestTime).Seconds()) > hmacTimestampWindow.Seconds() {
				recordAuthFailure(r.Context(), auditRepo, "expired_timestamp")
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Request timestamp expired"}`, http.StatusUnauthorized)
				return
			}

			// Read body with size limit
			r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
			body, err := io.ReadAll(r.Body)
			if err != nil {
				if err.Error() == "http: request body too large" {
					http.Error(w, `{"type":"about:blank","title":"Payload Too Large","status":413,"detail":"Request body exceeds maximum size"}`, http.StatusRequestEntityTooLarge)
					return
				}
				recordAuthFailure(r.Context(), auditRepo, "body_read_error")
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Failed to read request body"}`, http.StatusUnauthorized)
				return
			}

			// Compute expected signature: HMAC-SHA256(timestamp + "\n" + body)
			mac := hmac.New(sha256.New, []byte(secret))
			mac.Write([]byte(tsStr))
			mac.Write([]byte("\n"))
			mac.Write(body)
			expectedSig := hex.EncodeToString(mac.Sum(nil))

			// Constant-time comparison
			if subtle.ConstantTimeCompare([]byte(sig), []byte(expectedSig)) != 1 {
				recordAuthFailure(r.Context(), auditRepo, "invalid_signature")
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Invalid signature"}`, http.StatusUnauthorized)
				return
			}

			// Replace body for downstream handlers
			r.Body = io.NopCloser(bytes.NewReader(body))
			next.ServeHTTP(w, r)
		})
	}
}

// recordAuthFailure logs a security audit event without exposing secrets.
func recordAuthFailure(ctx context.Context, auditRepo audit.Repository, reason string) {
	event := &audit.AuditEvent{
		ID:         fmt.Sprintf("sec-moodle-event-auth-%d", time.Now().UnixNano()),
		Action:     "moodle_event_ingest_auth",
		TargetType: "integration_endpoint",
		TargetID:   "/api/v1/internal/moodle/events",
		Result:     "denied:" + reason,
		OccurredAt: time.Now().UTC(),
	}
	if err := auditRepo.CreateEvent(ctx, event); err != nil {
		log.Printf("Failed to record auth failure audit event: %v", err)
	}
}
