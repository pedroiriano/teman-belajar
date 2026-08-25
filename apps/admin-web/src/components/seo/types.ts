import type { DraftPayload } from "@/components/drafts/types";

export type TaxonomyTerm = {
  id: string;
  kind: "category" | "tag";
  domain?: string;
  slug: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  usage_count: number;
};

export type SEOFormValue = DraftPayload & {
  slug: string;
  category_id: string | null;
  tag_ids: string[];
  seo_title: string;
  meta_description: string;
  social_title: string;
  social_description: string;
  social_media_id: string | null;
  social_image_alt: string;
  indexable: string;
  canonical_path: string | null;
};

export const emptySEOValue = (slug = ""): SEOFormValue => ({
  slug, category_id: null, tag_ids: [], seo_title: "", meta_description: "",
  social_title: "", social_description: "", social_media_id: null, social_image_alt: "",
  indexable: "true", canonical_path: null,
});

export const pickSEOValue = (value: SEOFormValue): SEOFormValue => ({
  slug: value.slug,
  category_id: value.category_id,
  tag_ids: [...value.tag_ids],
  seo_title: value.seo_title,
  meta_description: value.meta_description,
  social_title: value.social_title,
  social_description: value.social_description,
  social_media_id: value.social_media_id,
  social_image_alt: value.social_image_alt,
  indexable: value.indexable,
  canonical_path: value.canonical_path,
});

export type DiscoverabilityProfile = {
  content_type: "news" | "announcement" | "knowledge";
  content_id: string;
  slug: string;
  category_id?: string;
  tag_ids: string[];
  seo_title: string;
  meta_description: string;
  social_title: string;
  social_description: string;
  social_media_id?: string;
  social_image_alt?: string;
  indexable: boolean;
  canonical_path?: string;
};

export const profileToSEOValue = (profile: DiscoverabilityProfile): SEOFormValue => ({
  slug: profile.slug,
  category_id: profile.category_id || null,
  tag_ids: profile.tag_ids || [],
  seo_title: profile.seo_title || "",
  meta_description: profile.meta_description || "",
  social_title: profile.social_title || "",
  social_description: profile.social_description || "",
  social_media_id: profile.social_media_id || null,
  social_image_alt: profile.social_image_alt || "",
  indexable: String(profile.indexable),
  canonical_path: profile.canonical_path || null,
});
