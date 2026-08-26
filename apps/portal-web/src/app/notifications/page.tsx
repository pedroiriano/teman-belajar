import { PortalNotificationCenter } from "@/components/notification-center";
import { PageHero } from "@/components/public-content";

export default function NotificationsPage(){return <><PageHero eyebrow="Akun" title="Pusat Notifikasi" description="Ikuti pengingat dan pembaruan pembelajaran yang relevan bagi Anda." icon="bell"/><div className="portal-container py-12 sm:py-16"><PortalNotificationCenter mode="page"/></div></>}
