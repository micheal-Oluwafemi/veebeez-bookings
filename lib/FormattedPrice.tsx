"use client"

import { NumericFormat, numericFormatter } from "react-number-format"

type FormatPriceOptions = {
  /** Prefix symbol. Default `"₦"` (NGN). Pass `""` for plain 2,000. */
  prefix?: string
  /** Fixed number of decimal places. Omit to preserve input decimals. */
  decimalScale?: number
  /** Keep trailing zeros when decimalScale is set. Default `false`. */
  fixedDecimalScale?: boolean
  /** Thousand separator. Default `","`. */
  thousandSeparator?: string | boolean
}

/**
 * Pure formatter — same engine as `PriceInput` (`react-number-format`).
 * Returns `""` for null/empty so callers can fallback to `"no extra"` etc.
 *
 * @example
 * formatPrice(20000)          // "₦20,000"
 * formatPrice("20000.5")      // "₦20,000.5"
 * formatPrice(20000,{decimalScale:2, fixedDecimalScale:true}) // "₦20,000.00"
 * formatPrice(20000,{prefix:""}) // "20,000"
 */
export function formatPrice(
  value: unknown,
  {
    prefix = "₦",
    decimalScale,
    fixedDecimalScale,
    thousandSeparator = ",",
  }: FormatPriceOptions = {}
): string {
  if (value === null || value === undefined) return ""
  const raw = String(value).trim()
  if (raw === "") return ""
  // strip existing formatting (₦, commas) — keep digits, dot, minus
  const numStr = raw.replace(/[^0-9.\-]/g, "")
  if (!numStr || numStr === "." || numStr === "-" || numStr === "-.") return ""
  return numericFormatter(numStr, {
    thousandSeparator: thousandSeparator as string,
    prefix,
    ...(decimalScale !== undefined ? { decimalScale } : {}),
    ...(fixedDecimalScale !== undefined
      ? { fixedDecimalScale }
      : decimalScale !== undefined && decimalScale > 0
        ? { fixedDecimalScale: false }
        : {}),
    allowNegative: false,
  })
}

export type FormattedPriceProps = {
  /** Number or numeric string. `null`/`""` renders `fallback`. */
  value: unknown
  prefix?: string
  decimalScale?: number
  fixedDecimalScale?: boolean
  thousandSeparator?: string | boolean
  className?: string
  /** Rendered when value is null/empty. Default `"—"`. */
  fallback?: string
}

/**
 * Read-only display companion to `PriceInput`.
 * Uses `NumericFormat displayType="text"` so the rendering path
 * (thousandSeparator + prefix) is byte-for-byte identical to the input.
 */
export function FormattedPrice({
  value,
  prefix = "₦",
  decimalScale,
  fixedDecimalScale,
  thousandSeparator = ",",
  className,
  fallback = "—",
}: FormattedPriceProps) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return <span className={className}>{fallback}</span>
  }
  const raw = String(value).replace(/[^0-9.\-]/g, "")
  if (!raw || raw === "." || raw === "-") {
    return <span className={className}>{fallback}</span>
  }
  return (
    <NumericFormat
      value={raw}
      displayType="text"
      thousandSeparator={thousandSeparator as string}
      prefix={prefix}
      {...(decimalScale !== undefined ? { decimalScale } : {})}
      {...(fixedDecimalScale !== undefined
        ? { fixedDecimalScale }
        : decimalScale !== undefined && decimalScale > 0
          ? { fixedDecimalScale: false }
          : {})}
      allowNegative={false}
      className={className}
    />
  )
}
