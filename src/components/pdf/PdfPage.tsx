import React from "react";
import { cn } from "@/lib/utils";

type PdfPageProps = React.HTMLAttributes<HTMLDivElement>;

const PdfPage = React.forwardRef<HTMLDivElement, PdfPageProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("page", className)} {...props}>
      {children}
    </div>
  ),
);

PdfPage.displayName = "PdfPage";

export default PdfPage;
