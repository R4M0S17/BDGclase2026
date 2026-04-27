import { Badge } from '@/components/ui/badge'

export default function BlockedBadge() {
  return (
    <Badge className="bg-red-500 text-white text-xs font-medium hover:bg-red-500 pointer-events-none">
      Bloqueado
    </Badge>
  )
}
