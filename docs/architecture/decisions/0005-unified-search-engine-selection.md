# 5. Unified Search Engine Selection

Date: 2026-08-18
Status: Accepted

## Context

Teman Belajar needs a deterministic, full-text Unified Search capability that aggregates content from both the learning management system (courses via Moodle) and the portal content management system (knowledge base, news, announcements). 

The goal is to provide a fast and reliable search experience for learners, while adhering to the following architectural constraints:
1.  **Isolation**: The main Portal API must remain fully functional even if the search engine experiences downtime.
2.  **Domain Ownership**: The search index must be purely "derived data". It cannot act as the authoritative source of truth.
3.  **V1 Scope limitations**: Semantic, vector-based, or AI-driven search is out of scope for V1. We need a deterministic engine.

## Decision

1.  **Search Engine**: We have selected **Meilisearch** as the core search engine for V1.
    *   It is significantly lighter and easier to maintain locally compared to Elasticsearch or OpenSearch.
    *   It provides excellent out-of-the-box features like typo tolerance, fast prefix search, and sensible default ranking rules.
2.  **Asynchronous Indexing Strategy**: We will implement a dedicated background worker (`search-worker`) written in Go.
    *   This worker will periodically poll the authoritative data sources (`portal-db` and Moodle APIs/databases) for updates via a delta-sync mechanism (using `updated_at` timestamps).
    *   The `search-worker` will format the data into a unified schema (using deterministic IDs like `<type>_<id>`) and push it to Meilisearch.
3.  **Portal API Integration**: The Portal API will communicate with Meilisearch via a new adapter (`search` domain). 
    *   The `/api/v1/search` endpoint will securely proxy the query to Meilisearch using a read-only or search-specific key, while ensuring the Portal API gracefully handles connection failures to the search engine (returning a standard 503 Service Unavailable with Problem Details) without crashing.

## Consequences

*   **Positive**: The architecture remains modular, and search failures do not bring down the entire learning platform. Local development overhead remains low due to Meilisearch's small resource footprint.
*   **Negative / Risk**: Delta-synchronization via polling introduces a slight delay (eventual consistency) between content creation and search availability. The `search-worker` must be robustly designed to handle partial sync failures.

## Compliance

This decision adheres to the strict requirement of keeping Portal API functional during search outages and treating search as derived data.
