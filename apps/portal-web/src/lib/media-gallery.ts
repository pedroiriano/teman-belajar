import "server-only";

export type MediaCollectionKind="image_gallery"|"video_hub";
export type MediaCollectionItem={id:string;media_id:string;sort_order:number;featured:boolean;caption?:string;alt_text?:string;decorative:boolean;transcript?:string;mime_type:string;display_filename:string};
export type MediaCollection={id:string;slug:string;title:string;summary:string;kind:MediaCollectionKind;status:"published";featured:boolean;seo_title?:string;seo_description?:string;indexable:boolean;version:number;published_at?:string;items:MediaCollectionItem[]};
export type MediaCollectionPage={data:MediaCollection[];page:number;page_size:number;total:number;total_pages:number;error?:boolean};
const API=process.env.PORTAL_API_INTERNAL_URL||"http://api:8080";
export async function listMediaCollections(query:string,kind:string,page:number):Promise<MediaCollectionPage>{try{const params=new URLSearchParams({q:query,kind,page:String(page),page_size:"12"});const response=await fetch(`${API}/api/v1/media-collections?${params}`,{cache:"no-store",signal:AbortSignal.timeout(6_000)});if(!response.ok)throw new Error("upstream");return response.json()}catch{return{data:[],page,page_size:12,total:0,total_pages:0,error:true}}}
export async function getMediaCollection(slug:string):Promise<MediaCollection|null>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;try{const response=await fetch(`${API}/api/v1/media-collections/${encodeURIComponent(slug)}`,{cache:"no-store",signal:AbortSignal.timeout(6_000)});if(!response.ok)return null;const payload=await response.json();return payload.data||null}catch{return null}}
