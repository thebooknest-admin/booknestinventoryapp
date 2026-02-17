import type { Metadata } from "next";
import { cookies } from "next/headers";
import { colors, typography } from "@/styles/tokens";
import NavBar from "@/components/NavBar";
import { getSessionUser } from "@/lib/authSession";

export const metadata: Metadata = {
  title: "Book Nest Inventory",
  description: "Operations management system",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("bn_ops_session")?.value;
  const user = getSessionUser(sessionCookie);

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="manifest.json" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: typography.fontFamily.body,
          backgroundColor: colors.cream,
          color: colors.text,
          minHeight: "100vh",
        }}
      >
        <NavBar user={user} />
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}
