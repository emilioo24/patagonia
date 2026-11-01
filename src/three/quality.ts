export interface Quality {
  mobile: boolean;
  maxDpr: number;
  clearcoat: number;
  radialSegments: number;
  /** Sin transmission, el vidrio usa la versión falsa. */
  transmission: boolean;
}

export function detectQuality(): Quality {
  const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  return mobile
    ? { mobile, maxDpr: 1.5, clearcoat: 0, radialSegments: 64, transmission: false }
    : { mobile, maxDpr: 2, clearcoat: 0.6, radialSegments: 128, transmission: true };
}
