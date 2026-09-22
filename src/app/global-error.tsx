'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAF7F2", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: "22rem", borderRadius: "1.5rem", border: "1px solid #E5D5C5", background: "#fff", padding: "1.75rem 1.5rem", textAlign: "center" }}>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B2323" }}>
              Grace Connect
            </p>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#1A202C" }}>
              We&apos;re updating the app
            </h2>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", lineHeight: 1.55, color: "#5B6470" }}>
              Grace Connect hit a snag. Try again after sometime.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ width: "100%", border: 0, borderRadius: 9999, padding: "0.8rem 1rem", fontSize: "0.95rem", fontWeight: 600, background: "linear-gradient(90deg, #810008, #A3161E)", color: "#fff" }}
            >
              Try again
            </button>
            <pre style={{ display: "none" }}>{error?.message}</pre>
          </div>
        </div>
      </body>
    </html>
  );
}
