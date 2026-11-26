// The Career Coach logo mark (same drawing as in the HTML design).
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="#082620" stroke="rgba(255,255,255,.22)" />
      <path d="M9 21.5L16 8l7 13.5" fill="none" stroke="#3DDC97" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="21.5" r="2.6" fill="#FF7A1A" />
    </svg>
  )
}
