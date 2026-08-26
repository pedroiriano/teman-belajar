import type { ReactNode } from "react";
import Link from "next/link";

export function AdminDataTable({title,description,itemCount,headers,children,emptyState="Belum ada data.",loading=false,error,compact=false,retryHref}:{title:string;description?:string;itemCount:number;headers:string[];children?:ReactNode;emptyState?:string;loading?:boolean;error?:string|null;compact?:boolean;retryHref?:string}){
  return <section className="cuba-data-table admin-table-shell" aria-labelledby={`table-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>
    {compact?<h2 id={`table-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="sr-only">{title}</h2>:<div className="admin-table-toolbar"><div><h2 id={`table-${title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`} className="font-black text-slate-900">{title}</h2>{description&&<p className="mt-1 text-xs text-slate-500">{description}</p>}</div><span className="admin-status bg-slate-100 text-slate-600">{itemCount} data</span></div>}
    <div className="overflow-x-auto"><table className="cuba-table admin-table"><thead><tr>{headers.map((header)=><th key={header} scope="col">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading?<tr><td colSpan={headers.length} className="admin-empty">Memuat data…</td></tr>:error?<tr><td colSpan={headers.length} className="admin-empty text-rose-700" role="alert"><p>{error}</p>{retryHref&&<Link className="mt-3 inline-flex font-black underline" href={retryHref}>Coba lagi</Link>}</td></tr>:itemCount===0?<tr><td colSpan={headers.length} className="admin-empty">{emptyState}</td></tr>:children}</tbody></table></div>
  </section>
}
