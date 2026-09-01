package learningpath

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/engagement"
	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/domain/learning"
	domain "teman-belajar-api/internal/domain/learningpath"
	"teman-belajar-api/internal/domain/microlearning"
	"teman-belajar-api/internal/domain/webinar"
)

type CourseProvider interface {
	ListCourses(context.Context, learning.CourseFilter) ([]learning.LearningCourse, error)
	ResolveCurrentUser(context.Context, learning.FederatedIdentity) (*learning.LearningUser, error)
	ListUserCourses(context.Context, *learning.LearningUser) ([]learning.EnrolledCourse, error)
}
type KnowledgeReader interface {
	GetArticleByID(context.Context, string) (*knowledge.Article, error)
	ListPublicArticles(context.Context, int, int, *string, *string) ([]knowledge.Article, int, error)
}
type MicrolearningReader interface {
	GetPublishedByID(context.Context, string) (*microlearning.Item, error)
	ListPublic(context.Context, microlearning.ListFilter) ([]microlearning.Item, int, error)
	GetProgress(context.Context, string, string) (*microlearning.Progress, error)
}
type WebinarReader interface {
	Get(context.Context, webinar.Identity, int) (webinar.Session, error)
}
type EngagementReader interface {
	ListRecentViews(context.Context, string, int) ([]engagement.RecentView, error)
}

type SourceAdapter struct {
	courses      CourseProvider
	knowledge    KnowledgeReader
	micro        MicrolearningReader
	webinars     WebinarReader
	engagement   EngagementReader
	moodlePublic string
	now          func() time.Time
}

func NewSourceAdapter(c CourseProvider, k KnowledgeReader, m MicrolearningReader, w WebinarReader, e EngagementReader, moodlePublic string) *SourceAdapter {
	return &SourceAdapter{courses: c, knowledge: k, micro: m, webinars: w, engagement: e, moodlePublic: strings.TrimRight(moodlePublic, "/"), now: func() time.Time { return time.Now().UTC() }}
}

func (a *SourceAdapter) Resolve(ctx context.Context, kind domain.ItemKind, ref, subject string) (domain.ResolvedSource, error) {
	checked := a.now()
	switch kind {
	case domain.KindCourse:
		id, _ := strconv.Atoi(ref)
		items, e := a.courses.ListCourses(ctx, learning.CourseFilter{})
		if e != nil {
			return domain.ResolvedSource{State: domain.SourceDegraded, CheckedAt: checked}, nil
		}
		for _, x := range items {
			if x.ID == id {
				if !x.Visible {
					return domain.ResolvedSource{}, domain.ErrUnauthorizedSource
				}
				return domain.ResolvedSource{Title: x.FullName, Summary: x.Summary, URL: courseURL(a.moodlePublic, id), State: domain.SourceAvailable, CheckedAt: checked}, nil
			}
		}
		return domain.ResolvedSource{}, domain.ErrOrphanSource
	case domain.KindKnowledge:
		x, e := a.knowledge.GetArticleByID(ctx, ref)
		if errors.Is(e, knowledge.ErrArticleNotFound) {
			return domain.ResolvedSource{}, domain.ErrOrphanSource
		}
		if e != nil {
			return domain.ResolvedSource{State: domain.SourceDegraded, CheckedAt: checked}, nil
		}
		if x.Status != knowledge.StatusPublished {
			return domain.ResolvedSource{}, domain.ErrUnauthorizedSource
		}
		summary := ""
		if x.Summary != nil {
			summary = *x.Summary
		}
		return domain.ResolvedSource{Title: x.Title, Summary: summary, URL: "/knowledge/" + x.Slug, State: domain.SourceAvailable, CheckedAt: checked}, nil
	case domain.KindMicrolearning:
		x, e := a.micro.GetPublishedByID(ctx, ref)
		if errors.Is(e, microlearning.ErrNotFound) {
			return domain.ResolvedSource{}, domain.ErrOrphanSource
		}
		if e != nil {
			return domain.ResolvedSource{State: domain.SourceDegraded, CheckedAt: checked}, nil
		}
		return domain.ResolvedSource{Title: x.Title, Summary: x.Summary, URL: "/microlearning/" + x.Slug, State: domain.SourceAvailable, CheckedAt: checked}, nil
	case domain.KindWebinar:
		id, _ := strconv.Atoi(ref)
		x, e := a.webinars.Get(ctx, webinar.Identity{Subject: subject}, id)
		if errors.Is(e, webinar.ErrNotFound) {
			return domain.ResolvedSource{}, domain.ErrOrphanSource
		}
		if e != nil {
			return domain.ResolvedSource{State: domain.SourceDegraded, CheckedAt: checked}, nil
		}
		state := domain.SourceAvailable
		if x.Capacity < 1 {
			state = domain.SourceUnavailable
		}
		return domain.ResolvedSource{Title: x.Title, Summary: x.Summary, URL: "/webinars/" + ref, State: state, CheckedAt: x.SyncedAt}, nil
	default:
		return domain.ResolvedSource{}, domain.ErrOrphanSource
	}
}

func (a *SourceAdapter) Options(ctx context.Context, subject string) (domain.Options, error) {
	out := domain.Options{Data: []domain.Option{}, Provenance: map[string]string{"course": "fresh", "knowledge": "fresh", "microlearning": "fresh", "webinar": "blocked_task015"}}
	courses, e := a.courses.ListCourses(ctx, learning.CourseFilter{})
	if e != nil {
		out.Provenance["course"] = "degraded"
	} else {
		for _, x := range courses {
			if x.Visible {
				out.Data = append(out.Data, domain.Option{Kind: domain.KindCourse, SourceRef: strconv.Itoa(x.ID), Label: x.FullName, Summary: x.Summary, State: domain.SourceAvailable})
			}
		}
	}
	articles, _, e := a.knowledge.ListPublicArticles(ctx, 1, 100, nil, nil)
	if e != nil {
		out.Provenance["knowledge"] = "degraded"
	} else {
		for _, x := range articles {
			summary := ""
			if x.Summary != nil {
				summary = *x.Summary
			}
			out.Data = append(out.Data, domain.Option{Kind: domain.KindKnowledge, SourceRef: x.ID, Label: x.Title, Summary: summary, State: domain.SourceAvailable})
		}
	}
	micro, _, e := a.micro.ListPublic(ctx, microlearning.ListFilter{Page: 1, PageSize: 100})
	if e != nil {
		out.Provenance["microlearning"] = "degraded"
	} else {
		for _, x := range micro {
			out.Data = append(out.Data, domain.Option{Kind: domain.KindMicrolearning, SourceRef: x.ID, Label: x.Title, Summary: x.Summary, State: domain.SourceAvailable})
		}
	}
	domain.SortOptions(out.Data)
	return out, nil
}

func (a *SourceAdapter) Progress(ctx context.Context, items []domain.Item, subject string) (map[string]domain.ItemProgress, map[string]string) {
	out := map[string]domain.ItemProgress{}
	prov := map[string]string{"course": "fresh", "knowledge": "fresh", "microlearning": "fresh", "webinar": "blocked_task015"}
	for _, x := range items {
		out[x.Key] = domain.ItemProgress{Key: x.Key, State: "not_started", Progress: 0}
	}
	user, e := a.courses.ResolveCurrentUser(ctx, learning.FederatedIdentity{Subject: subject})
	enrolled := map[int]learning.EnrolledCourse{}
	if e == nil {
		list, err := a.courses.ListUserCourses(ctx, user)
		if err == nil {
			for _, x := range list {
				enrolled[x.ID] = x
			}
		} else {
			prov["course"] = "degraded"
		}
	} else {
		prov["course"] = "degraded"
	}
	recent := map[string]bool{}
	views, e := a.engagement.ListRecentViews(ctx, subject, 100)
	if e != nil {
		prov["knowledge"] = "degraded"
	} else {
		for _, x := range views {
			if x.Target.Type == engagement.TargetKnowledge {
				recent[x.Target.ID] = true
			}
		}
	}
	for _, x := range items {
		v := out[x.Key]
		switch x.Kind {
		case domain.KindCourse:
			id, _ := strconv.Atoi(x.SourceRef)
			course, ok := enrolled[id]
			if prov["course"] == "degraded" {
				v.State = "unavailable"
				v.Detail = "moodle_progress_unavailable"
			} else if ok {
				v.State = "in_progress"
				if course.Progress != nil {
					v.Progress = max(0, min(100, *course.Progress))
				}
				if course.Completed {
					v.Progress = 100
					v.State = "completed"
				}
			}
		case domain.KindKnowledge:
			if prov["knowledge"] == "degraded" {
				v.State = "unavailable"
				v.Detail = "knowledge_activity_unavailable"
			} else if recent[x.SourceRef] {
				v.Progress = 100
				v.State = "completed"
			}
		case domain.KindMicrolearning:
			p, err := a.micro.GetProgress(ctx, subject, x.SourceRef)
			if err != nil {
				v.State = "unavailable"
				v.Detail = "microlearning_progress_unavailable"
				prov["microlearning"] = "degraded"
			} else {
				v.Progress = max(0, min(100, p.ProgressPercent))
				if v.Progress >= 100 {
					v.State = "completed"
				} else if v.Progress > 0 {
					v.State = "in_progress"
				}
			}
		case domain.KindWebinar:
			id, _ := strconv.Atoi(x.SourceRef)
			session, err := a.webinars.Get(ctx, webinar.Identity{Subject: subject}, id)
			if err != nil || session.Capacity < 1 {
				v.State = "unavailable"
				v.Detail = "webinar_unavailable"
			} else if session.AttendanceState == "attended" || session.AttendanceState == "completed" {
				v.Progress = 100
				v.State = "completed"
			} else {
				v.State = "available"
				prov["webinar"] = "fresh"
			}
		}
		out[x.Key] = v
	}
	return out, prov
}

func courseURL(base string, id int) string {
	u, e := url.Parse(base)
	if e != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	u.Path = "/course/view.php"
	q := u.Query()
	q.Set("id", fmt.Sprint(id))
	u.RawQuery = q.Encode()
	return u.String()
}
