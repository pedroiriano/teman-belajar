export type BannerAlign = "left" | "center" | "right";

export interface HeroBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cta_label?: string;
  cta_href?: string;
  align: BannerAlign;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBannerPayload {
  title: string;
  description: string;
  image_url: string;
  cta_label?: string;
  cta_href?: string;
  align: BannerAlign;
  sort_order: number;
  is_active: boolean;
}

export interface UpdateBannerPayload {
  title: string;
  description: string;
  image_url: string;
  cta_label?: string;
  cta_href?: string;
  align: BannerAlign;
  sort_order: number;
  is_active: boolean;
}
