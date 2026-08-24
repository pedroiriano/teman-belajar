"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  archiveKnowledgeNodeAction,
  createKnowledgeNodeAction,
  getKnowledgeHierarchyAction,
  moveKnowledgeNodeAction,
  reorderKnowledgeNodesAction,
  updateKnowledgeNodeAction,
} from "@/app/actions/knowledge";
import { DraftStatus } from "@/components/drafts/DraftStatus";
import type { DraftPayload } from "@/components/drafts/types";
import { useAutoSaveDraft } from "@/components/drafts/use-auto-save-draft";
import {
  flattenKnowledgeNodes,
  knowledgeNodeTypeLabels,
  type KnowledgeNode,
  type KnowledgeNodeInput,
  type KnowledgeNodeType,
} from "@/types/knowledge-hierarchy";

const nodeTypes = Object.keys(knowledgeNodeTypeLabels) as KnowledgeNodeType[];
type NodeDraft = DraftPayload & { parent_id: string | null; type: KnowledgeNodeType; slug: string; title: string; description: string; sort_order: string };
const emptyNode: NodeDraft = { parent_id: null, type: "topic", slug: "", title: "", description: "", sort_order: "1" };

function siblingList(nodes: KnowledgeNode[], parentId?: string): KnowledgeNode[] {
  if (!parentId) return nodes;
  for (const node of nodes) {
    if (node.id === parentId) return node.children ?? [];
    const nested = siblingList(node.children ?? [], parentId);
    if (nested.length) return nested;
  }
  return [];
}

function HierarchyTree({ nodes, selectedId, onSelect, onReorder, readOnly, nested = false }: { nodes: KnowledgeNode[]; selectedId?: string; onSelect: (node: KnowledgeNode) => void; onReorder: (parentId: string | null, ordered: string[]) => Promise<void>; readOnly: boolean; nested?: boolean }) {
  return <ul role={nested ? "group" : "tree"} aria-label={nested ? undefined : "Struktur pengetahuan"} className="space-y-2">{nodes.map((node, index) => (
    <li key={node.id} role="treeitem" aria-expanded={node.children?.length ? true : undefined} aria-selected={selectedId === node.id}>
      <div className="admin-tree-row" aria-selected={selectedId === node.id}>
        <button type="button" onClick={() => onSelect(node)} className="min-w-0 flex-1 text-left focus-visible:rounded-lg">
          <span className="block truncate text-sm font-extrabold text-slate-900">{node.title}</span>
          <span className="block text-[11px] font-semibold text-slate-500">{knowledgeNodeTypeLabels[node.type]} · {node.article_count} artikel · v{node.version}{node.status === "archived" ? " · Arsip" : ""}</span>
        </button>
        {!readOnly ? <div className="flex gap-1" aria-label={`Urutan ${node.title}`}>
          <button type="button" className="admin-icon-button !h-8 !w-8" disabled={index === 0} aria-label={`Naikkan ${node.title}`} onClick={() => { const ids = nodes.map((item) => item.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; void onReorder(node.parent_id ?? null, ids); }}>↑</button>
          <button type="button" className="admin-icon-button !h-8 !w-8" disabled={index === nodes.length - 1} aria-label={`Turunkan ${node.title}`} onClick={() => { const ids = nodes.map((item) => item.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; void onReorder(node.parent_id ?? null, ids); }}>↓</button>
        </div> : null}
      </div>
      {node.children?.length ? <div className="ml-5 mt-2 border-l border-slate-200 pl-3"><HierarchyTree nodes={node.children} selectedId={selectedId} onSelect={onSelect} onReorder={onReorder} readOnly={readOnly} nested /></div> : null}
    </li>
  ))}</ul>;
}

function NodeEditor({ node, tree, readOnly, onSaved, onArchived, onCancel }: { node: KnowledgeNode | null; tree: KnowledgeNode[]; readOnly: boolean; onSaved: () => Promise<void>; onArchived: () => Promise<void>; onCancel: () => void }) {
  const initial = useMemo<NodeDraft>(() => node ? { parent_id: node.parent_id ?? null, type: node.type, slug: node.slug, title: node.title, description: node.description ?? "", sort_order: String(node.sort_order) } : emptyNode, [node]);
  const [form, setForm] = useState<NodeDraft>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const flat = useMemo(() => flattenKnowledgeNodes(tree), [tree]);
  const descendants = useMemo(() => {
    if (!node) return new Set<string>();
    const find = (items: KnowledgeNode[]): KnowledgeNode | undefined => items.find((item) => item.id === node.id) ?? items.map((item) => find(item.children ?? [])).find(Boolean);
    const current = find(tree);
    return new Set(current ? flattenKnowledgeNodes(current.children ?? []).map(({ node: item }) => item.id) : []);
  }, [node, tree]);
  const autoSave = useAutoSaveDraft({ formKey: node ? "knowledge-hierarchy.edit" : "knowledge-hierarchy.create", entityType: "knowledge_node", entityId: node?.id, baseEntityVersion: node ? String(node.version) : undefined, value: form, emptyValue: initial, enabled: !readOnly, onRecover: setForm, onStartNew: setForm });

  const set = <K extends keyof NodeDraft>(key: K, value: NodeDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    setSaving(true); setError("");
    const payload: KnowledgeNodeInput = { ...form, sort_order: Number(form.sort_order) };
    let result;
    if (!node) {
      result = await createKnowledgeNodeAction(payload);
    } else {
      result = await updateKnowledgeNodeAction(node.id, { type: form.type, slug: form.slug, title: form.title, description: form.description, version: node.version });
      if (result.success && (form.parent_id !== (node.parent_id ?? null) || Number(form.sort_order) !== node.sort_order)) {
        const updatedVersion = (result.data as KnowledgeNode).version;
        result = await moveKnowledgeNodeAction(node.id, { parent_id: form.parent_id, sort_order: Number(form.sort_order), version: updatedVersion });
      }
    }
    if (!result.success) { setError(result.error || "Struktur belum dapat disimpan"); setSaving(false); return; }
    await autoSave.finalize(); await onSaved(); setSaving(false);
  };

  const archive = async () => {
    if (!node || readOnly || !window.confirm(`Arsipkan “${node.title}”? Struktur dan breadcrumb turunannya tidak akan tampil di Portal.`)) return;
    setSaving(true); setError("");
    const result = await archiveKnowledgeNodeAction(node.id, node.version);
    if (!result.success) { setError(result.error || "Node belum dapat diarsipkan"); setSaving(false); return; }
    await autoSave.finalize(); await onArchived(); setSaving(false);
  };

  const siblings = siblingList(tree, form.parent_id ?? undefined).filter((item) => item.id !== node?.id);
  return <div>
    {!readOnly ? <DraftStatus state={autoSave.state} message={autoSave.message} lastSavedAt={autoSave.lastSavedAt} recovery={autoSave.recovery} onRecover={autoSave.recoverFrom} onKeepCurrent={autoSave.keepCurrent} onDiscard={autoSave.discard} onStartNew={autoSave.startNew} onRetry={autoSave.saveNow} allowStartNew={!node} /> : null}
    <form onSubmit={submit} className="admin-form-card mt-4">
      <div className="admin-form-header"><h2 className="font-black text-slate-900">{node ? "Edit node" : "Node baru"}</h2><p className="mt-1 text-xs text-slate-500">Metadata, induk, dan urutan divalidasi kembali oleh server.</p></div>
      <div className="admin-form-body">
        {error ? <div role="alert" className="admin-alert-error">{error}</div> : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="admin-label" htmlFor="node-title">Judul *</label><input id="node-title" className="admin-input mt-2" required maxLength={200} value={form.title} disabled={readOnly} onChange={(event) => { set("title", event.target.value); if (!node) set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} /></div>
          <div><label className="admin-label" htmlFor="node-slug">Slug *</label><input id="node-slug" className="admin-input mt-2" required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} disabled={readOnly} onChange={(event) => set("slug", event.target.value)} /></div>
          <div><label className="admin-label" htmlFor="node-type">Jenis *</label><select id="node-type" className="admin-input mt-2" required value={form.type} disabled={readOnly} onChange={(event) => set("type", event.target.value as KnowledgeNodeType)}>{nodeTypes.map((type) => <option key={type} value={type}>{knowledgeNodeTypeLabels[type]}</option>)}</select></div>
          <div><label className="admin-label" htmlFor="node-parent">Induk</label><select id="node-parent" className="admin-input mt-2" value={form.parent_id ?? ""} disabled={readOnly} onChange={(event) => set("parent_id", event.target.value || null)}><option value="">Akar struktur</option>{flat.filter(({ node: item }) => item.id !== node?.id && !descendants.has(item.id) && item.status === "active").map(({ node: item, path }) => <option key={item.id} value={item.id}>{path}</option>)}</select></div>
          <div><label className="admin-label" htmlFor="node-order">Urutan *</label><input id="node-order" className="admin-input mt-2" type="number" required min={1} max={Math.max(1, siblings.length + 1)} value={form.sort_order} disabled={readOnly} onChange={(event) => set("sort_order", event.target.value)} /></div>
          <div className="sm:col-span-2"><label className="admin-label" htmlFor="node-description">Deskripsi</label><textarea id="node-description" className="admin-input mt-2" rows={3} maxLength={1000} value={form.description} disabled={readOnly} onChange={(event) => set("description", event.target.value)} /></div>
        </div>
      </div>
      <div className="admin-form-footer"><div className="flex gap-2">{node && !readOnly && node.status === "active" ? <button type="button" className="admin-button-secondary !text-rose-700" onClick={() => void archive()} disabled={saving}>Arsipkan</button> : null}<button type="button" className="admin-button-secondary" onClick={onCancel}>Tutup</button></div>{!readOnly ? <button className="admin-button" disabled={saving}>{saving ? "Menyimpan…" : node ? "Simpan perubahan" : "Buat node"}</button> : <span className="admin-status bg-slate-100 text-slate-600">Mode baca Reviewer</span>}</div>
    </form>
  </div>;
}

export function KnowledgeHierarchyManager() {
  const [tree, setTree] = useState<KnowledgeNode[]>([]);
  const [selected, setSelected] = useState<KnowledgeNode | null>(null);
  const [creating, setCreating] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const readOnly = !roles.some((role) => role === "Portal Administrator" || role === "Content Editor");

  const reload = useCallback(async () => {
    const result = await getKnowledgeHierarchyAction(true);
    if (!result.success) { setMessage(result.error); setState("error"); return; }
    setTree(result.data.data ?? []); setRoles(result.roles ?? []); setState("ready"); setMessage("");
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const reorder = async (parentId: string | null, ordered: string[]) => {
    const result = await reorderKnowledgeNodesAction(parentId, ordered);
    if (!result.success) { setMessage(result.error || "Urutan belum dapat diperbarui"); return; }
    setSelected(null); await reload();
  };
  if (state === "loading") return <div className="admin-card animate-pulse p-8"><div className="h-7 w-60 rounded bg-slate-100" /><div className="mt-5 h-80 rounded-xl bg-slate-100" /></div>;
  if (state === "error") return <div className="admin-alert-error" role="alert"><strong>Struktur pengetahuan tidak tersedia.</strong><p className="mt-1">{message}</p><button type="button" className="admin-button-secondary mt-4" onClick={() => { setState("loading"); void reload(); }}>Coba lagi</button></div>;

  return <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(30rem,1.15fr)]">
    <section className="admin-card p-5" aria-labelledby="hierarchy-tree-title">
      <div className="mb-5 flex items-center justify-between gap-4"><div><h2 id="hierarchy-tree-title" className="font-black text-slate-900">Pohon hierarchy</h2><p className="mt-1 text-xs text-slate-500">Maksimum 8 tingkat · urutan stabil</p></div>{!readOnly ? <button type="button" className="admin-button" onClick={() => { setSelected(null); setCreating(true); }}>+ Node</button> : null}</div>
      {message ? <div className="admin-alert-error mb-4" role="alert">{message}</div> : null}
      {tree.length ? <HierarchyTree nodes={tree} selectedId={selected?.id} onSelect={(node) => { setSelected(node); setCreating(false); }} onReorder={reorder} readOnly={readOnly} /> : <div className="admin-empty rounded-xl border border-dashed border-slate-300">Belum ada struktur. Buat node akar pertama.</div>}
    </section>
    <section aria-label="Editor node">{selected || creating ? <NodeEditor key={selected?.id ?? "create"} node={selected} tree={tree} readOnly={readOnly} onSaved={async () => { setSelected(null); setCreating(false); await reload(); }} onArchived={async () => { setSelected(null); await reload(); }} onCancel={() => { setSelected(null); setCreating(false); }} /> : <div className="admin-card p-10 text-center"><h2 className="text-xl font-black text-slate-900">Pilih node untuk melihat detail</h2><p className="mt-2 text-sm text-slate-500">Gunakan pohon di kiri atau buat node baru.</p></div>}</section>
  </div>;
}
