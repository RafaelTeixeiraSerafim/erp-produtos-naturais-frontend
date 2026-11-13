import Link from "next/link";
import type { ComponentProps } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

export function BackLink({ children, className, ...props }: ComponentProps<typeof Link>) {
  return <Button asChild variant="outline" className={className}><Link {...props}><ArrowLeft size={15} aria-hidden="true"/>{children}</Link></Button>;
}
