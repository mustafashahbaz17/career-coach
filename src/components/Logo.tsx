// The Career Coach logo mark (same drawing as in the HTML design).
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0F292A" />
      <path d="M9 21.5L16 8l7 13.5" fill="none" stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="21.5" r="2.6" fill="#FF6B5B" />
    </svg>
  )
}
