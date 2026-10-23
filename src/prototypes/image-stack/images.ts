/*
 * Photos from Lorem Picsum (https://picsum.photos, images from Unsplash).
 * A fixed seed per image keeps the same photo at every size, so the stack
 * looks the same on every visit and only the resolution adapts.
 */
export const IMAGE_COUNT = 30
export const IMAGE_ASPECT = 3 / 2 // matches .stack-card's aspect-ratio

const seed = (index: number) => `barbu-${index + 1}`

export interface StackImage {
  src: string
  alt: string
}

/* All images, loaded `width` pixels wide (height from IMAGE_ASPECT) as WebP */
export function stackImages(width: number): StackImage[] {
  const height = Math.round(width / IMAGE_ASPECT)
  return Array.from({ length: IMAGE_COUNT }, (_, i) => ({
    src: `https://picsum.photos/seed/${seed(i)}/${width}/${height}.webp`,
    alt: `Photo ${i + 1} (Lorem Picsum)`,
  }))
}

/* Metadata endpoint: { id, author, width, height, url, download_url }; there is no title */
export function infoUrl(index: number) {
  return `https://picsum.photos/seed/${seed(index)}/info`
}

const ADJECTIVES = [
  'Quiet', 'Distant', 'Golden', 'Silent', 'Wandering', 'Faded', 'Hidden', 'Morning',
  'Northern', 'Velvet', 'Paper', 'Electric', 'Hollow', 'Last', 'Slow', 'Borrowed',
]
const NOUNS = [
  'Harbor', 'Light', 'Echo', 'Field', 'Window', 'Signal', 'Horizon', 'Garden',
  'Shore', 'Archive', 'Weather', 'Bridge', 'Season', 'Static', 'Room', 'Tide',
]

/* Made-up title, since Lorem Picsum has none; stable per image */
export function randomTitle(index: number) {
  // Different strides so neighbouring images don't share words
  return `${ADJECTIVES[(index * 7 + 3) % ADJECTIVES.length]} ${NOUNS[(index * 11 + 5) % NOUNS.length]}`
}
