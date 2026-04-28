import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

// Bracketed excavation tag: [ STRATUM 1 ]
export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const v: Record<Variant, string> = {
    default:     "tag",
    secondary:   "tag",
    success:     "tag tag-lichen",
    warning:     "tag tag-rust",
    destructive: "tag tag-rust",
    outline:     "tag",
  };
  return <span className={cn(v[variant], className)} {...props} />;
}
