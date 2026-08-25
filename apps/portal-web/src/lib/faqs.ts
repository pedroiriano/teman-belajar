import "server-only";

export type PublicFAQ = { id:string;slug:string;question:string;answer:string;media_asset_id?:string;media_alt?:string;seo_title:string;meta_description:string;indexable:boolean };
export type PublicFAQCategory = { category:{id:string;slug:string;name:string;description?:string};items:PublicFAQ[] };
export type PublicFAQResult = { data:PublicFAQCategory[];total:number;error?:true };

export async function getPublicFAQs(query = ""): Promise<PublicFAQResult> {
  const apiBase=process.env.PORTAL_API_INTERNAL_URL;
  if(!apiBase)return{data:[],total:0,error:true};
  try{
    const suffix=query?`?q=${encodeURIComponent(query)}`:"";
    const response=await fetch(`${apiBase}/api/v1/faqs${suffix}`,{cache:"no-store"});
    if(!response.ok)return{data:[],total:0,error:true};
    const body=await response.json();
    return{data:Array.isArray(body.data)?body.data:[],total:Number(body.total)||0};
  }catch{return{data:[],total:0,error:true};}
}
