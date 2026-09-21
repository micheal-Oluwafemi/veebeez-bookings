import { Skeleton } from "./skeleton"

// Duplicated from ReceiptPrinter to avoid importing a client component
// into the Suspense fallback (server) — keeps the skeleton as a pure
// server component and prevents "ReceiptPrinter.Root is undefined".
const machineClassName =
  "relative isolate w-full overflow-hidden rounded-[var(--printer-radius)] border border-grayscale-12 bg-[color-mix(in_oklab,var(--color-grayscale-11)_30%,var(--color-grayscale-12))] p-[var(--printer-inset)] pb-8 shadow-[0_20px_36px_-20px_color-mix(in_oklab,var(--color-grayscale-12)_55%,transparent),0_6px_14px_-8px_color-mix(in_oklab,var(--color-grayscale-12)_24%,transparent),inset_0_1px_0_color-mix(in_oklab,var(--color-grayscale-1)_14%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--color-grayscale-12)_55%,transparent)] [--printer-inner-radius:calc(var(--printer-radius)_-_var(--printer-inset))] [--printer-inset:0.75rem] [--printer-radius:1.5rem] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[url('/textures/plastic-noise.svg')] before:bg-[length:180px_180px] before:bg-repeat before:opacity-30 before:mix-blend-multiply before:content-[''] dark:border-grayscale-3 dark:bg-grayscale-4 dark:shadow-[0_20px_36px_-20px_color-mix(in_oklab,var(--color-grayscale-3)_55%,transparent),0_6px_14px_-8px_color-mix(in_oklab,var(--color-grayscale-3)_24%,transparent),inset_0_1px_0_color-mix(in_oklab,var(--color-grayscale-12)_14%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--color-grayscale-3)_55%,transparent)]"

const receiptToothCount = 40
const receiptToothDepth = 4
const receiptToothPoints = Array.from(
  { length: receiptToothCount * 2 },
  (_, index) => {
    const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2)
    const y = index % 2 === 0 ? "100%" : `calc(100% - ${receiptToothDepth}px)`
    return `${x}% ${y}`
  }
).join(", ")
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`

/**
 * Precise server skeleton for `/ecommerce/payment_successful`.
 *
 * Mirrors `PaymentPrinterReceipt` node-for-node without importing the
 * client `ReceiptPrinter` (which would need `useContext`/`motion` and
 * breaks when used as a Suspense fallback from a server page).
 * Same outer shell, `max-w-sm` root, `machineClassName` vars,
 * `h-11` header, inner screen, and `h-auto` output/paper with
 * `receiptClipPath`.
 */
export function PaymentReceiptSkeleton() {
  return (
    <div
      className="min-h-screen w-full px-4 py-10"
      style={{
        backgroundColor: "#F7F5F2",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div className="mt-16 flex min-h-screen justify-center">
        {/* Root — same as ReceiptPrinter.Root w/ max-w-sm */}
        <section
          aria-label="Receipt printer"
          className="relative isolate flex w-full max-w-sm flex-col items-center"
          data-stage="pending"
        >
          {/* Machine */}
          <div className={machineClassName}>
            {/* Header — h-11 */}
            <div className="relative z-10 flex h-11 items-start justify-between">
              <Skeleton className="mt-1 h-3 w-28 bg-white/20" />
              <div className="flex items-center gap-1">
                <Skeleton className="size-7 rounded-md bg-white/10" />
                <Skeleton className="size-7 rounded-md bg-white/10" />
              </div>
            </div>

            {/* Screen */}
            <div className="relative isolate z-10 overflow-hidden rounded-[var(--printer-inner-radius)] border border-grayscale-12 bg-grayscale-12 p-4 text-grayscale-1 shadow-inner shadow-grayscale-12/80 dark:border-grayscale-1 dark:bg-grayscale-2">
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-3 w-28 bg-white/15" />
                  <Skeleton className="h-3 w-20 bg-white/15" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 shrink-0 rounded-full bg-white/15" />
                  <Skeleton className="h-3 w-32 bg-white/15" />
                </div>
              </div>
            </div>

            {/* Bottom slot shadow */}
            <div
              aria-hidden="true"
              className="absolute inset-x-6 bottom-[var(--printer-inset)] z-40 h-2 rounded-[0.25rem] border border-grayscale-12 bg-grayscale-12 shadow-inner shadow-grayscale-12 dark:border-grayscale-1 dark:bg-grayscale-1 dark:shadow-grayscale-1"
            />
          </div>

          {/* Output — h-auto (isStatic: pending/complete) */}
          <div className="relative z-50 -mt-4 w-[calc(80%+3rem)] max-w-full h-auto overflow-visible px-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 bg-grayscale-12/75 blur-[6px] dark:bg-grayscale-1/75"
            />
            <div className="relative isolate before:pointer-events-none before:absolute before:inset-x-3 before:top-3 before:bottom-4 before:z-0 before:rounded-sm before:shadow-[0_8px_24px_color-mix(in_oklab,var(--color-grayscale-12)_24%,transparent)] before:content-[''] after:pointer-events-none after:absolute after:right-[8%] after:bottom-0 after:left-[8%] after:z-0 after:h-3 after:translate-y-1.5 after:rounded-full after:bg-grayscale-12/10 after:blur-lg after:content-[''] dark:before:shadow-[0_8px_24px_color-mix(in_oklab,var(--color-grayscale-1)_20%,transparent)] dark:after:bg-grayscale-1/10">
              {/* Paper */}
              <article
                className="relative z-10 min-h-80 bg-grayscale-1 bg-[url('/textures/receipt-paper.svg')] bg-cover px-4 pt-7 pb-8 font-sans! text-grayscale-12 bg-blend-soft-light dark:bg-grayscale-12 dark:text-grayscale-1"
                style={{ clipPath: receiptClipPath }}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-32" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>

                  <Skeleton className="h-px w-full rounded-full" />

                  <div>
                    <Skeleton className="mb-2 h-2.5 w-20" />
                    <div className="flex flex-col gap-3">
                      <ItemRowSkeleton />
                      <ItemRowSkeleton />
                      <ItemRowSkeleton />
                    </div>
                  </div>

                  <Skeleton className="h-px w-full rounded-full" />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-dashed pt-2">
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>

                  <Skeleton className="h-px w-full rounded-full" />

                  <div>
                    <Skeleton className="mb-2 h-2.5 w-20" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>

                  <Skeleton className="h-px w-full rounded-full" />

                  <div>
                    <Skeleton className="mb-2 h-2.5 w-32" />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>

                  <Skeleton className="mx-auto h-6 w-28 rounded-sm" />
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ItemRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-md" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-14 shrink-0" />
    </div>
  )
}
