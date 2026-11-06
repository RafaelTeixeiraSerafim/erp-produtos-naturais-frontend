import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "w-full min-w-0 rounded-md border border-[#dce3dc] bg-white px-3 py-2.5 text-[13px] text-[#344c3b] placeholder:text-[#98a198] focus:outline-none focus:border-focus focus:ring-2 focus:ring-focus/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(controlClasses, "pr-6", className)} {...props} />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlClasses, "min-h-28 resize-y", className)}
      {...props}
    />
  );
}
