import { converter, formatHex } from "culori";
const toOklch = converter("oklch");
const toHex = formatHex;

type Hex = string;

export function generateScaleProcedural({
  hex,
  anchorStep = 9, // where you believe the seed sits in the 1..12 scale
  scheme = "light", // 'light' | 'dark'
}: {
  hex: Hex;
  anchorStep?: number;
  scheme?: "light" | "dark";
}): Hex[] {
  const seed = toOklch(hex);
  if (!seed) throw new Error("Invalid seed color");

  // Tuned lightness envelopes (roughly Radix-like)
  const L_LIGHT = [
    0.99, 0.985, 0.972, 0.958, 0.944, 0.9, 0.82, 0.72, 0.63, 0.56, 0.48, 0.34,
  ];
  const L_DARK = [
    0.13, 0.16, 0.19, 0.22, 0.25, 0.29, 0.35, 0.43, 0.53, 0.63, 0.75, 0.88,
  ];

  // Chroma envelope: low at extremes, peak near steps 9–10
  const C_BASE = [
    0.01, 0.02, 0.035, 0.055, 0.08, 0.1, 0.115, 0.125, 0.135, 0.14, 0.12, 0.09,
  ];

  const Ls = scheme === "light" ? L_LIGHT : L_DARK;

  // Re-center L & C so the anchor step matches the seed’s L/C
  const idx = Math.max(1, Math.min(12, anchorStep)) - 1;
  const eps = 1e-6;
  const lScale = seed.l / Math.max(Ls[idx]!, eps);
  // Allow weakly saturated seeds to remain modest
  const cTargetAnchor = C_BASE[idx]!;
  const cScale = (seed.c || 0.0001) / Math.max(cTargetAnchor, eps);

  const hue = seed.h; // keep hue constant (you can add tiny warm/cool drift if desired)

  return Ls.map((l, i) => {
    const L = Math.min(1, Math.max(0, l * lScale));
    // Clamp chroma to avoid out-of-gamut extremes; 0.22 is usually safe for UI
    const C = Math.min(0.22, Math.max(0, C_BASE[i]! * cScale));
    return toHex({ mode: "oklch", l: L, c: C, h: hue });
  });
}
