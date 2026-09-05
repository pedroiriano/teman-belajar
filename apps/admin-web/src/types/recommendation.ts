export interface RecommendationPinItem {
  id: string;
  target_type: "knowledge" | "microlearning" | "course" | "news";
  target_id: string;
  title: string;
  pinned: boolean;
  weight: number;
  pinned_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRecommendationPinInput {
  target_type: "knowledge" | "microlearning" | "course" | "news";
  target_id: string;
  title: string;
  weight: number;
}
