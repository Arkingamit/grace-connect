import React from "react";
import { GLASS_DISPLACEMENT_MAP } from "@/lib/glass-map";

/**
 * Global SVG filter providing liquid glass refraction via displacement mapping.
 * Used by backdrop-filter: url(#frosted) on .liquid-glass-pill elements.
 */
export default function GlassFilter() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <filter id="frosted" primitiveUnits="objectBoundingBox">
        <feImage
          href={GLASS_DISPLACEMENT_MAP}
          x="0"
          y="0"
          width="1"
          height="1"
          result="map"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
        <feDisplacementMap
          id="disp"
          in="blur"
          in2="map"
          scale={1}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
