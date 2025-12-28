import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          
          // Variants
          variant === "primary" && 
            "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]",
          variant === "secondary" && 
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "outline" && 
            "border-2 border-primary/20 bg-transparent hover:bg-primary/10 text-primary",
          variant === "ghost" && 
            "hover:bg-white/5 text-muted-foreground hover:text-foreground",
            
          // Sizes
          size === "sm" && "h-9 px-3 text-xs",
          size === "md" && "h-11 px-6 text-sm",
          size === "lg" && "h-14 px-8 text-base tracking-wide uppercase font-bold",
          
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
