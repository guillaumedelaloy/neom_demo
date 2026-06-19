type PlaceholderPageProps = {
  title: string
  eyebrow?: string
}

export function PlaceholderPage({ title, eyebrow = 'Coming soon' }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ma-muted">{eyebrow}</p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ma-ink">{title}</h1>
        <p className="mt-2 max-w-[40rem] text-[13px] leading-snug text-ma-muted">
          This section is reserved for the next build. Navigation and page shell are wired; content will
          follow.
        </p>
      </header>
    </div>
  )
}
