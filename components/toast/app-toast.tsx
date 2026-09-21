// components/toasts/app-toast.tsx
import { toast } from "sonner";
import { toastVariantConfig, ToastVariant } from "./toast-variants";

interface AppToastProps {
  t: string | number;
  variant: ToastVariant;
  title: string;
  description: string;
}

function AppToastContent({ t, variant, title, description }: AppToastProps) {
  const { icon, badgeClass } = toastVariantConfig[variant];

  return (
    <div className='flex w-[17rem] overflow-hidden rounded-xl border border-white/5 bg-[#1c1c22] shadow-lg'>
      <div className='flex items-center border-r border-white/10 px-3.5'>
        <div className='size-7'>{icon}</div>
      </div>

      <div className='w-full'>
        <div className='flex flex-col gap-0.5 px-4 py-3'>
          <p className='font-sans text-[14px] leading-[1.1] font-normal text-white'>
            {title}
          </p>
          {description && (
            <p className='text-[13px] text-white/50'>{description}</p>
          )}
        </div>

        <button
          onClick={() => toast.dismiss(t)}
          className='w-full border-t border-white/10 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/5'>
          Close
        </button>
      </div>
    </div>
  );
}

export function showToast(
  variant: ToastVariant,
  title: string,
  description: string,
) {
  toast.custom((t) => (
    <AppToastContent
      t={t}
      variant={variant}
      title={title}
      description={description}
    />
  ));
}
