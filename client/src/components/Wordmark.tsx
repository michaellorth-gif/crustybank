// ClearFee Legal wordmark — typographic, no image assets. Libre Baskerville for "ClearFee"
// (the brand), Public Sans small caps for "LEGAL" (the category), teal accent.
export default function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }[size]
  const sub = { sm: 'text-[9px]', md: 'text-[11px]', lg: 'text-xs' }[size]
  return (
    <span className="inline-flex items-baseline gap-1.5 select-none" aria-label="ClearFee Legal">
      <span className={`font-display font-bold text-ink leading-none ${scale}`}>
        Clear<span className="text-primary-600">Fee</span>
      </span>
      <span className={`font-sans font-bold uppercase tracking-[0.18em] text-gray-500 leading-none ${sub}`}>
        Legal
      </span>
    </span>
  )
}
