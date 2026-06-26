"use client";

export default function RowSkeleton() {
  return (
    <div className="animate-pulse rounded-xl p-4 bg-white/40 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full md:w-1/3">
        <div className="h-4 w-10 bg-slate-200 rounded" />
        <div className="h-4 w-20 bg-slate-200 rounded-full" />
        <div className="h-4 w-16 bg-slate-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between md:justify-center gap-4 w-full md:w-1/3 my-2 md:my-0">
        <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
        <div className="h-8 w-16 bg-slate-200 rounded-lg" />
        <div className="h-5 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="flex flex-col gap-1 items-start md:items-end w-full md:w-1/3">
        <div className="h-3.5 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-20 bg-slate-200 rounded" />
      </div>
    </div>
  );
}
