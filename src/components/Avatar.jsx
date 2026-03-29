/**
 * Displays photo_url as a circular avatar, falling back to the emoji.
 * size: 'sm' (32px), 'md' (48px), 'lg' (64px), 'xl' (80px)
 */
const SIZES = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-3xl',
  lg: 'w-16 h-16 text-4xl',
  xl: 'w-20 h-20 text-5xl',
}

export function Avatar({ photoUrl, emoji, size = 'md', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <span className={`${sizeClass} flex items-center justify-center shrink-0 leading-none ${className}`}>
      {emoji || '👋'}
    </span>
  )
}
