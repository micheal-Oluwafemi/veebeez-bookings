"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonRevealProps {
  loading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  minHeight?: number | string
  className?: string
}

export function SkeletonReveal({
  loading,
  skeleton,
  children,
  minHeight,
  className,
}: SkeletonRevealProps) {
  type Phase = "loading" | "pulsing" | "revealing" | "settled"
  const [phase, setPhase] = React.useState<Phase>(
    loading ? "loading" : "settled"
  )
  const [storedLoading, setStoredLoading] = React.useState(loading)

  if (loading !== storedLoading) {
    setStoredLoading(loading)
    setPhase(loading ? "loading" : "pulsing")
  }

  React.useEffect(() => {
    if (phase !== "pulsing") return
    const t = window.setTimeout(() => setPhase("revealing"), 1000)
    return () => window.clearTimeout(t)
  }, [phase])

  React.useEffect(() => {
    if (phase !== "revealing") return
    const t = window.setTimeout(() => setPhase("settled"), 400)
    return () => window.clearTimeout(t)
  }, [phase])

  const isRevealed = phase === "revealing" || phase === "settled"
  const isSettled = phase === "settled"
  const applyMinHeight =
    !isSettled && minHeight !== undefined ? minHeight : undefined

  const minHeightStyle = React.useMemo(
    () =>
      typeof applyMinHeight === "number"
        ? `${applyMinHeight}px`
        : applyMinHeight,
    [applyMinHeight]
  )

  return (
    <div
      className={cn(
        "t-skel",
        isRevealed && "is-revealed",
        isSettled && "is-settled",
        className
      )}
      style={minHeightStyle ? { minHeight: minHeightStyle } : undefined}
    >
      <div
        className={cn(
          "t-skel-skeleton",
          (phase === "loading" || phase === "pulsing") && "is-pulsing"
        )}
        aria-hidden
      >
        {skeleton}
      </div>
      <div className="t-skel-content">{children}</div>
    </div>
  )
}
