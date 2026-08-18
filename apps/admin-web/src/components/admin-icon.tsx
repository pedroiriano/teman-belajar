import type { SVGProps } from "react";

export type AdminIconName = "announcement" | "arrow" | "audit" | "bell" | "chevron" | "close" | "dashboard" | "file" | "folder" | "health" | "knowledge" | "media" | "menu" | "news" | "search" | "settings" | "users";

const paths: Record<AdminIconName, string> = {
  announcement: "M5 13V9l12-5v14L5 13Zm0 0 2 7h4l-2-6m6-9 4-2",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  audit: "M6 3h9l3 3v15H6V3Zm8 0v4h4M9 12h6m-6 4h6M9 8h2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4",
  chevron: "m9 6 6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  dashboard: "M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-3h7v10h-7V10Z",
  file: "M6 3h8l4 4v14H6V3Zm8 0v5h5M9 13h6m-6 4h6",
  folder: "M3 6h7l2 2h9v11H3V6Z",
  health: "M3 12h4l2-5 4 10 2-5h6",
  knowledge: "M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm0 0V19",
  media: "M4 5h16v14H4V5Zm3 10 3-3 2 2 3-4 3 5M8 9h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  news: "M5 4h14v16H5V4Zm3 4h8m-8 4h8m-8 4h5",
  search: "m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-3.5 2-1-2-3-2.2.4L15 6.5 15.4 4h-3.5L11 6.5 8.4 7.6 6 6 3.8 8.8 5.5 11 5 13.5 2.5 15l1.8 3 2.5-.5L9 19.2l.5 2.8H13l1-2.6 2.5-1 2.2 1.6 2.2-2.8-1.7-2.2.8-3Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9m-2-11.8a4 4 0 0 1 0 7.4",
};

export function AdminIcon({ name, ...props }: { name: AdminIconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
