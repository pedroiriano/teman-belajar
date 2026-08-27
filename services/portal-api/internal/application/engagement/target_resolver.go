package engagement

import (
	"context"
	"errors"

	domain "teman-belajar-api/internal/domain/engagement"
	"teman-belajar-api/internal/domain/microlearning"
)

type MicrolearningReader interface {
	GetPublishedByID(context.Context, string) (*microlearning.Item, error)
}

type TargetResolver struct {
	knowledge     KnowledgeReader
	microlearning MicrolearningReader
}

func NewTargetResolver(knowledgeReader KnowledgeReader, microlearningReader MicrolearningReader) *TargetResolver {
	return &TargetResolver{knowledge: knowledgeReader, microlearning: microlearningReader}
}

func (r *TargetResolver) Resolve(ctx context.Context, target domain.Target) (domain.ResolvedTarget, error) {
	switch target.Type {
	case domain.TargetKnowledge:
		return NewKnowledgeTargetResolver(r.knowledge).Resolve(ctx, target)
	case domain.TargetMicrolearning:
		item, err := r.microlearning.GetPublishedByID(ctx, target.ID)
		if err != nil {
			if errors.Is(err, microlearning.ErrNotFound) {
				return domain.ResolvedTarget{}, domain.ErrTargetUnavailable
			}
			return domain.ResolvedTarget{}, err
		}
		published := item.UpdatedAt
		if item.PublishedAt != nil {
			published = *item.PublishedAt
		}
		return domain.ResolvedTarget{Target: target, Title: item.Title, Summary: item.Summary, URL: "/microlearning/" + item.Slug, Tags: []string{string(item.Format)}, PublishedAt: &published}, nil
	default:
		return domain.ResolvedTarget{}, domain.ErrInvalidTarget
	}
}
