"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface PostListPaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  channelId?: string | null;
  view?: string | null;
  q?: string;
}

export function PostListPagination({ 
  currentPage, 
  totalPages,
  hasNextPage,
  hasPrevPage,
  channelId, 
  view,
  q 
}: PostListPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (channelId) params.set('channel', channelId);
    if (view) params.set('view', view);
    if (q) params.set('q', q);
    const queryString = params.toString();
    return queryString ? `/?${queryString}` : '/';
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {currentPage > 1 && (
        <Link 
          href={buildUrl(currentPage - 1)} 
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
        >
          Previous
        </Link>
      )}
      
      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          // Show first, last, current, and pages around current
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <Link
                key={page}
                href={buildUrl(page)}
                className={`px-3 py-1 rounded text-sm ${
                  page === currentPage
                    ? 'bg-blue-500 text-white'
                    : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {page}
              </Link>
            );
          } else if (
            page === currentPage - 2 ||
            page === currentPage + 2
          ) {
            return <span key={page} className="px-2">...</span>;
          }
          return null;
        })}
      </div>

      {currentPage < totalPages && (
        <Link 
          href={buildUrl(currentPage + 1)} 
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
        >
          Next
        </Link>
      )}
    </div>
  );
}
