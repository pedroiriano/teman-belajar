"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminIcon } from "@/components/admin-icon";
import { AdminClientPagination } from "@/components/admin-pagination";

type NotificationItem = { id:string; event_type:string; title:string; body:string; deep_link:string; priority:"normal"|"high"; read_at?:string; created_at:string };
type Page = { data:NotificationItem[]; page:number; page_size:number; total:number; total_pages:number; unread_count:number };
type Preference = { event_type:string; enabled:boolean };
type LoadState = "loading"|"ready"|"empty"|"unauthorized"|"degraded"|"error";

const eventLabels:Record<string,string> = {"learning.reminder":"Pengingat belajar","learning.course_updated":"Pembaruan kursus","learning.course_completed":"Kursus selesai","content.workflow":"Alur kerja konten","system.notice":"Informasi sistem"};
const formatTime = (value:string) => new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
const safeAdminLink = (value:string) => value === "/dashboard" || value.startsWith("/dashboard/") ? value : "/dashboard/notifications";

async function requestJSON<T>(path:string, init?:RequestInit):Promise<T>{const response=await fetch(path,{...init,headers:{"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});if(!response.ok){const error=new Error("Notifikasi gagal dimuat") as Error&{status?:number};error.status=response.status;throw error}return response.json() as Promise<T>}

function stateFrom(error:unknown):LoadState{const status=(error as {status?:number})?.status;if(status===401||status===403)return "unauthorized";if(status===502||status===503)return "degraded";return "error"}

export function AdminNotificationCenter({ mode="bell" }:{mode?:"bell"|"page"}){
  const router=useRouter();
  const [open,setOpen]=useState(mode==="page");const [state,setState]=useState<LoadState>("loading");const [pageData,setPageData]=useState<Page|null>(null);const [page,setPage]=useState(1);const [status,setStatus]=useState<"all"|"unread">("all");const [preferences,setPreferences]=useState<Preference[]>([]);const [busy,setBusy]=useState<string|null>(null);const root=useRef<HTMLDivElement>(null);const button=useRef<HTMLButtonElement>(null);
  const loadSummary=useCallback(async()=>{try{const result=await requestJSON<{unread_count:number}>("/api/bff/notifications/summary");setPageData((current)=>current?{...current,unread_count:result.unread_count}:{data:[],page:1,page_size:10,total:0,total_pages:0,unread_count:result.unread_count});setState((current)=>current==="loading"&&mode==="bell"?"ready":current)}catch(error){setState(stateFrom(error))}},[mode]);
  const load=useCallback(async(nextPage=page,nextStatus=status)=>{setState("loading");try{const [items,prefs]=await Promise.all([requestJSON<Page>(`/api/bff/notifications?page=${nextPage}&page_size=10&status=${nextStatus}`),requestJSON<{data:Preference[]}>("/api/bff/notifications/preferences")]);setPageData(items);setPreferences(prefs.data);setState(items.data.length?"ready":"empty")}catch(error){setState(stateFrom(error))}},[page,status]);
  useEffect(()=>{const initial=window.setTimeout(()=>void loadSummary(),0);const timer=window.setInterval(()=>void loadSummary(),60000);const visible=()=>{if(document.visibilityState==="visible")void loadSummary()};document.addEventListener("visibilitychange",visible);return()=>{window.clearTimeout(initial);window.clearInterval(timer);document.removeEventListener("visibilitychange",visible)}},[loadSummary]);
  useEffect(()=>{if(!open)return;const initial=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(initial)},[open,load]);
  useEffect(()=>{if(mode!=="bell"||!open)return;const close=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);button.current?.focus()}};document.addEventListener("mousedown",close);document.addEventListener("keydown",key);return()=>{document.removeEventListener("mousedown",close);document.removeEventListener("keydown",key)}},[mode,open]);
  const refresh=async(action:()=>Promise<unknown>,key:string)=>{setBusy(key);try{await action();await load(page,status);await loadSummary();return true}catch(error){setState(stateFrom(error));return false}finally{setBusy(null)}};
  const markRead=(item:NotificationItem)=>item.read_at?Promise.resolve(true):refresh(()=>requestJSON(`/api/bff/notifications/${item.id}/read`,{method:"PATCH"}),item.id);
  const markAll=()=>refresh(()=>requestJSON("/api/bff/notifications/read-all",{method:"POST"}),"all");
  const setPreference=(item:Preference)=>refresh(()=>requestJSON(`/api/bff/notifications/preferences/${item.event_type}`,{method:"PUT",body:JSON.stringify({enabled:!item.enabled})}),item.event_type);
  const unread=pageData?.unread_count||0;
  const content=<>
    <div className="notification-toolbar"><div><p className="admin-kicker">Pusat Notifikasi</p><h2 className="font-black text-slate-900">Notifikasi Anda</h2></div>{unread>0&&<button type="button" className="admin-button-secondary !min-h-9 !px-3" disabled={busy==="all"} onClick={()=>void markAll()}>Tandai semua sudah dibaca</button>}</div>
    {mode==="page"&&<div className="flex flex-wrap gap-2 border-b border-slate-200 p-4"><button type="button" className={status==="all"?"admin-button":"admin-button-secondary"} onClick={()=>{setPage(1);setStatus("all")}}>Semua</button><button type="button" className={status==="unread"?"admin-button":"admin-button-secondary"} onClick={()=>{setPage(1);setStatus("unread")}}>Belum dibaca{unread?` (${unread>99?"99+":unread})`:""}</button></div>}
    <div className="notification-list" aria-live="polite" aria-busy={state==="loading"}>
      {state==="loading"&&<div className="admin-empty">Memuat notifikasi…</div>}
      {state==="empty"&&<div className="admin-empty"><AdminIcon name="bell" className="mx-auto mb-3 h-7 w-7"/><p className="font-bold text-slate-800">Belum ada notifikasi.</p><p className="mt-1 text-xs">Pembaruan yang relevan akan muncul di sini.</p></div>}
      {state==="unauthorized"&&<div className="admin-alert-error" role="alert">Sesi Anda berakhir atau akses tidak tersedia. Silakan masuk kembali.</div>}
      {state==="degraded"&&<div className="admin-alert-error" role="alert">Pusat notifikasi sedang mengalami gangguan. Data lain tetap dapat digunakan.</div>}
      {state==="error"&&<div className="admin-alert-error" role="alert">Notifikasi gagal dimuat. <button type="button" className="font-black underline" onClick={()=>void load()}>Coba lagi</button></div>}
      {(state==="ready")&&pageData?.data.map((item)=><article key={item.id} className={`notification-item ${item.read_at?"is-read":"is-unread"}`}><button type="button" className="min-w-0 flex-1 text-left" disabled={busy===item.id} onClick={()=>void markRead(item)}><span className="flex items-center gap-2"><span className="notification-event">{eventLabels[item.event_type]||"Notifikasi"}</span>{!item.read_at&&<span className="notification-unread-dot" aria-label="Belum dibaca"/>}</span><strong className="mt-2 block text-sm text-slate-900">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-600">{item.body}</span><time className="mt-2 block text-[11px] text-slate-500" dateTime={item.created_at}>{formatTime(item.created_at)}</time></button><button type="button" className="admin-accent-control rounded-lg border px-3 py-2 text-xs font-black" disabled={busy===item.id} onClick={async()=>{if(await markRead(item))router.push(safeAdminLink(item.deep_link))}}>Buka</button></article>)}
    </div>
    {mode==="page"&&pageData&&<AdminClientPagination page={pageData.page} pages={pageData.total_pages} total={pageData.total} pageSize={pageData.page_size} onPageChange={setPage} />}
    {mode==="page"&&<details className="notification-preferences"><summary>Pengaturan notifikasi</summary><div className="grid gap-3 pt-4 sm:grid-cols-2">{preferences.map((item)=><label key={item.event_type} className="notification-preference"><span><strong>{eventLabels[item.event_type]||item.event_type}</strong><small>Notifikasi dalam aplikasi</small></span><input type="checkbox" role="switch" checked={item.enabled} disabled={busy===item.event_type} onChange={()=>void setPreference(item)} aria-label={`Aktifkan ${eventLabels[item.event_type]||item.event_type}`}/></label>)}</div></details>}
    {mode==="bell"&&<div className="border-t border-slate-200 p-3"><Link href="/dashboard/notifications" className="admin-button-secondary w-full" onClick={()=>setOpen(false)}>Buka Pusat Notifikasi</Link></div>}
  </>;
  if(mode==="page")return <section className="admin-card overflow-hidden" aria-labelledby="notification-page-title"><h1 id="notification-page-title" className="sr-only">Pusat Notifikasi</h1>{content}</section>;
  return <div ref={root} className="relative"><button ref={button} type="button" className="admin-icon-button relative grid" aria-label={unread?`Notifikasi, ${unread} belum dibaca`:"Notifikasi"} aria-expanded={open} aria-controls="admin-notification-panel" onClick={()=>setOpen((value)=>!value)}><AdminIcon name="bell" className="h-5 w-5"/>{unread>0&&<span className="notification-count" aria-hidden="true">{unread>99?"99+":unread}</span>}</button>{open&&<div id="admin-notification-panel" className="notification-popover" role="dialog" aria-label="Notifikasi">{content}</div>}</div>;
}
