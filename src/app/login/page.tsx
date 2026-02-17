import { colors, radii, shadows, spacing, typography } from "@/styles/tokens";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp?.next ? String(sp.next) : "/";
  const showError = sp?.error === "1";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: spacing.xl,
        backgroundColor: colors.cream,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.xl,
          boxShadow: shadows.md,
          padding: spacing.xl,
        }}
      >
        <div style={{ marginBottom: spacing.lg }}>
          <div
            style={{
              fontFamily: typography.fontFamily.heading,
              fontSize: typography.fontSize["3xl"],
              fontWeight: typography.fontWeight.bold,
              color: colors.deepCocoa,
              lineHeight: typography.lineHeight.tight,
            }}
          >
            Book Nest Ops
          </div>
          <div
            style={{
              marginTop: spacing.sm,
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
              lineHeight: typography.lineHeight.normal,
            }}
          >
            Please sign in to continue.
          </div>
        </div>

        {showError ? (
          <div
            style={{
              background: colors.softBlush,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
              color: colors.deepCocoa,
              fontSize: typography.fontSize.sm,
            }}
          >
            That username/password didn’t match. Try again.
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" style={{ display: "grid", gap: spacing.md }}>
          <input type="hidden" name="next" value={next} />

          <label style={{ display: "grid", gap: spacing.xs }}>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text }}>
              Username
            </span>
            <input
              name="username"
              autoComplete="username"
              required
              style={{
                padding: spacing.md,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: spacing.xs }}>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.text }}>
              Password
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{
                padding: spacing.md,
                borderRadius: radii.md,
                border: `1px solid ${colors.border}`,
                fontSize: typography.fontSize.base,
                outline: "none",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              marginTop: spacing.sm,
              padding: `${spacing.md} ${spacing.lg}`,
              borderRadius: radii.md,
              border: "none",
              background: colors.primary,
              color: "white",
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>

          <div
            style={{
              marginTop: spacing.sm,
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              lineHeight: typography.lineHeight.normal,
            }}
          >
            Tip: You can bookmark the page you want. If you get redirected here, we’ll send you back
            after login.
          </div>
        </form>
      </div>
    </main>
  );
}
