"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Excavation buttons: rectangular, 1px border, mono uppercase label.
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-mono uppercase text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rust focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 border",
  {
    variants: {
      variant: {
        default:     "bg-fg text-bg border-fg hover:bg-rust hover:text-paper hover:border-rust",
        rust:        "bg-rust text-paper border-rust hover:bg-fg hover:text-bg hover:border-fg",
        outline:     "bg-transparent text-fg border-line hover:bg-fg hover:text-bg hover:border-fg",
        ghost:       "bg-transparent text-muted border-transparent hover:text-fg",
        secondary:   "bg-transparent text-fg border-line hover:bg-fg hover:text-bg",
        destructive: "bg-transparent text-rust border-rust hover:bg-rust hover:text-paper",
        link:        "bg-transparent border-transparent text-fg underline-offset-4 hover:underline hover:text-rust px-0",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-[10px]",
        lg: "h-12 px-6 text-[12px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
