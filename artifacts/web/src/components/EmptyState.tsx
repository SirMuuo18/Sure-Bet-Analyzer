import type { ReactNode } from "react"

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-line rounded-xl">
      <div className="text-ink text-base font-semibold mb-1.5">{title}</div>
      {description && <div className="text-ink-muted text-sm max-w-sm mx-auto leading-relaxed">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
