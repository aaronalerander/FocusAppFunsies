// Spring physics presets
export const springs = {
  bouncy: { type: 'spring', stiffness: 400, damping: 15, mass: 0.8 },
  smooth: { type: 'spring', stiffness: 200, damping: 25 },
  slow:   { type: 'spring', stiffness: 100, damping: 20 },
  snappy: { type: 'spring', stiffness: 500, damping: 30 }
}

// Task list item variants
export const taskItemVariants = {
  hidden: { opacity: 0, y: -8, height: 0, overflow: 'hidden' },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    overflow: 'visible',
    transition: { type: 'spring', stiffness: 300, damping: 28 }
  },
  exit: {
    opacity: 0,
    x: 40,
    height: 0,
    marginBottom: 0,
    overflow: 'hidden',
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
  }
}

// Page/tab transition variants (direction-aware)
export const pageVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir < 0 ? 24 : -24 })
}

export const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30
}

// Settings bottom sheet
export const settingsVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
}

// Delete confirmation modal
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.15 }
  }
}

// Burst particle positions for checkbox animation (8 particles)
export function getBurstParticleProps(index, count = 8) {
  const angle = (index / count) * Math.PI * 2
  const distance = 22
  return {
    initial: { x: 0, y: 0, opacity: 1, scale: 1 },
    animate: {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      scale: 0
    },
    transition: { duration: 0.45, ease: 'easeOut' }
  }
}
