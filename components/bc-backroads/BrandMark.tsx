export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brandMark brandMarkCompact" : "brandMark"}>
      <svg
        aria-hidden="true"
        className="brandMarkIcon"
        viewBox="0 0 48 40"
        fill="none"
      >
        <path d="M3 34 16 10l8 13 6-8 15 19" />
        <path d="m9 34 8-7 6 5 7-6 9 8" />
      </svg>
      <span className="brandMarkType">BC BACKROADS</span>
    </div>
  );
}
