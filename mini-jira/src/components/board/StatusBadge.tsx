type BadgeVariant = 'done' | 'blocked' | 'in-progress' | 'high-priority' | 'medium' | 'low-priority'

const STYLES: Record<BadgeVariant, string> = {
  'done': 'bg-tertiary-container text-on-tertiary-fixed',
  'blocked': 'bg-error-container text-on-error-container',
  'in-progress': 'bg-primary-container text-on-primary-fixed',
  'high-priority': 'bg-surface-container-high text-inverse-surface',
  'medium': 'bg-surface-container-high text-inverse-surface',
  'low-priority': 'bg-surface-container-high text-inverse-surface/60',
}

interface StatusBadgeProps {
  variant: BadgeVariant
  label: string
}

export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] uppercase tracking-[0.05em] font-medium',
        STYLES[variant],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
