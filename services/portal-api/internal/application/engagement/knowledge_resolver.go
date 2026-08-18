package engagement

import (
	"context"
	"errors"

	domain "teman-belajar-api/internal/domain/engagement"
	"teman-belajar-api/internal/domain/knowledge"
)

type KnowledgeReader interface {
	GetArticleByID(ctx context.Context, id string) (*knowledge.Article, error)
}

type KnowledgeTargetResolver struct{ reader KnowledgeReader }

func NewKnowledgeTargetResolver(reader KnowledgeReader) *KnowledgeTargetResolver {
	return &KnowledgeTargetResolver{reader: reader}
}

func (r *KnowledgeTargetResolver) Resolve(ctx context.Context, target domain.Target) (domain.ResolvedTarget, error) {
	if target.Type != domain.TargetKnowledge {
		return domain.ResolvedTarget{}, domain.ErrInvalidTarget
	}
	article, err := r.reader.GetArticleByID(ctx, target.ID)
	if err != nil {
		if errors.Is(err, knowledge.ErrArticleNotFound) {
			return domain.ResolvedTarget{}, domain.ErrTargetUnavailable
		}
		return domain.ResolvedTarget{}, err
	}
	if article.PublishedRevisionNo == nil || article.Status == knowledge.StatusArchived {
		return domain.ResolvedTarget{}, domain.ErrTargetUnavailable
	}
	summary := ""
	if article.Summary != nil {
		summary = *article.Summary
	}
	categoryID := ""
	if article.CategoryID != nil {
		categoryID = *article.CategoryID
	}
	publishedAt := article.UpdatedAt
	return domain.ResolvedTarget{
		Target: target, Title: article.Title, Summary: summary, URL: "/knowledge/" + article.Slug,
		CategoryID: categoryID, Tags: []string{}, PublishedAt: &publishedAt,
	}, nil
}
