import { Download } from 'lucide-react'

export default function EmptyColumnSlot() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-lg">
      <Download className="w-5 h-5 text-outline-variant/60" />
      <span className="text-[0.875rem] text-outline-variant/70 leading-[1.6]">
        Drop items here
      </span>
    </div>
  )
}
