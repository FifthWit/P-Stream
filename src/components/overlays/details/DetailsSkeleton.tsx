export function DetailsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative">
        {/* Backdrop */}
        <div className="h-64 relative -mt-12">
          <div
            className="absolute inset-0 bg-mediaCard-hoverBackground"
            style={{
              maskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 60px)",
            }}
          />
        </div>
        {/* Content */}
        <div className="px-6 pb-6 mt-[-30px]">
          <div className="h-8 w-3/4 bg-white/10 rounded mb-3" /> {/* Title */}
          <div className="space-y-2 mb-6">
            {/* Description */}
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-full" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
          {/* Additional details */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
          </div>
          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 bg-white/10 rounded-full" />
            <div className="h-6 w-24 bg-white/10 rounded-full" />
            <div className="h-6 w-16 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
