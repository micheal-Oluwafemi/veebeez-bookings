"use client";

/**
 * PriceInput — shared wrapper around `react-number-format`'s
 * `NumericFormat`. Keeps the form-state value as a plain `number`
 * (or `null` when the field is empty) while the input renders the
 * user-facing format with thousand separators, prefix, and NGN
 * decimals.
 *
 * Why it exists
 * -------------
 * • Admin inputs were previously either `<Input type="number">` with
 *   `register` (form state stayed a `string` and submit-time coerced
 *   via `Number(...)`) or `<CustomInput type="number">` with a
 *   `Controller` (form state was already a `number` but the display
 *   had no thousand separators). Mixing both meant `bundle_price` and
 *   `discount_value` arrived on the wire already coerced twice and
 *   big numbers (`1500000`) read as `1500000` with no comma.
 * • Now every monetary field goes through Controller + this wrapper:
 *   the user sees `₦1,500,000`, the form stores `1500000` (number),
 *   validation + wire payload stay plain numbers.
 *
 * App-wide currency assumption
 * ---------------------------
 * The admin is NGN-only (see `lib/money.ts`). The default `prefix="₦"`
 * is therefore hard-coded — passing `prefix="%"` for percentage-style
 * fields (e.g. promotion discount when `discount_type === "percentage"`)
 * is the only knob callers need. No currency-picker, no symbol logic.
 */
import * as React from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";

import { Input } from "@/components/ui/input";

export type PriceInputProps = Omit<
  NumericFormatProps,
  | "value"
  | "onValueChange"
  | "customInput"
  | "prefix"
  | "thousandSeparator"
  | "allowNegative"
> & {
  /** Plain-number form value. `null`/`undefined` render an empty input. */
  value: number | null | undefined;
  /** Called with the raw number (no commas, no symbol) on every change. */
  onValueChange: (value: number | null) => void;
  /** Default `"₦"`. Pass `"%"` for percentage-style fields. */
  prefix?: string;
  /** Number of fractional digits. Default `2` (NGN kobo). */
  decimalScale?: number;
  /** Custom input element (e.g. `CustomInput`) so the wrapper inherits
   *  the host page's input styling. Defaults to the shadcn `Input`.
   *  Typed as `React.ComponentType<any>` (not the broader
   *  `React.ElementType`) because `react-number-format`'s
   *  `customInput` prop rejects `symbol` and other non-component
   *  element types. The `any` in the prop shape is dictated by the
   *  third-party library's own generic — not a free-form escape hatch. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customInput?: React.ComponentType<any>;
  /** Plain HTML input attributes — id, aria, placeholder, etc. */
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
};

/**
 * Resolves `NumericFormat`'s `onValueChange` payload to our
 * `{ value: number | null }` contract.
 *   • `values.floatValue` is `undefined` when the input is empty.
 *   • Otherwise it's the raw decimal number — no commas, no symbol.
 *
 * RHF receives `null` on blur-with-empty (not `undefined`) so the
 * underlying form state never carries "unset" placeholders that would
 * fail `moneyNumber`'s `nonnegative()` check on submit.
 */
const toNullable = (values: {
  floatValue: number | undefined;
}): number | null =>
  values.floatValue === undefined ? null : values.floatValue;

export function PriceInput({
  value,
  onValueChange,
  prefix = "₦",
  customInput,
  id,
  disabled,
  placeholder,
  className,
  inputClassName,
  ...rest
}: PriceInputProps) {
  const CustomInputComponent = customInput ?? Input;
  return (
    <NumericFormat
      {...rest}
      id={id}
      value={value ?? ""}
      thousandSeparator=','
      // decimalScale={decimalScale}/
      // `fixedDecimalScale` keeps trailing zeros so "1500" typed by the
      // user renders as "1,500.00" — matches the read-side formatter
      // (`formatCurrencyAmount`) so admins see consistent shapes.
      // fixedDecimalScale={decimalScale > 0}
      allowNegative={false}
      prefix={prefix}
      customInput={CustomInputComponent}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      // `NumericFormat` forwards extra props to its `customInput` via
      // `getInputRef`; we pass through `inputClassName` for callers
      // that want to control the rendered element's class without
      // breaking the wrapper.
      {...(inputClassName ? { inputClassName } : {})}
      onValueChange={(values) => onValueChange(toNullable(values))}
    />
  );
}
