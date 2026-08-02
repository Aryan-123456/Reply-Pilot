import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  const variants = {
    default: "bg-[#2857f5] text-white hover:bg-blue-700 shadow-md shadow-blue-600/20",
    outline: "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-[#2857f5]",
    secondary: "bg-blue-50 text-[#2857f5] hover:bg-blue-100",
    destructive: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "text-slate-500 hover:bg-blue-50 hover:text-[#2857f5]",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-6 text-base rounded-xl",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
