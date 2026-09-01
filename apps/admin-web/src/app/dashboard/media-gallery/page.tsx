import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminUnauthorized } from "@/components/admin-states";
import MediaGalleryEditor from "@/components/media-gallery-editor";

export default async function MediaGalleryPage(){const session:any=await getServerSession(authOptions);if(!session)redirect("/api/auth/signin");const roles:string[]=session.roles||[];if(!roles.some(role=>["Portal Administrator","Content Editor","Reviewer"].includes(role)))return <AdminUnauthorized resource="galeri media"/>;return <MediaGalleryEditor roles={roles}/>}
