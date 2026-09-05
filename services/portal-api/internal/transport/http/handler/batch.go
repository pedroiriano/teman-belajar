package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/domain/faq"
	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/domain/learningpath"
	"teman-belajar-api/internal/domain/microlearning"
	"teman-belajar-api/internal/domain/reviewnote"
	"teman-belajar-api/internal/domain/training"
	"teman-belajar-api/internal/transport/http/middleware"
)

type BatchItemRequest struct {
	ID     string `json:"id"`
	Module string `json:"module"`
	Title  string `json:"title,omitempty"`
}

type BatchTransitionRequest struct {
	Action string             `json:"action"`
	Items  []BatchItemRequest `json:"items"`
	Notes  string             `json:"notes,omitempty"`
}

type BatchItemError struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Error string `json:"error"`
}

type BatchOperationResult struct {
	Total     int              `json:"total"`
	Succeeded int              `json:"succeeded"`
	Failed    int              `json:"failed"`
	Errors    []BatchItemError `json:"errors"`
}

type BatchHandler struct {
	knowledgeSvc    *knowledge.Service
	cmsSvc          *cms.Service
	faqSvc          *faq.Service
	trainingSvc     *training.Service
	microlearningSvc *microlearning.Service
	learningPathSvc *learningpath.Service
	reviewNoteSvc   *reviewnote.Service
	auditRepo       audit.Repository
}

func NewBatchHandler(
	knowledgeSvc *knowledge.Service,
	cmsSvc *cms.Service,
	faqSvc *faq.Service,
	trainingSvc *training.Service,
	microlearningSvc *microlearning.Service,
	learningPathSvc *learningpath.Service,
	reviewNoteSvc *reviewnote.Service,
	auditRepo audit.Repository,
) *BatchHandler {
	return &BatchHandler{
		knowledgeSvc:     knowledgeSvc,
		cmsSvc:           cmsSvc,
		faqSvc:           faqSvc,
		trainingSvc:      trainingSvc,
		microlearningSvc: microlearningSvc,
		learningPathSvc:  learningPathSvc,
		reviewNoteSvc:    reviewNoteSvc,
		auditRepo:        auditRepo,
	}
}

func (h *BatchHandler) HandleBatchTransitions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondProblem(w, http.StatusMethodNotAllowed, "Method Not Allowed", "POST required")
		return
	}

	claims, ok := r.Context().Value(middleware.ClaimsContextKey).(middleware.CustomClaims)
	if !ok {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing claims")
		return
	}

	roles := claims.RealmAccess.Roles
	actor := claims.Subject
	reviewerName := claims.PreferredUsername
	if reviewerName == "" {
		reviewerName = claims.Name
	}
	if reviewerName == "" {
		reviewerName = "Administrator"
	}

	var req BatchTransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Invalid request body")
		return
	}

	if len(req.Items) == 0 {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Items list cannot be empty")
		return
	}

	if len(req.Items) > 100 {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Maximum 100 items per batch request")
		return
	}

	targetStatus := ""
	switch strings.ToLower(req.Action) {
	case "approve":
		targetStatus = "approved"
	case "publish":
		targetStatus = "published"
	case "archive":
		targetStatus = "archived"
	case "delete", "reject":
		targetStatus = "draft"
	default:
		targetStatus = req.Action
	}

	ctx := r.Context()
	result := BatchOperationResult{
		Total:     len(req.Items),
		Succeeded: 0,
		Failed:    0,
		Errors:    []BatchItemError{},
	}

	for _, item := range req.Items {
		var opErr error

		mod := strings.ToLower(strings.TrimSpace(item.Module))
		switch mod {
		case "knowledge":
			if h.knowledgeSvc != nil {
				opErr = h.knowledgeSvc.TransitionStatusAuthorized(ctx, item.ID, knowledge.ArticleStatus(targetStatus), roles, &actor)
			}
		case "news":
			if h.cmsSvc != nil {
				_, opErr = h.cmsSvc.TransitionNews(ctx, item.ID, cms.ContentStatus(targetStatus), roles, &actor)
			}
		case "announcements", "announcement":
			if h.cmsSvc != nil {
				_, opErr = h.cmsSvc.TransitionAnnouncement(ctx, item.ID, cms.ContentStatus(targetStatus), roles, &actor)
			}
		case "faqs", "faq":
			if h.faqSvc != nil {
				_, opErr = h.faqSvc.Transition(ctx, item.ID, faq.Status(targetStatus), roles, actor)
			}
		case "training", "training-programs", "training_programs":
			if h.trainingSvc != nil {
				_, opErr = h.trainingSvc.Transition(ctx, item.ID, training.Status(targetStatus), roles, actor)
			}
		case "microlearning":
			if h.microlearningSvc != nil {
				_, opErr = h.microlearningSvc.Transition(ctx, item.ID, microlearning.Status(targetStatus), roles, actor)
			}
		case "learning_paths", "learning-paths", "learningpath":
			if h.learningPathSvc != nil {
				_, opErr = h.learningPathSvc.Transition(ctx, item.ID, learningpath.Status(targetStatus), roles, actor)
			}
		case "review-queue":
			// Default review queue item transition
			if h.knowledgeSvc != nil {
				opErr = h.knowledgeSvc.TransitionStatusAuthorized(ctx, item.ID, knowledge.ArticleStatus(targetStatus), roles, &actor)
			}
		default:
			opErr = cms.ErrInvalidTransition
		}

		if opErr != nil {
			result.Failed++
			result.Errors = append(result.Errors, BatchItemError{
				ID:    item.ID,
				Title: item.Title,
				Error: opErr.Error(),
			})
			continue
		}

		result.Succeeded++

		// Record review note if notes were provided
		if req.Notes != "" && h.reviewNoteSvc != nil {
			_, _ = h.reviewNoteSvc.Create(ctx, reviewnote.CreateReviewNoteInput{
				EntityType:   mod,
				EntityID:     item.ID,
				Action:       req.Action,
				Notes:        req.Notes,
				ReviewerID:   actor,
				ReviewerName: reviewerName,
			})
		}

		// Audit logging
		if h.auditRepo != nil {
			_ = h.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
				ID:          uuid.NewString(),
				ActorUserID: actor,
				Action:      "BATCH_TRANSITION_" + strings.ToUpper(req.Action),
				TargetType:  mod,
				TargetID:    item.ID,
				Result:      "SUCCESS",
				OccurredAt:  time.Now().UTC(),
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}
