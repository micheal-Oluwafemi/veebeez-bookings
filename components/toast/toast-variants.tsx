// components/toasts/toast-variants.tsx
import {
  ChatSquareCheckBoldDuotone,
  DangerSquareBoldDuotone,
  DangerTriangleBoldDuotone,
  InfoSquareBoldDuotone,
} from "@solar-icons/react-perf";

export type ToastVariant = "success" | "info" | "error" | "warning";

export const toastVariantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; badgeClass?: string }
> = {
  success: {
    icon: <ChatSquareCheckBoldDuotone size={30} className='text-green-500' />,
  },
  info: {
    icon: <InfoSquareBoldDuotone size={30} className='text-blue-500' />,
  },
  error: {
    icon: <DangerSquareBoldDuotone size={30} className='text-red-500' />,
  },
  warning: {
    icon: <DangerTriangleBoldDuotone size={30} className='text-amber-500' />,
  },
};
