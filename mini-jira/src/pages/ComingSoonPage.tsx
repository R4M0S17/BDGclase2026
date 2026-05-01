interface Props {
  name: string
}

export default function ComingSoonPage({ name }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-[2.75rem] font-semibold text-inverse-surface tracking-[-0.02em] leading-none">
        {name}
      </p>
      <p className="text-[0.875rem] text-outline-variant">This feature is coming soon.</p>
    </div>
  )
}
