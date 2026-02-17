import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "bn_ops_session";

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlToBuffer(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(payloadB64: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

function verifySessionCookie(cookieValue: string | undefined, secret: string): boolean {
  if (!cookieValue) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64, secret);

  // Constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  try {
    const payloadJson = base64urlToBuffer(payloadB64).toString("utf8");
    const payload = JSON.parse(payloadJson) as { exp: number; u?: string };

    if (!payload?.exp) return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Allow Next internals + public assets
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // Allow auth endpoints + login/logout pages
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/logout") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const secret = process.env.AUTH_SECRET;

  // If not configured, fail-open so you don't brick dev accidentally.
  // IMPORTANT: For production, you should set all 3 env vars.
  if (!user || !pass || !secret) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  const isAuthed = verifySessionCookie(cookieValue, secret);

  if (isAuthed) {
    return NextResponse.next();
  }

  // If it's an API route, return 401 instead of redirecting to HTML
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect to /login with a return path
  const next = encodeURIComponent(pathname + (url.search || ""));
  const loginUrl = new URL(`/login?next=${next}`, url.origin);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
