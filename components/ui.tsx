import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import Link from "next/link";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  href,
  variant = "green",
  className,
  children,
  ...props
}: {
  href?: string;
  variant?: "green" | "blue" | "navy" | "outline" | "ghost-light";
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    green: "bg-brand-green text-white hover:bg-forest-700",
    blue: "bg-brand-blue text-white hover:bg-blue-700",
    navy: "bg-navy-950 text-white hover:bg-navy-800",
    outline: "border border-navy-900/15 bg-white text-navy-950 hover:bg-slate-50",
    "ghost-light": "border border-white/25 bg-transparent text-white hover:bg-white/10",
  }[variant];
  const cls = cn(
    "inline-flex min-h-tap items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold tracking-tight transition disabled:opacity-60",
    styles,
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-navy-900/15 bg-white px-3 py-2.5 text-sm text-navy-950 outline-none focus:border-brand-blue";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-navy-950">{label}</span>
      {children}
      {hint && <span className="text-xs text-navy-800/55">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-[96px]", props.className)} {...props} />;
}

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "blue" | "navy" | "amber";
}) {
  const cls = {
    green: "bg-forest-100 text-forest-700",
    blue: "bg-blue-50 text-brand-blue",
    navy: "bg-navy-950/8 text-navy-800",
    amber: "bg-amber-50 text-amber-800",
  }[tone];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", cls)}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-navy-900/8 bg-white shadow-card", className)}>{children}</div>;
}
