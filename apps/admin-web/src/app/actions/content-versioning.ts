"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { broadcastEditorialUpdate } from "@/lib/notifications/stream-hub";
import { computeLineDiff } from "@/lib/diff/diff-engine";
import type {
  ContentRevision,
  DiffResult,
  RollbackResult,
  VersioningModule,
} from "@/types/content-versioning";
import { emptySEOValue } from "@/components/seo/types";
import { getAdminKnowledgeDetailAction, createKnowledgeRevisionAction } from "./knowledge";
import { updateNewsAction, updateAnnouncementAction } from "./cms";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://api:8080";

/**
 * Retrieves all revisions of an article across modules (knowledge, news, announcements).
 */
export async function getContentRevisionsAction(
  module: VersioningModule,
  articleId: string
): Promise<{ success: boolean; data?: ContentRevision[]; error?: string }> {
  const session: any = await getServerSession(authOptions);
  const accessToken = await getServerAccessToken();

  if (!session || !accessToken) {
    return { success: false, error: "Sesi telah berakhir, silakan masuk kembali." };
  }

  try {
    if (module === "knowledge") {
      const [articleRes, revsRes] = await Promise.all([
        getAdminKnowledgeDetailAction(articleId),
        fetch(`${API_BASE}/api/v1/admin/knowledge/${articleId}/revisions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (!articleRes.success || !articleRes.data) {
        return { success: false, error: articleRes.error || "Gagal memuat artikel pengetahuan." };
      }

      const article = articleRes.data;
      let rawRevs: any[] = [];
      if (revsRes.ok) {
        rawRevs = await revsRes.json();
      }

      // If backend has no list or just single revision, synthesize from article
      if (!Array.isArray(rawRevs) || rawRevs.length === 0) {
        const currentRev: ContentRevision = {
          id: article.current_revision_id || `${article.id}-rev-${article.current_revision_no || 1}`,
          articleId: article.id,
          revisionNo: article.current_revision_no || 1,
          module: "knowledge",
          title: article.title,
          body: article.body || "",
          summary: article.summary,
          authorName: session.user?.name || "Kontributor",
          createdAt: article.updated_at || article.created_at,
          status: article.status,
          isCurrent: true,
          isPublished: article.status === "published",
        };
        return { success: true, data: [currentRev] };
      }

      const revisions: ContentRevision[] = rawRevs.map((rev) => {
        const isCur = rev.revision_no === article.current_revision_no;
        const isPub = rev.revision_no === article.published_revision_no;
        return {
          id: rev.id,
          articleId: rev.article_id,
          revisionNo: rev.revision_no,
          module: "knowledge",
          title: article.title,
          body: rev.body || "",
          summary: article.summary,
          authorId: rev.author_id,
          authorName: rev.author_id ? "Editor Pembelajaran" : "Sistem",
          createdAt: rev.created_at,
          status: isCur ? article.status : isPub ? "published" : "archived",
          isCurrent: isCur,
          isPublished: isPub,
        };
      });

      return { success: true, data: revisions };
    }

    if (module === "news") {
      const [newsRes, revsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/news/${articleId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE}/api/v1/admin/news/${articleId}/revisions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (!newsRes.ok) {
        return { success: false, error: "Gagal memuat data berita." };
      }

      const news = await newsRes.json();
      const currentVer = news.version || 1;

      let rawRevs: any[] = [];
      if (revsRes.ok) {
        rawRevs = await revsRes.json();
      }

      if (!Array.isArray(rawRevs) || rawRevs.length === 0) {
        const currentRev: ContentRevision = {
          id: `${news.id}-v${currentVer}`,
          articleId: news.id,
          revisionNo: currentVer,
          module: "news",
          title: news.title,
          body: news.body || "",
          summary: news.excerpt,
          authorName: session.user?.name || "Editor Berita",
          createdAt: news.updated_at || news.created_at,
          status: news.status,
          isCurrent: true,
          isPublished: news.status === "published",
        };
        return { success: true, data: [currentRev] };
      }

      const revisions: ContentRevision[] = rawRevs.map((rev) => {
        const isCur = rev.revision_no === currentVer;
        return {
          id: rev.id,
          articleId: rev.news_id,
          revisionNo: rev.revision_no,
          module: "news",
          title: rev.title || news.title,
          body: rev.body || "",
          summary: rev.excerpt || news.excerpt,
          authorId: rev.author_id,
          authorName: rev.author_id ? "Editor Berita" : session.user?.name || "Sistem",
          createdAt: rev.created_at,
          status: isCur ? news.status : "archived",
          isCurrent: isCur,
          isPublished: isCur && news.status === "published",
        };
      });

      return { success: true, data: revisions };
    }

    if (module === "announcements") {
      const [annRes, revsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/announcements/${articleId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE}/api/v1/admin/announcements/${articleId}/revisions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (!annRes.ok) {
        return { success: false, error: "Gagal memuat data pengumuman." };
      }

      const ann = await annRes.json();
      const currentVer = ann.version || 1;

      let rawRevs: any[] = [];
      if (revsRes.ok) {
        rawRevs = await revsRes.json();
      }

      if (!Array.isArray(rawRevs) || rawRevs.length === 0) {
        const currentRev: ContentRevision = {
          id: `${ann.id}-v${currentVer}`,
          articleId: ann.id,
          revisionNo: currentVer,
          module: "announcements",
          title: ann.title,
          body: ann.body || "",
          authorName: session.user?.name || "Administrator",
          createdAt: ann.updated_at || ann.created_at,
          status: ann.status,
          isCurrent: true,
          isPublished: ann.status === "published",
        };
        return { success: true, data: [currentRev] };
      }

      const revisions: ContentRevision[] = rawRevs.map((rev) => {
        const isCur = rev.revision_no === currentVer;
        return {
          id: rev.id,
          articleId: rev.announcement_id,
          revisionNo: rev.revision_no,
          module: "announcements",
          title: rev.title || ann.title,
          body: rev.body || "",
          authorId: rev.author_id,
          authorName: rev.author_id ? "Administrator" : session.user?.name || "Sistem",
          createdAt: rev.created_at,
          status: isCur ? ann.status : "archived",
          isCurrent: isCur,
          isPublished: isCur && ann.status === "published",
        };
      });

      return { success: true, data: revisions };
    }

    return { success: false, error: "Modul konten tidak dikenali." };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal memproses riwayat perubahan." };
  }
}

/**
 * Calculates line-by-line diff between two revisions of an article.
 */
export async function getRevisionDiffAction(
  module: VersioningModule,
  articleId: string,
  baseRevNo: number,
  compareRevNo: number
): Promise<{ success: boolean; data?: DiffResult; error?: string }> {
  const revisionsRes = await getContentRevisionsAction(module, articleId);
  if (!revisionsRes.success || !revisionsRes.data) {
    return { success: false, error: revisionsRes.error || "Gagal memuat revisi untuk perbandingan." };
  }

  const revA = revisionsRes.data.find((r) => r.revisionNo === baseRevNo);
  const revB = revisionsRes.data.find((r) => r.revisionNo === compareRevNo);

  if (!revA || !revB) {
    return { success: false, error: "Salah satu revisi yang dipilih tidak ditemukan." };
  }

  const diffResult = computeLineDiff(revA.body, revB.body, baseRevNo, compareRevNo);
  return { success: true, data: diffResult };
}

/**
 * Performs a rollback to a previous revision.
 */
export async function rollbackRevisionAction(
  module: VersioningModule,
  articleId: string,
  targetRevisionNo: number
): Promise<RollbackResult> {
  const session: any = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Sesi telah berakhir, silakan masuk kembali." };
  }

  const revisionsRes = await getContentRevisionsAction(module, articleId);
  if (!revisionsRes.success || !revisionsRes.data) {
    return { success: false, error: revisionsRes.error || "Gagal memuat riwayat revisi." };
  }

  const targetRev = revisionsRes.data.find((r) => r.revisionNo === targetRevisionNo);
  if (!targetRev) {
    return { success: false, error: `Revisi #${targetRevisionNo} tidak ditemukan.` };
  }

  const currentRev = revisionsRes.data.find((r) => r.isCurrent);

  try {
    if (module === "knowledge") {
      const expectedRev = currentRev ? currentRev.revisionNo : 1;
      const res = await createKnowledgeRevisionAction(articleId, {
        body: targetRev.body,
        expected_revision_no: expectedRev,
        seo: emptySEOValue(),
      });

      if (!res.success) {
        return { success: false, error: res.error || "Gagal memulihkan revisi pengetahuan." };
      }

      broadcastEditorialUpdate({
        id: articleId,
        title: targetRev.title,
        module: "knowledge",
        module_label: "Pengetahuan",
        action: "draft",
        action_label: "Dipulihkan ke Draf",
        reviewer_name: session.user?.name || "Admin",
        deep_link: `/dashboard/knowledge/${articleId}`,
        timestamp: new Date().toISOString(),
      });

      revalidatePath(`/dashboard/knowledge/${articleId}`);
      revalidatePath("/dashboard/knowledge");

      return {
        success: true,
        newRevisionNo: expectedRev + 1,
        message: `Konten berhasil dipulihkan ke format Revisi #${targetRevisionNo}.`,
      };
    }

    if (module === "news") {
      const res = await updateNewsAction(articleId, {
        title: targetRev.title,
        slug: targetRev.title.toLowerCase().replace(/\s+/g, "-"),
        excerpt: targetRev.summary || "",
        body: targetRev.body,
        expected_version: currentRev ? currentRev.revisionNo : 1,
        seo: emptySEOValue(),
      });

      if (!res.success) {
        return { success: false, error: res.error || "Gagal memulihkan versi berita." };
      }

      broadcastEditorialUpdate({
        id: articleId,
        title: targetRev.title,
        module: "news",
        module_label: "Berita",
        action: "draft",
        action_label: "Dipulihkan ke Draf",
        reviewer_name: session.user?.name || "Admin",
        deep_link: `/dashboard/news/${articleId}`,
        timestamp: new Date().toISOString(),
      });

      revalidatePath(`/dashboard/news/${articleId}`);
      revalidatePath("/dashboard/news");

      return {
        success: true,
        message: `Berita berhasil dipulihkan ke versi #${targetRevisionNo}.`,
      };
    }

    if (module === "announcements") {
      const res = await updateAnnouncementAction(articleId, {
        title: targetRev.title,
        slug: targetRev.title.toLowerCase().replace(/\s+/g, "-"),
        body: targetRev.body,
        start_at: null,
        end_at: null,
        expected_version: currentRev ? currentRev.revisionNo : 1,
        seo: emptySEOValue(),
      });

      if (!res.success) {
        return { success: false, error: res.error || "Gagal memulihkan versi pengumuman." };
      }

      broadcastEditorialUpdate({
        id: articleId,
        title: targetRev.title,
        module: "announcements",
        module_label: "Pengumuman",
        action: "draft",
        action_label: "Dipulihkan ke Draf",
        reviewer_name: session.user?.name || "Admin",
        deep_link: `/dashboard/announcements/${articleId}`,
        timestamp: new Date().toISOString(),
      });

      revalidatePath(`/dashboard/announcements/${articleId}`);
      revalidatePath("/dashboard/announcements");

      return {
        success: true,
        message: `Pengumuman berhasil dipulihkan ke versi #${targetRevisionNo}.`,
      };
    }

    return { success: false, error: "Modul konten tidak didukung untuk rollback." };
  } catch (err: any) {
    return { success: false, error: err.message || "Terjadi kesalahan saat memulihkan versi." };
  }
}
