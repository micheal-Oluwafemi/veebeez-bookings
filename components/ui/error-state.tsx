"use client";

import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Danger } from "@solar-icons/react-perf/category/ui/Bold";

type ErrorStateVariant = "card" | "inline" | "page";
type ErrorStateTone = "default" | "quote";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  variant?: ErrorStateVariant;
  tone?: ErrorStateTone;
  className?: string;
  retryLabel?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  error,
  onRetry,
  variant = "card",
  tone = "default",
  className,
  retryLabel = "Try again",
}: ErrorStateProps) {
  const resolvedMessage =
    message ??
    getErrorMessage(error, "Please check your connection and try again.");

  const isInline = variant === "inline";
  const isPage = variant === "page";

  return (
    <div
      role='alert'
      aria-live='polite'
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white text-left",
        isInline
          ? "border-[#e8ddd0] bg-[#fdfaf5] px-4 py-3"
          : isPage
            ? "border-[#e8ddd0] bg-white px-6 py-10 text-center shadow-sm sm:px-8"
            : "border-[#e8ddd0] bg-white px-5 py-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.04)] sm:px-6 sm:py-10",
        className,
      )}>
      {/* subtle radial accent */}
      <div
        aria-hidden='true'
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.06]",
          tone === "quote" ? "bg-[#a57865]" : "bg-[#c9a96e]",
          isInline && "hidden",
        )}
      />
      <div
        className={cn(
          "relative",
          isInline ? "flex items-center gap-3" : "flex flex-col items-center",
        )}>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full shadow-sm",
            isInline
              ? "size-9 bg-white  text-[#9f2d20]"
              : "size-12 sm:size-14 bg-[#fdf9f5] border-[#e8ddd0] text-[#9f2d20]",
            tone === "quote" &&
              !isInline &&
              "bg-[#fdf9f5] text-[#a57865] border-[#e8ddd0]",
          )}>
          {isInline ? (
            <WifiOff size={16} className='shrink-0' />
          ) : (
            <Danger size={40} className='shrink-0' />
          )}
        </div>

        <div
          className={cn(
            isInline ? "min-w-0 flex-1 text-left" : "mt-4 max-w-sm",
          )}>
          <h3
            className={cn(
              "font-semibold leading-none tracking-tight text-[#1a1510]",
              isInline ? "text-sm" : "text-lg sm:text-xl",
            )}>
            {title}
          </h3>
          <p
            className={cn(
              "mt-2 font-plus-jakarta-sans leading-relaxed text-[#8a6a5a]",
              isInline ? "text-xs sm:text-sm line-clamp-2" : "text-sm",
              isPage && "mx-auto max-w-md",
            )}>
            {resolvedMessage}
          </p>

          {error &&
          !isInline &&
          typeof (error as { message?: string })?.message === "string" &&
          (error as { message: string }).message !== resolvedMessage ? (
            <div className='mx-auto mt-4 max-w-sm rounded-lg bg-[#9f2d20]/10 px-3 py-2'>
              <p className='font-plus-jakarta-sans text-xs font-medium text-[#9f2d20] line-clamp-3'>
                {String((error as { message: unknown }).message)}
              </p>
            </div>
          ) : null}
        </div>

        {onRetry && (
          <button
            type='button'
            onClick={onRetry}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full font-plus-jakarta-sans font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A57865]/30 active:scale-[0.98]",
              isInline
                ? "shrink-0 bg-gradient-to-b from-[#A57865] to-[#8B5E4D] px-4 py-2 text-xs text-white shadow-sm shadow-[#8B5E4D]/20 hover:brightness-105"
                : "mt-6 bg-gradient-to-b from-[#A57865] to-[#8B5E4D] px-5 py-2.5 text-sm text-white shadow-sm shadow-[#8B5E4D]/25 hover:brightness-105 sm:px-6",
              isPage && "mt-6",
            )}>
            <RefreshCw size={14} className='shrink-0' />
            {retryLabel}
          </button>
        )}
      </div>

      {!onRetry && !isInline && (
        <p className='relative mt-3 font-plus-jakarta-sans text-[11px] text-[#b89a85]'>
          If this keeps happening, please refresh the page.
        </p>
      )}
    </div>
  );
}
