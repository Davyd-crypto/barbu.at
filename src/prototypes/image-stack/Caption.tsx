import type { CSSProperties } from 'react'

interface CaptionProps {
  title: string
  author?: string
  photoUrl?: string // the photo's page on Unsplash
  src: string // the loaded image, for "save this picture"
  style: CSSProperties
}

/* Downloads the image under a readable name (the `download` attribute alone doesn't work cross-origin) */
async function savePicture(src: string, title: string) {
  try {
    const res = await fetch(src, { referrerPolicy: 'no-referrer' })
    const url = URL.createObjectURL(await res.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    console.error('Could not save picture', err)
  }
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 2.5l7 7M9.5 4v5.5H4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 1.5h7v9L6 8 2.5 10.5z M6 3.5v3M4.5 5h3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

/* Title block below the focused image, with a thin rule on its left */
export function Caption({ title, author, photoUrl, src, style }: CaptionProps) {
  return (
    <div className="stack-caption" style={style} aria-live="polite">
      <div className="stack-caption-title">{title}</div>
      {author && <div className="stack-caption-meta">{author}</div>}
      <div className="stack-caption-meta">Unsplash / Lorem Picsum</div>

      <div className="stack-caption-actions">
        {photoUrl && (
          <a href={photoUrl} target="_blank" rel="noreferrer">
            <ArrowIcon />
            read more
          </a>
        )}
        <button type="button" onClick={() => void savePicture(src, title)}>
          <SaveIcon />
          save this picture
        </button>
      </div>
    </div>
  )
}
