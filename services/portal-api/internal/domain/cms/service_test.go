package cms

import (
	"testing"
)

func TestCanTransitionTo(t *testing.T) {
	editorRoles := []string{"Content Editor"}
	reviewerRoles := []string{"Reviewer"}
	adminRoles := []string{"Portal Administrator"}
	noRoles := []string{"Learner"}

	tests := []struct {
		name      string
		current   ContentStatus
		next      ContentStatus
		roles     []string
		want      bool
	}{
		{"draft to in_review as editor", StatusDraft, StatusInReview, editorRoles, true},
		{"draft to in_review as reviewer", StatusDraft, StatusInReview, reviewerRoles, false},
		{"draft to in_review as admin", StatusDraft, StatusInReview, adminRoles, true},
		{"in_review to approved as reviewer", StatusInReview, StatusApproved, reviewerRoles, true},
		{"in_review to approved as editor", StatusInReview, StatusApproved, editorRoles, false},
		{"approved to published as reviewer", StatusApproved, StatusPublished, reviewerRoles, true},
		{"draft to published directly", StatusDraft, StatusPublished, adminRoles, false},
		{"published to archived as editor", StatusPublished, StatusArchived, editorRoles, true},
		{"archived to published (invalid restore)", StatusArchived, StatusPublished, adminRoles, false},
		{"no roles cannot do anything", StatusDraft, StatusInReview, noRoles, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CanTransitionTo(tt.current, tt.next, tt.roles); got != tt.want {
				t.Errorf("CanTransitionTo() = %v, want %v", got, tt.want)
			}
		})
	}
}
