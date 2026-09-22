"use client";

export function PageStatusFrost() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] desktop:hidden"
      style={{ height: "calc(env(safe-area-inset-top, 0px) + 52px)" }}
    >
      <div className="status-frost" />
    </div>
  );
}
