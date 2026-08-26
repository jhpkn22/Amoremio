import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const baseControl =
  "w-full min-h-11 rounded-xl border border-border bg-surface px-3.5 text-[15px] text-ink-900 " +
  "placeholder:text-ink-600/60 focus:border-border-strong focus:outline-none disabled:bg-rose-50/50";

export function Label({
  children,
  htmlFor,
  opcional,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  opcional?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-[13px] font-semibold text-ink-900", className)}>
      {children}
      {opcional && <span className="ml-1 font-normal text-ink-600">(opcional)</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseControl, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseControl, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(baseControl, className)} {...props}>
      {children}
    </select>
  );
}

export function CampoError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-[12.5px] font-medium text-alert">{children}</p>;
}

export function Field({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}
