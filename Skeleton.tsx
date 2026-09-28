import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-stone-200 rounded-xl ${className}`} />
  );
}

export function BusinessCardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] overflow-hidden border border-[#e5e1da] flex flex-col min-h-[350px] shadow-xs">
      {/* Cover Image Placeholder */}
      <div className="relative h-[200px] w-full bg-stone-200 animate-pulse overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        {/* Actions Placeholder */}
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse" />
        </div>
      </div>

      {/* Content Placholder */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Category/Status Tag */}
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-16 rounded-full bg-stone-200 animate-pulse" />
            <div className="h-5 w-24 rounded-full bg-stone-200 animate-pulse" />
          </div>

          {/* Business Title */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-3/4 rounded-lg bg-stone-200 animate-pulse" />
            <div className="h-5 w-5 rounded-full bg-stone-200 animate-pulse" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded-md bg-stone-200 animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-stone-200 animate-pulse" />
          </div>
        </div>

        {/* Footer info (Rating, District) */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <div className="h-4 w-20 rounded-md bg-stone-200 animate-pulse" />
          <div className="h-4 w-24 rounded-md bg-stone-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] overflow-hidden border border-[#e5e1da] flex flex-col min-h-[360px] shadow-xs relative">
      {/* Cover Image Placeholder */}
      <div className="relative h-[180px] w-full bg-stone-200 animate-pulse overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        {/* Floating actions */}
        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
          <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse" />
        </div>
        {/* Hot offer label */}
        <div className="absolute top-3.5 right-3.5">
          <div className="h-6 w-16 rounded-full bg-stone-100 animate-pulse" />
        </div>
      </div>

      {/* Discount Badge Circle overlay */}
      <div className="absolute top-[150px] left-5 z-10">
        <div className="w-14 h-14 rounded-full border-4 border-white bg-stone-200 animate-pulse" />
      </div>

      {/* Content */}
      <div className="p-5 pt-7 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Shop name */}
          <div className="h-4 w-1/3 rounded bg-stone-200 animate-pulse" />
          
          {/* Offer Title */}
          <div className="h-6 w-3/4 rounded bg-stone-200 animate-pulse" />

          {/* Description */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-stone-200 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-stone-200 animate-pulse" />
          </div>
        </div>

        {/* Footer and Buttons */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="h-4 w-20 rounded bg-stone-200 animate-pulse" />
            <div className="h-4 w-24 rounded bg-stone-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="h-10 rounded-xl bg-stone-200 animate-pulse" />
            <div className="h-10 rounded-xl bg-stone-200 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-[#e5e1da] flex flex-col justify-between min-h-[220px] shadow-xs space-y-4">
      <div className="space-y-3.5">
        {/* Header badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <div className="h-5 w-16 rounded-md bg-stone-200 animate-pulse" />
            <div className="h-5 w-20 rounded-md bg-stone-200 animate-pulse" />
          </div>
          <div className="h-5 w-14 rounded bg-stone-200 animate-pulse" />
        </div>

        {/* Job Title */}
        <div className="space-y-2">
          <div className="h-6 w-3/4 rounded bg-stone-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-stone-200 animate-pulse" />
        </div>

        {/* Details icons */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          <div className="h-4 w-24 rounded bg-stone-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-stone-200 animate-pulse" />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-stone-200 animate-pulse" />
        <div className="h-8 w-24 rounded-lg bg-[#1a4d2e]/10 animate-pulse" />
      </div>
    </div>
  );
}
