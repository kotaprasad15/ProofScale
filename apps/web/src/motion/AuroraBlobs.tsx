import React from "react";

/**
 * Aurora blobs (code-split). Drifts via CSS keyframes; reduced motion keeps
 * them static — the global CSS kill-switch also handles this.
 */
export default function AuroraBlobs({ reduced }: { reduced: boolean }) {
  return (
    <>
      <div
        className="aurora-blob aurora-blob--violet"
        style={{
          width: "55vw",
          height: "55vw",
          top: "-18vh",
          left: "-12vw",
          animation: reduced ? undefined : "aurora-drift-a 26s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-blob aurora-blob--cyan"
        style={{
          width: "48vw",
          height: "48vw",
          top: "30vh",
          right: "-15vw",
          animation: reduced ? undefined : "aurora-drift-b 34s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-blob aurora-blob--mint"
        style={{
          width: "38vw",
          height: "38vw",
          bottom: "-12vh",
          left: "18vw",
          animation: reduced ? undefined : "aurora-drift-a 30s ease-in-out 6s infinite",
        }}
      />
      <div
        className="aurora-blob aurora-blob--rose"
        style={{
          width: "30vw",
          height: "30vw",
          bottom: "20vh",
          right: "22vw",
          animation: reduced ? undefined : "aurora-drift-b 40s ease-in-out 12s infinite",
        }}
      />
    </>
  );
}
