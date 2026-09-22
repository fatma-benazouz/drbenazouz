import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border text-sm font-semibold cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:border-ink hover:bg-ink",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
        outline:
          "border-input bg-background text-foreground hover:border-ink",
        secondary: "border-hairline bg-secondary text-secondary-foreground hover:border-ink",
        ghost: "border-transparent hover:border-hairline",
        link: "text-primary underline-offset-4 hover:underline",
        gold: "border-primary bg-primary text-primary-foreground hover:border-ink hover:bg-ink",
        goldOutline: "border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        navy: "border-ink bg-ink text-white hover:border-primary hover:bg-primary",
        navyOutline: "border-ink bg-transparent text-ink hover:bg-ink hover:text-white",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-[0.9375rem]",
        icon: "h-9 w-9",
      },

    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
