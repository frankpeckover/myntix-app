type LoadingSkeletonProps = {
  className?: string;
  lines?: number;
  variant?: "cards" | "rows";
};

export function LoadingSkeleton({
  className = "",
  lines = 3,
  variant = "rows",
}: LoadingSkeletonProps) {
  const isCardGrid = variant === "cards";

  return (
    <div
      aria-busy="true"
      aria-label="Loading content"
      aria-live="polite"
      className={`loading-skeleton grid gap-3 px-4 py-5 ${
        isCardGrid ? "sm:grid-cols-2 lg:grid-cols-4" : ""
      } ${className}`}
      role="status"
    >
      {Array.from({ length: lines }, (_, index) => (
        <div
          aria-hidden="true"
          className={`loading-skeleton-row rounded-md ${
            isCardGrid ? "h-32" : "h-11"
          }`}
          key={index}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
