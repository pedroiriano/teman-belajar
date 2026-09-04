/**
 * Content Versioning & Revision Types
 * Cuba Admin Foundation Palette (Sky, Emerald, Slate, Rose)
 */

export type VersioningModule = "knowledge" | "news" | "announcements";

export interface ContentRevision {
  id: string;
  articleId: string;
  revisionNo: number;
  module: VersioningModule;
  title: string;
  body: string;
  summary?: string;
  authorName?: string;
  authorId?: string;
  createdAt: string;
  status?: string;
  isCurrent?: boolean;
  isPublished?: boolean;
}

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  leftLineNo?: number;
  rightLineNo?: number;
  content: string;
}

export interface DiffSummary {
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export interface DiffResult {
  lines: DiffLine[];
  summary: DiffSummary;
  baseRevisionNo: number;
  compareRevisionNo: number;
}

export interface RevisionTimelineItem {
  id: string;
  revisionNo: number;
  actorName: string;
  action: string;
  timestamp: string;
  notes?: string;
  status: string;
}

export interface RollbackResult {
  success: boolean;
  error?: string;
  newRevisionNo?: number;
  message?: string;
}
