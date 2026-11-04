export function Mark() {
  return (
    <svg
      className="brand-symbol"
      width="28"
      height="28"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <path
        d="M7 10a9 9 0 0 1 18 0v12a5 5 0 0 1-10 0V11a2 2 0 0 1 4 0v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M7 10v11a9 9 0 0 0 18 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".4"
      />
    </svg>
  );
}
export function MemorySculpture() {
  return <div className="trace-memory-art" aria-hidden="true" />;
}
