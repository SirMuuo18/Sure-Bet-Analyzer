export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Check your connection and try again.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="text-center py-16 px-6 border border-risk/20 bg-risk-dim/40 rounded-xl">
      <div className="text-risk text-base font-semibold mb-1.5">{title}</div>
      <div className="text-ink-muted text-sm max-w-sm mx-auto leading-relaxed">{description}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-4 py-2 bg-surface-2 hover:bg-surface-hover border border-line text-ink text-sm font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
