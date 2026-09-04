import type { SVGProps } from "react";

export type AdminIconName =
  | "alert"
  | "announcement"
  | "arrow"
  | "audit"
  | "bell"
  | "book"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "code"
  | "dashboard"
  | "download"
  | "edit"
  | "external"
  | "eye"
  | "file"
  | "filter"
  | "folder"
  | "grid"
  | "health"
  | "help"
  | "knowledge"
  | "list"
  | "logout"
  | "media"
  | "menu"
  | "message"
  | "moon"
  | "more"
  | "news"
  | "plus"
  | "refresh"
  | "search"
  | "settings"
  | "sun"
  | "trash"
  | "upload"
  | "user"
  | "users"
  | "video"
  | "x";

const paths: Record<AdminIconName, string> = {
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  announcement: "M5 13V9l12-5v14L5 13Zm0 0 2 7h4l-2-6m6-9 4-2",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  audit: "M6 3h9l3 3v15H6V3Zm8 0v4h4M9 12h6m-6 4h6M9 8h2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  calendar: "M3 4h18v18H3V4z M16 2v4 M8 2v4 M3 10h18",
  check: "m20 6-11 11-5-5",
  chevron: "m9 6 6 6-6 6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  close: "M6 6l12 12M18 6 6 18",
  code: "m16 18 6-6-6-6M8 6l-6 6 6 6",
  dashboard: "M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-3h7v10h-7V10Z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14 21 3",
  eye: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  file: "M6 3h8l4 4v14H6V3Zm8 0v5h5M9 13h6m-6 4h6",
  filter: "M4 4h16l-6 7v6l-4 2v-8z",
  folder: "M3 6h7l2 2h9v11H3V6Z",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  health: "M3 12h4l2-5 4 10 2-5h6",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.09 9a3 3 0 1 1 5.83 1c-.9 1.3-2.92 1.5-2.92 3 M12 17h.01",
  knowledge: "M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm0 0V19",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  media: "M4 5h16v14H4V5Zm3 10 3-3 2 2 3-4 3 5M8 9h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  message: "M21 15a4 4 0 0 1-4 4H8l-5 3v-7a4 4 0 0 1-1-2.65V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4z",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  more: "M12 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  news: "M5 4h14v16H5V4Zm3 4h8m-8 4h8m-8 4h5",
  plus: "M12 5v14 M5 12h14",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  search: "m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-3.5 2-1-2-3-2.2.4L15 6.5 15.4 4h-3.5L11 6.5 8.4 7.6 6 6 3.8 8.8 5.5 11 5 13.5 2.5 15l1.8 3 2.5-.5L9 19.2l.5 2.8H13l1-2.6 2.5-1 2.2 1.6 2.2-2.8-1.7-2.2.8-3Z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9m-2-11.8a4 4 0 0 1 0 7.4",
  video: "M23 7l-7 5 7 5V7z M1 5h15v14H1V5z",
  x: "M18 6 6 18 M6 6l12 12",
};

export function AdminIcon({ name, ...props }: { name: AdminIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      data-ui-icon="feather"
      data-ui-icon-name={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
