import React, { lazy, Suspense } from "react";
import { useReducedMotion } from "./useReducedMotion";

const Blobs = lazy(() => import("./AuroraBlobs"));

/**
 * Fixed aurora field behind all glass surfaces: drifting gradient blobs plus
 * a faint noise overlay to prevent banding. Respects reduced motion (static).
 */
export function AuroraBackground() {
  const reduced = useReducedMotion();
  return (
    <>
      <div className="aurora-field" aria-hidden="true">
        <Suspense fallback={null}>
          <Blobs reduced={reduced} />
        </Suspense>
      </div>
      <div
        aria-hidden="true"
        className="noise-texture fixed inset-0 z-0 pointer-events-none"
      />
    </>
  );
}
