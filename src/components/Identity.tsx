export function Mark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      aria-hidden="true"
      className="brand-symbol"
    >
      <path
        d="M3 20V6l5 4 5-4 5 4 5-4v14l-5-4-5 4-5-4-5 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 10v6m5-10v14m5-10v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".5"
      />
    </svg>
  );
}
export function MemorySculpture() {
  return (
    <svg className="memory-sculpture" viewBox="0 0 360 260" aria-hidden="true">
      <defs>
        <linearGradient id="slab-top" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--sculpture-light)" />
          <stop offset="1" stopColor="var(--sculpture-mid)" />
        </linearGradient>
        <linearGradient id="slab-side" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--sculpture-mid)" />
          <stop offset="1" stopColor="var(--sculpture-dark)" />
        </linearGradient>
      </defs>
      {[4, 3, 2, 1, 0].map((n) => (
        <g key={n} transform={`translate(0 ${n * 21})`}>
          <path
            d="M74 80 188 24 306 80v15l-118 57L74 95Z"
            fill="url(#slab-side)"
            stroke="var(--sculpture-edge)"
            strokeWidth=".7"
          />
          <path
            d="M74 80 188 24 306 80 188 137Z"
            fill="url(#slab-top)"
            stroke="var(--sculpture-edge)"
            strokeWidth=".8"
          />
          <path
            d="m113 80 75-36 77 36-77 37Z"
            fill="none"
            stroke={n === 0 ? "var(--accent)" : "var(--sculpture-edge)"}
            strokeWidth=".9"
            opacity={n === 0 ? 0.8 : 0.4}
          />
          {n === 0 && (
            <path
              d="m162 80 26-13 27 13-27 13Z"
              fill="var(--accent)"
              opacity=".8"
            />
          )}
        </g>
      ))}
    </svg>
  );
}
