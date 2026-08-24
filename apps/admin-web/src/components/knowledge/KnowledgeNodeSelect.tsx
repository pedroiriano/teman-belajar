"use client";

import { useEffect, useMemo, useState } from "react";

import { getKnowledgeHierarchyAction } from "@/app/actions/knowledge";
import { flattenKnowledgeNodes, type KnowledgeNode } from "@/types/knowledge-hierarchy";

export function KnowledgeNodeSelect({ value, onChange, disabled = false, required = false, id = "primary-node", label = "Struktur utama" }: { value: string; onChange: (value: string) => void; disabled?: boolean; required?: boolean; id?: string; label?: string }) {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    getKnowledgeHierarchyAction(false).then((result) => {
      if (!active) return;
      if (result.success) {
        setNodes(result.data.data ?? []);
        setState("ready");
      } else {
        setState("error");
      }
    });
    return () => { active = false; };
  }, []);

  const options = useMemo(() => flattenKnowledgeNodes(nodes), [nodes]);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="admin-label">{label}{required ? <span className="text-rose-600"> *</span> : null}</label>
      <select id={id} className="admin-input" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || state !== "ready"} required={required} aria-describedby={`${id}-help`}>
        <option value="">{state === "loading" ? "Memuat struktur…" : state === "error" ? "Struktur tidak tersedia" : "Belum ditempatkan"}</option>
        {options.map(({ node, path }) => <option key={node.id} value={node.id}>{path}</option>)}
      </select>
      <p id={`${id}-help`} className={`text-xs ${state === "error" ? "text-rose-600" : "text-slate-500"}`}>
        {state === "error" ? "Muat ulang halaman atau periksa layanan hierarchy." : "Breadcrumb publik dihasilkan dari struktur server ini."}
      </p>
    </div>
  );
}
