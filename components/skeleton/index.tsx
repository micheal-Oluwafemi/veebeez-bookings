/**
 * Common skeleton primitives + per-resource skeleton components.
 *
 * Every skeleton is sized to match the real content's layout so the swap from
 * loading → data has no perceived shift. Use:
 *   <Skeleton className="h-4 w-32" />  for inline lines
 *   <Skeleton className="size-10 rounded-md" /> for icon/avatar placeholders
 *   <ProductTableSkeleton /> for a full-table placeholder
 */
import * as React from "react";

import { cn } from "@/lib/utils";

// Generic primitives
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[6px] bg-slate-300/60", className)}
      {...props}
    />
  );
}

// `SkeletonReveal` lives in its own file (it carries internal state for
// the loading → pulsing → reveal transition). Re-export here so consumers
// can pull it from the same barrel as `Skeleton`.
export { SkeletonReveal } from "./SkeletonReveal";

// Full-page dashboard skeleton — pair with `SkeletonReveal` at the page
// level for the loading → reveal cross-fade.
// export { AdminDashboardSkeleton } from "./AdminDashboardSkeleton";
// export { OrderDetailSkeleton } from "./OrderDetailSkeleton";

export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

// Composite skeletons (per resource)
/** 4-up grid of stat-card placeholders, matches dashboard / list-page headers. */
export function StatCardsSkeleton({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <section
      aria-label='Loading statistics'
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5",
        className,
      )}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:last:col-span-1",
            i % 2 ? "last:col-span-1" : "last:col-span-2",
          )}>
          <div className='flex flex-col gap-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-3 w-20' />
          </div>
          <Skeleton className='size-8 rounded-md lg:size-11 lg:rounded-xl' />
        </div>
      ))}
    </section>
  );
}

/** Table-row skeleton — `rows` body rows + `cols` columns. */
export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className=''>
      <table className='w-full min-w-[700px] text-left text-sm'>
        <thead>
          <tr className='border-b border-slate-200'>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className='px-4 py-3'>
                <Skeleton className='h-3 w-20' />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className='border-b border-slate-100 last:border-b-0'>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className='px-4 py-4'>
                  <Skeleton className={cn("h-3", c === 0 ? "w-32" : "w-24")} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Card-grid skeleton (categories, top-products, etc.). */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm'>
          <Skeleton className='aspect-square w-full rounded-xl' />
          <Skeleton className='h-3 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      ))}
    </div>
  );
}
