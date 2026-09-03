import type { SVGProps } from "react";

export type PortalIconName =
  | "arrow-up"
  | "book"
  | "bell"
  | "bookmark"
  | "briefcase"
  | "calendar"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "compass"
  | "gallery"
  | "graduation"
  | "grid"
  | "menu"
  | "message"
  | "moon"
  | "news"
  | "pause"
  | "play"
  | "search"
  | "shield"
  | "sparkles"
  | "star"
  | "sun"
  | "user"
  | "users";

const paths: Record<PortalIconName, string> = {
  "arrow-up": "M12 19V5m0 0-6 6m6-6 6 6",
  book: "M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm0 0V19",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  briefcase: "M9 6V4h6v2m5 4v9H4v-9m-1-3h18v5H3V7Zm7 5h4",
  calendar: "M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
  "chevron-down": "m7 10 5 5 5-5",
  "chevron-left": "m15 19-7-7 7-7",
  "chevron-right": "m9 5 7 7-7 7",
  close: "M6 6l12 12M18 6 6 18",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm4-14-2.5 5.5L8 16l2.5-5.5L16 8Z",
  gallery: "M4 5h16v14H4V5Zm3 10 3-3 2 2 3-4 3 5M8 9h.01",
  graduation: "m3 9 9-5 9 5-9 5-9-5Zm4 3v4.5c2.8 2 7.2 2 10 0V12m4-3v6",
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  menu: "M4 7h16M4 12h16M4 17h16",
  message: "M4 5h16v12H8l-4 4V5Zm4 4h8m-8 4h5",
  moon: "M20.4 15.6A8.5 8.5 0 0 1 8.4 3.6 8.5 8.5 0 1 0 20.4 15.6Z",
  news: "M5 4h14v16H5V4Zm3 4h8m-8 4h8m-8 4h5",
  pause: "M8 5v14m8-14v14",
  play: "M9 7v10l8-5-8-5Z",
  search: "m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  shield: "M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-5",
  sparkles: "m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14ZM5 13l.9 2.6L8.5 16l-2.6.9L5 19.5l-.9-2.6L1.5 16l2.6-.4L5 13Z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  sun: "M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  user: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9m-2-11.8a4 4 0 0 1 0 7.4",
};

export function PortalIcon({ name, ...props }: { name: PortalIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg data-ui-icon="remix" data-ui-icon-name={name} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
