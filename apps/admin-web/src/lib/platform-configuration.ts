export type PlatformNavigationItem = { label: string; description?: string; href: string; visible: boolean };
export type PlatformSection = { key: string; visible: boolean; order: number };
export type PlatformFeature = { key: string; label: string; visible: boolean };
export type PlatformConfiguration = {
  identity: { tagline: string; logo_media_id?: string };
  homepage: { sections: PlatformSection[] };
  navigation: PlatformNavigationItem[];
  banner: { enabled: boolean; title: string; body: string; href?: string; media_id?: string };
  footer: { summary: string; links: PlatformNavigationItem[] };
  contact: { help_label: string; help_href: string; email?: string };
  seo: { default_title: string; default_description: string; social_media_id?: string };
  features: PlatformFeature[];
};

export type PlatformRevision = { id: string; version: number; status: "draft" | "published" | "superseded"; config: PlatformConfiguration; based_on_version?: number; created_at: string; published_at?: string };
export type PlatformConfigurationState = { head_version: number; draft?: PlatformRevision; published?: PlatformRevision; versions: PlatformRevision[] };

export const defaultPlatformConfiguration: PlatformConfiguration = {
  identity: { tagline: "Pengalaman Belajar" },
  homepage: { sections: ["hero", "trust", "learning_paths", "topics", "knowledge", "media", "stats", "faq", "cta"].map((key, index) => ({ key, visible: true, order: index + 1 })) },
  navigation: [
    { label: "Pelatihan Penuh", description: "Program terstruktur melalui Moodle.", href: "/training-programs", visible: true },
    { label: "Pembelajaran Singkat", description: "Materi editorial 3–15 menit.", href: "/microlearning", visible: true },
    { label: "Pusat Pengetahuan", description: "Panduan terkurasi.", href: "/knowledge", visible: true },
  ],
  banner: { enabled: false, title: "", body: "", href: "" },
  footer: { summary: "Ruang belajar terpadu untuk menemukan wawasan, mengikuti pembelajaran formal, dan bertumbuh bersama organisasi.", links: [{ label: "Pusat Pengetahuan", href: "/knowledge", visible: true }, { label: "FAQ", href: "/help", visible: true }] },
  contact: { help_label: "Pusat Bantuan", help_href: "/help", email: "" },
  seo: { default_title: "Teman Belajar", default_description: "Platform pengalaman belajar digital perusahaan untuk belajar, berbagi pengetahuan, dan bertumbuh bersama." },
  features: [
    { key: "training_programs", label: "Pelatihan Penuh", visible: true },
    { key: "microlearning", label: "Pembelajaran Singkat", visible: true },
    { key: "knowledge", label: "Pusat Pengetahuan", visible: true },
    { key: "faq", label: "FAQ", visible: true },
  ],
};

export const sectionLabels: Record<string, string> = { hero: "Hero", trust: "Fondasi platform", learning_paths: "Jalur belajar", topics: "Topik", knowledge: "Konten organisasi", media: "Media", stats: "Statistik ringkas", faq: "FAQ", cta: "Ajakan masuk" };
