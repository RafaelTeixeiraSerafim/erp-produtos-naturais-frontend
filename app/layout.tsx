import { serverIdentity } from "@/lib/server-auth";
import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";
// The namespace must follow the runtime proxy environment, even after a build is moved.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Vila Verde · Catálogo", template: "%s · Vila Verde" },
  description: "Gestão do catálogo de produtos naturais da Vila Verde.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await serverIdentity();
  return (
    <html lang="pt-BR" className="[color-scheme:light]">
      <head>
        <meta
          name="recovery-environment"
          content={createHash("sha256")
            .update(new URL(process.env.BACKEND_API_URL || "http://localhost:8080").origin)
            .digest("hex")
            .slice(0, 24)}
        />
      </head>
      <body className="bg-background font-sans text-sm leading-normal text-foreground">
        <Providers identity={user}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
