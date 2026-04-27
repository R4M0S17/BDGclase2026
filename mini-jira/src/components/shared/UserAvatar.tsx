import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User } from '@/types'

interface Props {
  user: User
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function UserAvatar({ user, className }: Props) {
  return (
    <Avatar className={className ?? 'h-6 w-6'}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}
