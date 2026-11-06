import { NextRequest, NextResponse } from "next/server";
import { internalDestination, pagePermission, sessionHeader, type Identity } from "./lib/auth";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login") return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("returnTo", internalDestination(path + request.nextUrl.search));
  const cookie = sessionHeader(request.headers.get("cookie"));
  if (!cookie) return NextResponse.redirect(login);
  try {
    const response = await fetch(new URL("/api/auth/me", process.env.BACKEND_API_URL || "http://localhost:8080"), {
      cache: "no-store", redirect: "manual", headers: { Cookie: cookie, Accept: "application/json" }, signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) return NextResponse.redirect(login);
    if (!response.ok) return new NextResponse("Serviço de autenticação indisponível.", { status: 503 });
    const user: Identity = await response.json();
    if (user.alterarSenha && path !== "/alterar-senha") {
      const change = new URL("/alterar-senha", request.url);change.searchParams.set("returnTo", internalDestination(path + request.nextUrl.search));
      return NextResponse.redirect(change);
    }
    const permission = pagePermission(path);
    if (permission && !user.permissions.includes(permission)) return new NextResponse("Acesso negado. Você não tem permissão para esta página.", { status: 403 });
    return NextResponse.next();
  } catch { return new NextResponse("Serviço de autenticação indisponível. Tente novamente.", { status: 503 }); }
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
