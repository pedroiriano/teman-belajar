"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE = process.env.PORTAL_API_INTERNAL_URL;
export type MicrolearningStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type MicrolearningFormat = "article" | "video" | "quick";
export type MicrolearningInput = { slug: string; title: string; summary: string; body: string; format: MicrolearningFormat; duration_minutes: number; video_url: string; featured_media_id: string; related_ids: string[]; seo_title: string; seo_description: string; indexable: boolean; expected_version?: number };
export type MicrolearningItem = Omit<MicrolearningInput, "related_ids" | "expected_version"> & { id: string; status: MicrolearningStatus; version: number; updated_at: string; related: Array<{ id: string; slug: string; title: string; summary: string; format: MicrolearningFormat; duration_minutes: number }> };
async function identity(){const[session,token]=await Promise.all([getServerSession(authOptions),getServerAccessToken()]);return{session:session as typeof session&{roles?:string[]},token}}
async function detail(response:Response,fallback:string){const payload=await response.json().catch(()=>null);return payload?.detail||fallback}
export async function getMicrolearningWorkspaceAction(filter:{q?:string;status?:string;format?:string}={}){const{session,token}=await identity();if(!session||!token||!API_BASE)return{success:false as const,error:"Workspace Pembelajaran Singkat belum tersedia",items:[],roles:[]};const query=new URLSearchParams({q:(filter.q||"").slice(0,100),status:filter.status||"all",format:filter.format||"",page_size:"100"});try{const response=await fetch(`${API_BASE}/api/v1/admin/microlearning?${query}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});if(!response.ok)return{success:false as const,error:await detail(response,"Workspace belum dapat dimuat"),items:[],roles:session.roles||[]};const payload=await response.json();return{success:true as const,items:(payload.data||[]) as MicrolearningItem[],roles:session.roles||[]}}catch{return{success:false as const,error:"Workspace belum dapat dijangkau",items:[],roles:session.roles||[]}}}
async function mutate(path:string,method:string,body:unknown){const{session,token}=await identity();if(!session||!token||!API_BASE)return{success:false as const,error:"Sesi tidak sah"};try{const response=await fetch(`${API_BASE}${path}`,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(5000)});if(!response.ok)return{success:false as const,error:await detail(response,"Materi belum dapat disimpan"),conflict:response.status===409};const data=await response.json() as MicrolearningItem;revalidatePath("/dashboard/microlearning");revalidatePath("/microlearning");revalidatePath(`/microlearning/${data.slug}`);return{success:true as const,data}}catch{return{success:false as const,error:"Layanan Pembelajaran Singkat belum dapat dijangkau"}}}
export async function createMicrolearningAction(input:MicrolearningInput){return mutate("/api/v1/admin/microlearning","POST",input)}
export async function updateMicrolearningAction(id:string,input:MicrolearningInput){return mutate(`/api/v1/admin/microlearning/${id}`,"PATCH",input)}
export async function transitionMicrolearningAction(id:string,status:MicrolearningStatus){return mutate(`/api/v1/admin/microlearning/${id}/transition`,"POST",{status})}
