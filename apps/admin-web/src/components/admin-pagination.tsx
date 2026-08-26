import Link from "next/link";
import React from "react";

export interface AdminPaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  pathname: string;
  query?: Record<string, string | number | undefined>;
}

export function AdminPagination({ page, pages, total, pageSize, pathname, query = {} }: AdminPaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  
  if (total === 0) return null;

  // Generate page numbers
  const getPageNumbers = () => {
    const pageNumbers: (number | "...")[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) pageNumbers.push(i);
    } else {
      if (page <= 3) {
        pageNumbers.push(1, 2, 3, 4, "...", pages);
      } else if (page >= pages - 2) {
        pageNumbers.push(1, "...", pages - 3, pages - 2, pages - 1, pages);
      } else {
        pageNumbers.push(1, "...", page - 1, page, page + 1, "...", pages);
      }
    }
    return pageNumbers;
  };

  const q = (p: number) => ({ ...query, page: p });

  return (
    <nav className="mt-5 flex items-center justify-between flex-wrap gap-4" aria-label="Paginasi">
      <p className="text-sm text-slate-500">
        Menampilkan {start}–{end} dari {total} data
      </p>
      
      <div className="flex gap-1 items-center">
        {page > 1 ? (
          <Link className="admin-button-secondary !px-3" href={{ pathname, query: q(page - 1) }}>
            Sebelumnya
          </Link>
        ) : (
          <span className="admin-button-secondary !px-3 opacity-50">Sebelumnya</span>
        )}
        
        <div className="hidden sm:flex gap-1 px-2">
          {getPageNumbers().map((p, i) => 
            p === "..." ? (
              <span key={`dots-${i}`} className="px-2 py-1 text-slate-400">...</span>
            ) : (
              <Link 
                key={p} 
                href={{ pathname, query: q(p) }}
                className={`grid h-8 min-w-8 place-items-center rounded-md text-sm font-bold transition ${
                  p === page 
                    ? "bg-sky-50 text-sky-700" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Link>
            )
          )}
        </div>

        {page < pages ? (
          <Link className="admin-button-secondary !px-3" href={{ pathname, query: q(page + 1) }}>
            Berikutnya
          </Link>
        ) : (
          <span className="admin-button-secondary !px-3 opacity-50">Berikutnya</span>
        )}
      </div>
    </nav>
  );
}
