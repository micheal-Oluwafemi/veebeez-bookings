import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='skeleton'
      className={cn(
        "skeleton-pulse rounded-md bg-[#e8ddd0]/60",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
