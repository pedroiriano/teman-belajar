import "server-only";

export type PublicPlatformConfiguration = {
  identity: { tagline: string; logo_media_id?: string };
  homepage: { sections: Array<{ key: string; visible: boolean; order: number }> };
  navigation: Array<{ label: string; description?: string; href: string; visible: boolean }>;
  banner: { enabled: boolean; title: string; body: string; href?: string; media_id?: string };
  footer: { summary: string; links: Array<{ label: string; href: string; visible: boolean }> };
  contact: { help_label: string; help_href: string; email?: string };
  seo: { default_title: string; default_description: string; social_media_id?: string };
  features: Array<{ key: string; label: string; visible: boolean }>;
};

const keys = ["hero", "trust", "learning_paths", "topics", "knowledge", "media", "stats", "faq", "cta"];
export const safePlatformFallback: PublicPlatformConfiguration = {
  identity: { tagline: "Pengalaman Belajar" }, homepage: { sections: keys.map((key, index) => ({ key, visible: true, order: index + 1 })) },
  navigation: [{ label: "Pelatihan Penuh", description: "Program terstruktur melalui Moodle.", href: "/training-programs", visible: true }, { label: "Pembelajaran Singkat", description: "Materi editorial 3–15 menit.", href: "/microlearning", visible: true }, { label: "Pusat Pengetahuan", description: "Panduan terkurasi.", href: "/knowledge", visible: true }],
  banner: { enabled: false, title: "", body: "" }, footer: { summary: "Ruang belajar terpadu untuk menemukan wawasan, mengikuti pembelajaran formal, dan bertumbuh bersama organisasi.", links: [{ label: "Pusat Pengetahuan", href: "/knowledge", visible: true }, { label: "FAQ", href: "/help", visible: true }] },
  contact: { help_label: "Pusat Bantuan", help_href: "/help" }, seo: { default_title: "Teman Belajar", default_description: "Platform pengalaman belajar digital perusahaan untuk belajar, berbagi pengetahuan, dan bertumbuh bersama." },
  features: [{ key: "training_programs", label: "Pelatihan Penuh", visible: true }, { key: "microlearning", label: "Pembelajaran Singkat", visible: true }, { key: "knowledge", label: "Pusat Pengetahuan", visible: true }, { key: "faq", label: "FAQ", visible: true }],
};

export async function getPublicPlatformConfiguration(): Promise<PublicPlatformConfiguration> {
  try {
    const response = await fetch(`${process.env.PORTAL_API_INTERNAL_URL || "http://api:8080"}/api/v1/platform-configuration`, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return safePlatformFallback;
    const payload = await response.json() as { config?: PublicPlatformConfiguration };
    return payload.config || safePlatformFallback;
  } catch { return safePlatformFallback; }
}

export function publicMediaPath(id?: string) { return id ? `/api/v1/media/${encodeURIComponent(id)}/content` : undefined; }
