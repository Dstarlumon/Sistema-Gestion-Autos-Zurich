'use client'

import { useState, useEffect } from 'react'
import Lottie from 'lottie-react'

interface LottiePlayerProps {
  src: string // path to JSON in public/lotties/
  width?: number
  height?: number
  loop?: boolean
  autoplay?: boolean
  className?: string
}

export function LottiePlayer({
  src,
  width = 120,
  height = 120,
  loop = true,
  autoplay = true,
  className,
}: LottiePlayerProps) {
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(setAnimationData)
      .catch(() => setError(true))
  }, [src])

  if (error || !animationData) return null

  return (
    <div className={className} style={{ width, height }}>
      <Lottie animationData={animationData} loop={loop} autoplay={autoplay} />
    </div>
  )
}
