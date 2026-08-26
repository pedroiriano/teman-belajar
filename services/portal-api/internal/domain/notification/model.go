package notification

import (
	"errors"
	"time"
)

type Audience string
type EventType string
type Priority string

const (
	AudiencePortal Audience = "portal"
	AudienceAdmin  Audience = "admin"

	EventLearningReminder        EventType = "learning.reminder"
	EventLearningCourseUpdated   EventType = "learning.course_updated"
	EventLearningCourseCompleted EventType = "learning.course_completed"
	EventContentWorkflow         EventType = "content.workflow"
	EventSystemNotice            EventType = "system.notice"

	PriorityNormal Priority = "normal"
	PriorityHigh   Priority = "high"

	EventSchemaVersion = "1.0"
)

var EventTypes = []EventType{EventLearningReminder, EventLearningCourseUpdated, EventLearningCourseCompleted, EventContentWorkflow, EventSystemNotice}

var (
	ErrInvalidInput = errors.New("invalid notification input")
	ErrNotFound     = errors.New("notification not found")
)

type Notification struct {
	ID          string     `json:"id"`
	Audience    Audience   `json:"audience"`
	EventType   EventType  `json:"event_type"`
	Title       string     `json:"title"`
	Body        string     `json:"body"`
	DeepLink    string     `json:"deep_link"`
	Priority    Priority   `json:"priority"`
	AvailableAt time.Time  `json:"available_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	ReadAt      *time.Time `json:"read_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Delivery struct {
	EventID       string
	SchemaVersion string
	Source        string
	UserSubject   string
	Audience      Audience
	EventType     EventType
	Title         string
	Body          string
	DeepLink      string
	Priority      Priority
	AvailableAt   time.Time
}

type DeliveryResult struct {
	Notification *Notification
	Created      bool
	Suppressed   bool
}

type ListFilter struct {
	Audience Audience
	Unread   bool
	Page     int
	PageSize int
	Now      time.Time
}

type Page struct {
	Items       []Notification `json:"data"`
	Page        int            `json:"page"`
	PageSize    int            `json:"page_size"`
	Total       int            `json:"total"`
	TotalPages  int            `json:"total_pages"`
	UnreadCount int            `json:"unread_count"`
}

type Preference struct {
	Audience  Audience   `json:"audience"`
	EventType EventType  `json:"event_type"`
	Enabled   bool       `json:"enabled"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}
