"use client";

export default function HeroSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl p-6 bg-white/60 border border-slate-200/80 space-y-4 min-w-[85vw] sm:min-w-[45vw] md:min-w-0">
      <div className="flex justify-between items-center">
        <div className="h-4 w-16 bg-slate-200/80 rounded" />
        <div className="h-4 w-24 bg-slate-200/80 rounded-full" />
      </div>
      <div className="space-y-3 py-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-28 bg-slate-200/80 rounded" />
          <div className="h-4 w-8 bg-slate-200/80 rounded" />
        </div>
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-slate-200/60 border-dashed" />
        </div>
        <div className="flex justify-between items-center">
          <div className="h-6 w-28 bg-slate-200/80 rounded" />
          <div className="h-4 w-8 bg-slate-200/80 rounded" />
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-200/60">
        <div className="h-3 w-36 bg-slate-200/80 rounded" />
        <div className="h-3 w-48 bg-slate-200/80 rounded" />
      </div>
    </div>
  );
}
