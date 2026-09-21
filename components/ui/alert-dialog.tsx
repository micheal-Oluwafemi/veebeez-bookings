"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Cast to allow DismissableLayer props for nested Select/CustomCombobox guards
// (AlertDialog primitive types lag behind — runtime supports them via DismissableLayer)
const AlertDialogContentPrimitive =
  AlertDialogPrimitive.Content as unknown as React.ComponentType<
    React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
      onInteractOutside?: (event: Event) => void;
      onPointerDownOutside?: (event: Event) => void;
    }
  >;

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot='alert-dialog' {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot='alert-dialog-trigger' {...props} />
  );
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot='alert-dialog-portal' {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot='alert-dialog-overlay'
      className={cn(
        "fixed inset-0 z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = "default",
  onCloseAutoFocus,
  onEscapeKeyDown,
  onInteractOutside,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm";
  onInteractOutside?: (event: Event) => void;
  onPointerDownOutside?: (event: Event) => void;
}) {
  const hasOpenSheet = React.useCallback(
    () => !!document.querySelector('[data-slot="sheet-content"]'),
    [],
  );

  const isInsideSelectOrCombobox = React.useCallback(
    (target: Element | null) =>
      !!target?.closest(
        '[data-slot="select-content"], [data-slot="select-trigger"], [data-custom-combobox-dropdown], [data-slot="custom-combobox-trigger"], [data-radix-popper-content-wrapper]',
      ),
    [],
  );

  const hasOpenSelectOrCombobox = React.useCallback(
    () =>
      !!(
        document.querySelector(
          '[data-slot="select-content"], [data-custom-combobox-dropdown], [data-slot="select-trigger"][data-state="open"], [data-slot="custom-combobox-trigger"][data-state="open"]',
        ) ||
        document.body.hasAttribute("data-select-open") ||
        document.body.hasAttribute("data-custom-combobox-open")
      ),
    [],
  );

  const handleCloseAutoFocus = React.useCallback(
    (event: Event) => {
      onCloseAutoFocus?.(event as never);
      if ((event as unknown as { defaultPrevented: boolean }).defaultPrevented)
        return;
      // Inner AlertDialog closing should not steal focus from a parent Sheet.
      // Prevent Radix from moving focus to body, which would cause the Sheet's
      // FocusScope to consider focus outside and potentially close.
      if (hasOpenSheet()) event.preventDefault();
      if (hasOpenSelectOrCombobox()) event.preventDefault();
    },
    [onCloseAutoFocus, hasOpenSheet, hasOpenSelectOrCombobox],
  );

  const handleEscapeKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      onEscapeKeyDown?.(event as never);
      if ((event as unknown as { defaultPrevented: boolean }).defaultPrevented)
        return;
      if (hasOpenSelectOrCombobox()) event.preventDefault();
    },
    [onEscapeKeyDown, hasOpenSelectOrCombobox],
  );

  const handleInteractOutside = React.useCallback(
    (event: Event) => {
      onInteractOutside?.(event as never);
      if ((event as unknown as { defaultPrevented: boolean }).defaultPrevented)
        return;
      const target =
        (event as unknown as { target: Element | null }).target ?? null;
      if (isInsideSelectOrCombobox(target)) event.preventDefault();
      else if (hasOpenSelectOrCombobox()) event.preventDefault();
    },
    [onInteractOutside, isInsideSelectOrCombobox, hasOpenSelectOrCombobox],
  );

  const handlePointerDownOutside = React.useCallback(
    (event: Event) => {
      onPointerDownOutside?.(event as never);
      if ((event as unknown as { defaultPrevented: boolean }).defaultPrevented)
        return;
      const target =
        (event as unknown as { target: Element | null }).target ?? null;
      if (isInsideSelectOrCombobox(target) || hasOpenSelectOrCombobox())
        event.preventDefault();
    },
    [onPointerDownOutside, isInsideSelectOrCombobox, hasOpenSelectOrCombobox],
  );

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogContentPrimitive
        data-slot='alert-dialog-content'
        data-size={size}
        onCloseAutoFocus={handleCloseAutoFocus}
        onEscapeKeyDown={handleEscapeKeyDown}
        onInteractOutside={handleInteractOutside}
        onPointerDownOutside={handlePointerDownOutside}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-4xl bg-popover p-6 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none sm:max-w-xl dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='alert-dialog-header'
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-start has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='alert-dialog-footer'
      className={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='alert-dialog-media'
      className={cn(
        "mb-2 inline-flex size-16 items-center justify-center rounded-full bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot='alert-dialog-title'
      className={cn(
        "font-heading text-lg font-semibold tracking-tight font-plus-jakarta-sans sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot='alert-dialog-description'
      className={cn(
        "text-sm text-balance text-gray-600 md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size}>
      <AlertDialogPrimitive.Action
        data-slot='alert-dialog-action'
        className={cn(className)}
        {...props}
      />
    </Button>
  );
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size}>
      <AlertDialogPrimitive.Cancel
        data-slot='alert-dialog-cancel'
        className={cn("rounded-lg", className)}
        {...props}
      />
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
