import "server-only";
import { cookies } from "next/headers";
import type { Identity } from "./auth";
import { sessionCookie } from "./auth";
export async function serverIdentity(): Promise<Identity | null> {
  const cookie = (await cookies()).get(sessionCookie);
  if (!cookie) return null;
  const response = await fetch(new URL("/api/auth/me", process.env.BACKEND_API_URL || "http://localhost:8080"), {
    cache: "no-store", headers: { Cookie: `${sessionCookie}=${cookie.value}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000), redirect: "manual",
  });
  if (!response.ok) return null;
  return response.json();
}
