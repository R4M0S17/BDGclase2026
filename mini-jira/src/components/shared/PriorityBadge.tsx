import { Badge } from '@/components/ui/badge'
import type { Priority } from '@/types'

const styles: Record<Priority, string> = {
  Low: 'bg-surface-container-high text-inverse-surface/60 hover:bg-surface-container-high',
  Medium: 'bg-surface-container-high text-inverse-surface hover:bg-surface-container-high',
  High: 'bg-surface-container-high text-inverse-surface hover:bg-surface-container-high',
}

const labels: Record<Priority, string> = {
  Low: 'Baja',
  Medium: 'Media',
  High: 'Alta',
}

interface Props {
  priority: Priority
}

export default function PriorityBadge({ priority }: Props) {
  return (
    <Badge variant="outline" className={`text-xs font-medium border-0 ${styles[priority]}`}>
      {labels[priority]}
    </Badge>
  )
}
