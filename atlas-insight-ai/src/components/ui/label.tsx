import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      ref={ref}
      className={cn("text-xs font-semibold uppercase tracking-wide text-ink/60", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
