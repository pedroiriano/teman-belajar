package searchindex

import (
	"context"
	"fmt"
	"time"
)

type SourceReport struct {
	Count int
	Error error
}

type Syncer struct {
	index   Index
	sources []Source
}

func NewSyncer(index Index, sources ...Source) *Syncer {
	return &Syncer{index: index, sources: sources}
}

func (s *Syncer) Configure(ctx context.Context) error { return s.index.Configure(ctx) }

// Sync performs independent source snapshots. A failed source is never passed
// to ReplaceSource, so its last successful index generation is preserved.
func (s *Syncer) Sync(ctx context.Context) map[string]SourceReport {
	reports := make(map[string]SourceReport, len(s.sources))
	for _, source := range s.sources {
		documents, err := source.Fetch(ctx)
		if err != nil {
			reports[source.Type()] = SourceReport{Error: err}
			continue
		}
		generation := fmt.Sprintf("%s-%d", source.Type(), time.Now().UTC().UnixNano())
		for i := range documents {
			documents[i].Generation = generation
			if documents[i].Tags == nil {
				documents[i].Tags = []string{}
			}
		}
		if err := s.index.ReplaceSource(ctx, source.Type(), documents); err != nil {
			reports[source.Type()] = SourceReport{Count: len(documents), Error: err}
			continue
		}
		reports[source.Type()] = SourceReport{Count: len(documents)}
	}
	return reports
}
