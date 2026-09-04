"use client";

import { useState } from "react";
import MediaPicker from "@/components/media/MediaPicker";
import type { MediaSelection } from "@/components/media/types";
import { AdminIcon } from "@/components/admin-icon";
import {
  defaultPlatformConfiguration,
  sectionLabels,
  type PlatformConfiguration,
  type PlatformConfigurationState,
  type PlatformNavigationItem,
} from "@/lib/platform-configuration";

type Props = { initialState: PlatformConfigurationState };

async function requestJSON<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/bff/platform-configuration/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || payload.title || "Operasi konfigurasi gagal");
  return payload as T;
}

const emptyLink = (): PlatformNavigationItem => ({ label: "", description: "", href: "/", visible: true });

export function PlatformConfigurationEditor({ initialState }: Props) {
  const [state, setState] = useState(initialState);
  const [config, setConfig] = useState<PlatformConfiguration>(() =>
    structuredClone(initialState.draft?.config || initialState.published?.config || defaultPlatformConfiguration)
  );
  const [preview, setPreview] = useState<PlatformConfiguration | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Operasi gagal");
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      const revision = await requestJSON<{ version: number; config: PlatformConfiguration }>("draft", "PUT", {
        expected_version: state.head_version,
        config,
      });
      setState((value) => ({
        ...value,
        head_version: revision.version,
        draft: { ...revision, id: "", status: "draft", created_at: new Date().toISOString() },
        versions: [{ ...revision, id: "", status: "draft", created_at: new Date().toISOString() }, ...value.versions],
      }));
      setMessage(`Draf versi ${revision.version} tersimpan.`);
    });

  const showPreview = () =>
    run(async () => {
      const snapshot = await requestJSON<{ config: PlatformConfiguration }>("preview", "GET");
      setPreview(snapshot.config);
      setMessage("Pratinjau privat dimuat dari draf tersimpan.");
    });

  const publish = () =>
    run(async () => {
      if (!state.draft) throw new Error("Simpan draf sebelum menerbitkan.");
      const revision = await requestJSON<{ version: number; config: PlatformConfiguration }>("publish", "POST", {
        version: state.draft.version,
      });
      setState((value) => ({
        ...value,
        draft: undefined,
        published: {
          ...revision,
          id: value.draft?.id || "",
          status: "published",
          created_at: value.draft?.created_at || new Date().toISOString(),
        },
        versions: value.versions.map((item) =>
          item.version === revision.version
            ? { ...item, status: "published" }
            : item.status === "published"
            ? { ...item, status: "superseded" }
            : item
        ),
      }));
      setMessage(`Versi ${revision.version} diterbitkan secara atomik.`);
    });

  const rollback = (sourceVersion: number) =>
    run(async () => {
      const revision = await requestJSON<{ version: number; config: PlatformConfiguration }>("rollback", "POST", {
        source_version: sourceVersion,
        expected_version: state.head_version,
      });
      setConfig(revision.config);
      setPreview(null);
      setState((value) => ({
        ...value,
        head_version: revision.version,
        draft: undefined,
        published: {
          ...revision,
          id: "",
          status: "published",
          created_at: new Date().toISOString(),
          based_on_version: sourceVersion,
        },
        versions: [
          {
            ...revision,
            id: "",
            status: "published",
            created_at: new Date().toISOString(),
            based_on_version: sourceVersion,
          },
          ...value.versions.map((item) => ({
            ...item,
            status: item.status === "published" ? ("superseded" as const) : item.status,
          })),
        ],
      }));
      setMessage(`Rollback membuat versi baru ${revision.version}.`);
    });

  const updateLink = (collection: "navigation" | "footer", index: number, patch: Partial<PlatformNavigationItem>) =>
    setConfig((value) => {
      const links = collection === "navigation" ? [...value.navigation] : [...value.footer.links];
      links[index] = { ...links[index], ...patch };
      return collection === "navigation" ? { ...value, navigation: links } : { ...value, footer: { ...value.footer, links } };
    });

  const setMedia = (field: "logo" | "banner" | "social", selection: MediaSelection) =>
    setConfig((value) =>
      field === "logo"
        ? { ...value, identity: { ...value.identity, logo_media_id: selection.id } }
        : field === "banner"
        ? { ...value, banner: { ...value.banner, media_id: selection.id } }
        : { ...value, seo: { ...value.seo, social_media_id: selection.id } }
    );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
      <div className="grid gap-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 dark:border-rose-900/50 dark:bg-rose-950/30 p-4 text-sm font-bold text-rose-800 dark:text-rose-300" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-500/10 p-4 text-sm font-bold text-sky-900 dark:text-sky-300" role="status">
            {message}
          </div>
        )}

        {/* Identitas Tetap */}
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Identitas Tetap
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Presentasi Teman Belajar
              </h2>
            </div>
            <span className="admin-status inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Nama produk terkunci
            </span>
          </div>
          <div className="p-4 sm:p-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Tagline
              <input
                className="admin-input"
                maxLength={120}
                value={config.identity.tagline}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    identity: { ...value.identity, tagline: event.target.value },
                  }))
                }
              />
            </label>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Logo dari Pustaka Media
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <MediaPicker
                  imageOnly
                  buttonLabel="Pilih logo"
                  onSelect={(selection) => setMedia("logo", selection)}
                />
                {config.identity.logo_media_id && (
                  <>
                    <code className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {config.identity.logo_media_id}
                    </code>
                    <button
                      className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
                      type="button"
                      onClick={() =>
                        setConfig((value) => ({
                          ...value,
                          identity: { ...value.identity, logo_media_id: undefined },
                        }))
                      }
                    >
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Beranda Section Visibility & Order */}
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
            <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Beranda
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Urutan dan Visibilitas Section
            </h2>
          </div>
          <div className="p-4 sm:p-5 grid gap-3 sm:grid-cols-2">
            {config.homepage.sections.map((section, index) => (
              <div
                key={section.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5"
              >
                <label className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 accent-sky-600"
                    checked={section.visible}
                    onChange={(event) =>
                      setConfig((value) => ({
                        ...value,
                        homepage: {
                          sections: value.homepage.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, visible: event.target.checked } : item
                          ),
                        },
                      }))
                    }
                  />
                  <span>{sectionLabels[section.key] || section.key}</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`section-order-${section.key}`}>
                    Urutan {section.key}
                  </label>
                  <span className="text-xs text-slate-400">Urutan:</span>
                  <input
                    id={`section-order-${section.key}`}
                    className="admin-input w-16 text-center font-bold"
                    type="number"
                    min={1}
                    max={9}
                    value={section.order}
                    onChange={(event) =>
                      setConfig((value) => ({
                        ...value,
                        homepage: {
                          sections: value.homepage.sections.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, order: Number(event.target.value) } : item
                          ),
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Navigasi Publik */}
        <LinkEditor
          title="Navigasi publik"
          links={config.navigation}
          onChange={(index, patch) => updateLink("navigation", index, patch)}
          onAdd={() =>
            setConfig((value) => ({
              ...value,
              navigation: [...value.navigation, emptyLink()],
            }))
          }
          onRemove={(index) =>
            setConfig((value) => ({
              ...value,
              navigation: value.navigation.filter((_, itemIndex) => itemIndex !== index),
            }))
          }
        />

        {/* Banner Pengumuman */}
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Banner
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pengumuman Presentasi
              </h2>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 accent-sky-600"
                checked={config.banner.enabled}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    banner: { ...value.banner, enabled: event.target.checked },
                  }))
                }
              />
              <span>Aktif</span>
            </label>
          </div>
          <div className="p-4 sm:p-5 grid gap-4">
            <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Judul
              <input
                className="admin-input"
                maxLength={120}
                value={config.banner.title}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    banner: { ...value.banner, title: event.target.value },
                  }))
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Isi
              <textarea
                className="admin-input min-h-24"
                maxLength={400}
                value={config.banner.body}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    banner: { ...value.banner, body: event.target.value },
                  }))
                }
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Tautan aman
              <input
                className="admin-input"
                value={config.banner.href || ""}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    banner: { ...value.banner, href: event.target.value },
                  }))
                }
              />
            </label>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Gambar Banner
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <MediaPicker
                  imageOnly
                  buttonLabel="Pilih gambar banner"
                  onSelect={(selection) => setMedia("banner", selection)}
                />
                {config.banner.media_id && (
                  <code className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {config.banner.media_id}
                  </code>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer, Bantuan, dan SEO */}
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Footer, Bantuan, dan SEO
            </h2>
          </div>
          <div className="p-4 sm:p-5 grid gap-4">
            <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Ringkasan footer
              <textarea
                className="admin-input min-h-24"
                maxLength={400}
                value={config.footer.summary}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    footer: { ...value.footer, summary: event.target.value },
                  }))
                }
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                Label bantuan
                <input
                  className="admin-input"
                  value={config.contact.help_label}
                  onChange={(event) =>
                    setConfig((value) => ({
                      ...value,
                      contact: { ...value.contact, help_label: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                Tautan bantuan
                <input
                  className="admin-input"
                  value={config.contact.help_href}
                  onChange={(event) =>
                    setConfig((value) => ({
                      ...value,
                      contact: { ...value.contact, help_href: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                Email kontak
                <input
                  className="admin-input"
                  type="email"
                  value={config.contact.email || ""}
                  onChange={(event) =>
                    setConfig((value) => ({
                      ...value,
                      contact: { ...value.contact, email: event.target.value },
                    }))
                  }
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                Judul SEO bawaan
                <input
                  className="admin-input"
                  maxLength={70}
                  value={config.seo.default_title}
                  onChange={(event) =>
                    setConfig((value) => ({
                      ...value,
                      seo: { ...value.seo, default_title: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Deskripsi SEO bawaan
              <textarea
                className="admin-input min-h-20"
                maxLength={180}
                value={config.seo.default_description}
                onChange={(event) =>
                  setConfig((value) => ({
                    ...value,
                    seo: { ...value.seo, default_description: event.target.value },
                  }))
                }
              />
            </label>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Gambar Sosial (Open Graph)
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <MediaPicker
                  imageOnly
                  buttonLabel="Pilih gambar sosial"
                  onSelect={(selection) => setMedia("social", selection)}
                />
                {config.seo.social_media_id && (
                  <code className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {config.seo.social_media_id}
                  </code>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tautan Footer */}
        <LinkEditor
          title="Tautan footer"
          links={config.footer.links}
          onChange={(index, patch) => updateLink("footer", index, patch)}
          onAdd={() =>
            setConfig((value) => ({
              ...value,
              footer: { ...value.footer, links: [...value.footer.links, emptyLink()] },
            }))
          }
          onRemove={(index) =>
            setConfig((value) => ({
              ...value,
              footer: {
                ...value.footer,
                links: value.footer.links.filter((_, itemIndex) => itemIndex !== index),
              },
            }))
          }
        />

        {/* Presentasi Fitur Aktif */}
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
            <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Presentasi Fitur Aktif
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Label dan Visibilitas
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tidak mengubah route atau authorization.
            </p>
          </div>
          <div className="p-4 sm:p-5 grid gap-3 md:grid-cols-2">
            {config.features.map((feature, index) => (
              <div
                key={feature.key}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5"
              >
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 accent-sky-600"
                    checked={feature.visible}
                    onChange={(event) =>
                      setConfig((value) => ({
                        ...value,
                        features: value.features.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, visible: event.target.checked } : item
                        ),
                      }))
                    }
                  />
                  <span>{feature.key}</span>
                </label>
                <input
                  className="admin-input mt-2"
                  maxLength={80}
                  value={feature.label}
                  onChange={(event) =>
                    setConfig((value) => ({
                      ...value,
                      features: value.features.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky Aside Publication Panel */}
      <aside className="grid content-start gap-6 xl:sticky xl:top-6 xl:self-start">
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="admin-kicker text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Versi {state.head_version}
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Publikasi
              </h2>
            </div>
            {state.draft && (
              <span className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Ada draf
              </span>
            )}
          </div>
          <div className="p-4 sm:p-5 grid gap-3">
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
              onClick={save}
            >
              <AdminIcon name="file" className="h-4 w-4" />
              <span>Simpan draf</span>
            </button>
            <button
              type="button"
              disabled={busy || !state.draft}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
              onClick={showPreview}
            >
              <AdminIcon name="dashboard" className="h-4 w-4" />
              <span>Pratinjau privat</span>
            </button>
            <button
              type="button"
              disabled={busy || !state.draft}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              onClick={publish}
            >
              <AdminIcon name="audit" className="h-4 w-4" />
              <span>Terbitkan draf</span>
            </button>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Optimistic versioning mencegah perubahan tertimpa. Publish dan rollback bersifat atomik.
            </p>
          </div>
        </section>

        {/* Private Preview Box */}
        {preview && (
          <section
            className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            aria-label="Pratinjau privat"
          >
            <div className="bg-sky-600 px-5 py-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-100">
                Pratinjau Admin
              </p>
              <p className="mt-1 text-lg font-black">Teman Belajar</p>
              <p className="text-xs text-sky-100">{preview.identity.tagline}</p>
            </div>
            {preview.banner.enabled && (
              <div className="border-b border-sky-100 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30 p-4">
                <p className="font-bold text-slate-900 dark:text-white">{preview.banner.title}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{preview.banner.body}</p>
              </div>
            )}
            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Navigasi
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {preview.navigation
                  .filter((item) => item.visible)
                  .map((item) => (
                    <span
                      key={`${item.label}-${item.href}`}
                      className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {item.label}
                    </span>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* Riwayat Immutable */}
        <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Riwayat Immutable
            </h2>
          </div>
          <div className="p-4 sm:p-5 grid gap-3 max-h-[460px] overflow-y-auto">
            {state.versions.length ? (
              state.versions.map((revision) => (
                <div
                  key={revision.version}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Versi {revision.version}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        revision.status === "published"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                          : revision.status === "draft"
                          ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {revision.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(revision.created_at).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })}
                  </p>
                  {revision.status === "superseded" && (
                    <button
                      type="button"
                      disabled={busy}
                      className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      onClick={() => rollback(revision.version)}
                    >
                      <span>Rollback sebagai versi baru</span>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada versi tersimpan.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function LinkEditor({
  title,
  links,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  links: PlatformNavigationItem[];
  onChange: (index: number, patch: Partial<PlatformNavigationItem>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="cuba-form-card rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        <button
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          type="button"
          onClick={onAdd}
        >
          <span>+ Tambah tautan</span>
        </button>
      </div>
      <div className="p-4 sm:p-5 grid gap-4">
        {links.map((link, index) => (
          <fieldset
            key={index}
            className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 md:grid-cols-2"
          >
            <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tautan {index + 1}
            </legend>
            <label className="grid gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              Label
              <input
                className="admin-input"
                value={link.label}
                maxLength={80}
                onChange={(event) => onChange(index, { label: event.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              Path internal / HTTPS allowlist
              <input
                className="admin-input"
                value={link.href}
                onChange={(event) => onChange(index, { href: event.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 md:col-span-2">
              Deskripsi
              <input
                className="admin-input"
                value={link.description || ""}
                maxLength={180}
                onChange={(event) => onChange(index, { description: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 accent-sky-600"
                checked={link.visible}
                onChange={(event) => onChange(index, { visible: event.target.checked })}
              />
              <span>Tampilkan</span>
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-self-start md:justify-self-end rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
              onClick={() => onRemove(index)}
            >
              Hapus
            </button>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
