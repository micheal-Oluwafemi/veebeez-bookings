"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { CSSProperties } from "react"

type TactileTone = {
  face: string
  faceHighlight: string
  content: string
  base: string
  baseShadow: string
}

const DEFAULT_TONE: TactileTone = {
  face: "#4a4a46",
  faceHighlight: "#64645e",
  content: "#eeeeec",
  base: "#292926",
  baseShadow: "#141412",
}

export type HomeButtonProps = {
  href?: string
  label?: string
  className?: string
  tone?: Partial<TactileTone>
}

export function HomeButton({
  href = "/",
  label = "Home",
  className,
  tone,
}: HomeButtonProps) {
  const t = { ...DEFAULT_TONE, ...tone }

  const toneStyle = {
    "--tactile-face": t.face,
    "--tactile-face-highlight": t.faceHighlight,
    "--tactile-content": t.content,
    "--tactile-base": t.base,
    "--tactile-base-shadow": t.baseShadow,
  } as CSSProperties

  return (
    <Link
      href={href}
      className={cn(
        "group/tactile font-inherit relative inline-grid w-max shrink-0 cursor-pointer border-0 bg-transparent p-0 pb-[6px] leading-none select-none [--tactile-depth:3px] [--tactile-radius:0.75rem] focus-visible:rounded-[var(--tactile-radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grayscale-9 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
        className
      )}
      style={toneStyle}
    >
      <span className="absolute inset-x-0 top-[6px] bottom-0 rounded-[var(--tactile-radius)] bg-[var(--tactile-base)] shadow-[inset_0_-1px_0_var(--tactile-base-shadow)]" />
      <span className="relative flex h-8 items-center justify-center gap-1.5 rounded-[var(--tactile-radius)] bg-[var(--tactile-face)] px-3 text-xs font-medium text-[var(--tactile-content)] shadow-[inset_0_1px_0_var(--tactile-face-highlight)] transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-active/tactile:translate-y-[6px] motion-reduce:transform-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/tactile:translate-y-0.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          fill="currentColor"
          viewBox="0 0 256 256"
          aria-hidden="true"
        >
          <path d="M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z" />
        </svg>
        {label}
      </span>
    </Link>
  )
}
