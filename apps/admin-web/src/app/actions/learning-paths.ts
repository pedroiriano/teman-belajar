"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { getServerAccessToken } from "@/lib/server-auth";

const API_BASE=process.env.PORTAL_API_INTERNAL_URL;
export type LearningPathKind="course"|"knowledge"|"microlearning"|"webinar";
export type LearningPathStatus="draft"|"in_review"|"approved"|"published"|"archived";
export type LearningPathItemInput={key:string;kind:LearningPathKind;source_ref:string;label:string;summary:string;required:boolean;milestone:boolean;prerequisite_keys:string[]};
export type LearningPathInput={slug:string;title:string;summary:string;description:string;items:LearningPathItemInput[];expected_row_version?:number};
export type LearningPathItem=LearningPathItemInput&{id:string;url?:string;source_state:"available"|"degraded"|"unavailable";source_checked_at:string;sort_order:number};
export type LearningPath={id:string;slug:string;row_version:number;published_version_number?:number;version:{id:string;number:number;title:string;summary:string;description:string;status:LearningPathStatus;items:LearningPathItem[];published_at?:string}};
export type LearningPathOption={kind:LearningPathKind;source_ref:string;label:string;summary?:string;state:"available"|"degraded"|"unavailable"};

async function identity(){const[session,token]=await Promise.all([getServerSession(authOptions),getServerAccessToken()]);return{session:session as typeof session&{roles?:string[]},token}}
async function detail(response:Response,fallback:string){const payload=await response.json().catch(()=>null);return payload?.detail||fallback}
export async function getLearningPathWorkspaceAction(filter:{q?:string;status?:string}={}){const{session,token}=await identity();if(!session||!token||!API_BASE)return{success:false as const,error:"Workspace Jalur Belajar belum tersedia",paths:[],options:[],roles:[],provenance:{}};const headers={Authorization:`Bearer ${token}`};const query=new URLSearchParams({q:(filter.q||"").slice(0,100),status:filter.status||"all",page_size:"100"});try{const[pathsResponse,optionsResponse]=await Promise.all([fetch(`${API_BASE}/api/v1/admin/learning-paths?${query}`,{headers,cache:"no-store"}),fetch(`${API_BASE}/api/v1/admin/learning-paths/options`,{headers,cache:"no-store"})]);if(!pathsResponse.ok||!optionsResponse.ok)return{success:false as const,error:await detail(pathsResponse,"Workspace Jalur Belajar belum dapat dimuat"),paths:[],options:[],roles:session.roles||[],provenance:{}};const[paths,options]=await Promise.all([pathsResponse.json(),optionsResponse.json()]);return{success:true as const,paths:(paths.data||[]) as LearningPath[],options:(options.data||[]) as LearningPathOption[],roles:session.roles||[],provenance:options.provenance||{}}}catch{return{success:false as const,error:"Workspace Jalur Belajar belum dapat dijangkau",paths:[],options:[],roles:session.roles||[],provenance:{}}}}
async function mutate(path:string,method:string,body:unknown){const{session,token}=await identity();if(!session||!token||!API_BASE)return{success:false as const,error:"Sesi tidak sah"};try{const response=await fetch(`${API_BASE}${path}`,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(8000)});if(!response.ok)return{success:false as const,error:await detail(response,"Jalur belum dapat disimpan"),conflict:response.status===409};const data=await response.json() as LearningPath;revalidatePath("/dashboard/learning-paths");revalidatePath("/learning-paths");revalidatePath(`/learning-paths/${data.slug}`);return{success:true as const,data}}catch{return{success:false as const,error:"Layanan Jalur Belajar belum dapat dijangkau"}}}
export async function createLearningPathAction(input:LearningPathInput){return mutate("/api/v1/admin/learning-paths","POST",input)}
export async function updateLearningPathAction(id:string,input:LearningPathInput){return mutate(`/api/v1/admin/learning-paths/${id}`,"PATCH",input)}
export async function transitionLearningPathAction(id:string,status:LearningPathStatus){return mutate(`/api/v1/admin/learning-paths/${id}/transition`,"POST",{status})}
export async function createLearningPathRevisionAction(id:string,expected:number){return mutate(`/api/v1/admin/learning-paths/${id}/revisions`,"POST",{expected_row_version:expected})}
