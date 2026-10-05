import { ImageResponse } from "next/og";

/** Green tile with a white leaf. `inset` shrinks the leaf for maskable icons. */
export function brandIcon(size: number, { inset = 0.22, rounded = true } = {}) {
  const leaf = Math.round(size * (1 - inset * 2));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #2f8a57 0%, #1e5f3b 100%)",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg
          width={leaf}
          height={leaf}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
