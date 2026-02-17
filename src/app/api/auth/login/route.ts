import { NextResponse } from "next/server";
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

function sign(payloadB64: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

export async function POST(req: Request) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const secret = process.env.AUTH_SECRET;

  if (!user || !pass || !secret) {
    return NextResponse.json(
      { error: "Auth not configured. Set BASIC_AUTH_USER, BASIC_AUTH_PASS, and AUTH_SECRET." },
      { status: 500 }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  let incomingUser = "";
  let incomingPass = "";
  let nextUrl = "/";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    incomingUser = String(body.username || "");
    incomingPass = String(body.password || "");
    nextUrl = String(body.next || "/");
  } else {
    const form = await req.formData();
    incomingUser = String(form.get("username") || "");
    incomingPass = String(form.get("password") || "");
    nextUrl = String(form.get("next") || "/");
  }

  if (incomingUser !== user || incomingPass !== pass) {
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }

  // Session valid for 7 days
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = { u: incomingUser, exp };
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = sign(payloadB64, secret);
  const token = `${payloadB64}.${sig}`;

  const res = NextResponse.redirect(new URL(nextUrl || "/", req.url));

  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });

  return res;
}
