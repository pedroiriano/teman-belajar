import Link from "next/link";

export interface AdminPaginationProps {
  page: number; pages: number; total: number; pageSize: number; pathname: string;
  query?: Record<string, string | number | undefined>; pageSizeOptions?: number[];
}

function numbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, "…", pages];
  if (page >= pages - 2) return [1, "…", pages - 3, pages - 2, pages - 1, pages];
  return [1, "…", page - 1, page, page + 1, "…", pages];
}

function clean(query: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));
}

export function AdminPagination({ page, pages, total, pageSize, pathname, query = {}, pageSizeOptions = [10, 20, 50] }: AdminPaginationProps) {
  if (total === 0) return null;
  const current = Math.min(Math.max(1, page), Math.max(1, pages));
  const href = (next: number, size = pageSize) => ({ pathname, query: clean({ ...query, page: next, page_size: size }) });
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return <nav className="cuba-pagination admin-pagination" aria-label="Paginasi data">
    <p>Menampilkan {start}–{end} dari {total} data</p>
    <div className="admin-page-size"><span>Data per halaman</span>{pageSizeOptions.map((size) => <Link key={size} href={href(1, size)} aria-current={size === pageSize ? "true" : undefined} className={size === pageSize ? "is-active" : ""}>{size}</Link>)}</div>
    <div className="admin-pagination-controls">{current > 1 ? <Link className="admin-button-secondary !min-h-9 !px-3" href={href(current - 1)} rel="prev">Sebelumnya</Link> : <span className="admin-button-secondary !min-h-9 !px-3 opacity-50" aria-disabled="true">Sebelumnya</span>}<div className="admin-page-numbers">{numbers(current, pages).map((value, index) => value === "…" ? <span key={`ellipsis-${index}`} aria-hidden="true">…</span> : <Link key={value} href={href(value)} aria-label={`Halaman ${value}`} aria-current={value === current ? "page" : undefined} className={value === current ? "is-active" : ""}>{value}</Link>)}</div>{current < pages ? <Link className="admin-button-secondary !min-h-9 !px-3" href={href(current + 1)} rel="next">Berikutnya</Link> : <span className="admin-button-secondary !min-h-9 !px-3 opacity-50" aria-disabled="true">Berikutnya</span>}</div>
  </nav>;
}

export function AdminClientPagination({ page, pages, total, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50] }: { page: number; pages: number; total: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange?: (pageSize: number) => void; pageSizeOptions?: number[] }) {
  if (total === 0) return null;
  const current = Math.min(Math.max(1, page), Math.max(1, pages));
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return <nav className="cuba-pagination admin-pagination" aria-label="Paginasi data">
    <p>Menampilkan {start}–{end} dari {total} data</p>
    {onPageSizeChange && <label className="admin-page-size"><span>Data per halaman</span><select className="admin-input !min-h-9 !w-auto !py-1" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}
    <div className="admin-pagination-controls"><button type="button" className="admin-button-secondary !min-h-9 !px-3" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>Sebelumnya</button><div className="admin-page-numbers">{numbers(current, pages).map((value, index) => value === "…" ? <span key={`ellipsis-${index}`} aria-hidden="true">…</span> : <button type="button" key={value} aria-label={`Halaman ${value}`} aria-current={value === current ? "page" : undefined} className={value === current ? "is-active" : ""} onClick={() => onPageChange(value)}>{value}</button>)}</div><button type="button" className="admin-button-secondary !min-h-9 !px-3" disabled={current >= pages} onClick={() => onPageChange(current + 1)}>Berikutnya</button></div>
  </nav>;
}
