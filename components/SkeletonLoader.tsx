export function SpecialistCardSkeleton() {
  return (
    <div className="bg-white rounded-apple border border-primary-100 p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="flex items-start gap-3 sm:gap-5 mb-3 sm:mb-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-apple bg-primary-100 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-primary-100 rounded mb-2 w-3/4" />
          <div className="h-4 bg-primary-50 rounded w-1/2" />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="h-4 bg-primary-50 rounded w-20" />
        <div className="h-4 bg-primary-50 rounded w-16" />
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-48 sm:w-56 lg:w-64 h-36 sm:h-44 lg:h-48 rounded-apple bg-primary-50" />
        ))}
      </div>
    </div>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-apple border border-primary-100 p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="mb-3 sm:mb-4">
        <div className="h-6 sm:h-7 bg-primary-100 rounded mb-2 w-3/4" />
        <div className="h-4 bg-primary-50 rounded mb-4 w-full" />
        <div className="h-4 bg-primary-50 rounded w-5/6" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="h-4 bg-primary-50 rounded w-24" />
        <div className="h-4 bg-primary-50 rounded w-32" />
        <div className="h-4 bg-primary-50 rounded w-28" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 bg-primary-50 rounded-full w-20" />
        ))}
      </div>
    </div>
  )
}

