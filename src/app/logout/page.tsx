import { colors, radii, shadows, spacing, typography } from "@/styles/tokens";

export default function LogoutPage() {
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
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: typography.fontFamily.heading,
            fontSize: typography.fontSize["2xl"],
            fontWeight: typography.fontWeight.bold,
            color: colors.deepCocoa,
            marginBottom: spacing.md,
          }}
        >
          Log out?
        </div>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              borderRadius: radii.md,
              border: "none",
              background: colors.secondary,
              color: "white",
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.semibold,
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </form>

        <div style={{ marginTop: spacing.md, fontSize: typography.fontSize.xs, color: colors.textMuted }}>
          This clears your session cookie and sends you back to the login screen.
        </div>
      </div>
    </main>
  );
}
