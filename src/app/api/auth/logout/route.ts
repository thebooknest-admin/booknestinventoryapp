import { NextResponse } from "next/server";

const COOKIE_NAME = "bn_ops_session";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));

  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return res;
}
