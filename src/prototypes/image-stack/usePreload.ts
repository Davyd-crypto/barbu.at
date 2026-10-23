import { useEffect, useState } from 'react'
import { IMAGE_COUNT, infoUrl, type StackImage } from './images.ts'

const TIMEOUT_MS = 15_000 // show the stack anyway if picsum.photos is slow

export interface PhotoInfo {
  author: string
  url: string
}

async function loadInfo(index: number): Promise<PhotoInfo | null> {
  try {
    const res = await fetch(infoUrl(index), { referrerPolicy: 'no-referrer' })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (typeof data !== 'object' || data === null) return null
    const { author, url } = data as Record<string, unknown>
    return typeof author === 'string' && typeof url === 'string' ? { author, url } : null
  } catch {
    return null
  }
}

/*
 * Downloads and decodes every image and fetches its metadata. `progress` goes
 * from 0 to 1; `ready` turns true once everything settled (failures count as
 * done) or after TIMEOUT_MS, and stays true when the image size changes later.
 */
export function usePreload(images: StackImage[]) {
  const [imagesDone, setImagesDone] = useState(0)
  const [infos, setInfos] = useState<(PhotoInfo | null)[] | null>(null)
  const [infosDone, setInfosDone] = useState(0)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    let done = 0
    const jobs = images.map((image) => {
      const img = new Image()
      img.referrerPolicy = 'no-referrer'
      img.src = image.src
      return img
        .decode()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setImagesDone(++done)
        })
    })
    void Promise.all(jobs).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [images])

  // Metadata doesn't depend on the image size: fetch it once
  useEffect(() => {
    let cancelled = false
    let done = 0
    const jobs = Array.from({ length: IMAGE_COUNT }, (_, i) =>
      loadInfo(i).finally(() => {
        if (!cancelled) setInfosDone(++done)
      }),
    )
    void Promise.all(jobs).then((result) => {
      if (!cancelled) setInfos(result)
    })
    const timer = window.setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  return {
    progress: Math.min((imagesDone + infosDone) / (images.length + IMAGE_COUNT), 1),
    ready: (ready && infos !== null) || timedOut,
    infos: infos ?? [],
  }
}
