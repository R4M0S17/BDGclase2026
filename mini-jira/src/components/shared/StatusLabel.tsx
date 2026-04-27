import type { TicketStatus } from '@/types'

const labels: Record<TicketStatus, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'Review',
  done: 'Listo',
}

interface Props {
  status: TicketStatus
}

export default function StatusLabel({ status }: Props) {
  return <span>{labels[status]}</span>
}
