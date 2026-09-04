export type WorkflowStatus = "draft" | "in_review" | "approved" | "published" | "archived";

export interface WorkflowItem {
  id: string;
  title: string;
  module: string;
  status: string;
  author: string;
  updated_at: string;
}

export interface WorkflowResponse {
  data: WorkflowItem[];
}

export interface WorkflowColumn {
  id: WorkflowStatus;
  title: string;
  description: string;
  accentClass: string;
  badgeClass: string;
  emptyText: string;
}
