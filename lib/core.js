/**
 * palette-tokens core — shared between CLI and browser
 *
 * Imports use bare specifiers so they resolve via:
 *   - Node.js: npm packages (dittotones, culori)
 *   - Browser: importmap → esm.sh
 */

import { DittoTones } from 'dittotones';
import { tailwindRamps } from 'dittotones/ramps/tailwind';
import { formatHex, oklch, parse } from 'culori';

const ditto = new DittoTones({ ramps: tailwindRamps });

export const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

// ── Conversion helpers ────────────────────────────────────────────────────────

export function hueToHex(hue) {
  return formatHex({ mode: 'oklch', l: 0.55, c: 0.2, h: hue });
}

function scaleToHexMap(scale) {
  const out = {};
  for (const shade of SHADE_KEYS) {
    out[shade] = formatHex(scale[shade]);
  }
  return out;
}

// ── Scale generation ──────────────────────────────────────────────────────────

export function generateColorScale(primaryHex) {
  return scaleToHexMap(ditto.generate(primaryHex).scale);
}

export function generateNeutralScale(primaryHex) {
  const p = oklch(parse(primaryHex));
  const neutralHex = formatHex({ mode: 'oklch', l: p.l, c: Math.min(p.c * 0.12, 0.02), h: p.h });
  return scaleToHexMap(ditto.generate(neutralHex).scale);
}

export function generateSecondaryScale(primaryHex, scheme) {
  if (scheme === 'single') return null;
  const p = oklch(parse(primaryHex));
  const shift = scheme === 'analogous' ? 40 : 180;
  const newHue = ((p.h || 0) + shift) % 360;
  const secHex = formatHex({ mode: 'oklch', l: p.l, c: p.c * 0.85, h: newHue });
  return scaleToHexMap(ditto.generate(secHex).scale);
}

// ── Role mapping ──────────────────────────────────────────────────────────────

export const LIGHT_ROLES = {
  bg:         { source: 'neutral', shade: '50' },
  surface:    { source: 'neutral', shade: '100' },
  border:     { source: 'neutral', shade: '200' },
  'text-muted': { source: 'neutral', shade: '500' },
  text:       { source: 'neutral', shade: '900' },
  primary:    { source: 'color',   shade: '500' },
  secondary:  { source: 'accent',  shade: '200' },
};

export const DARK_ROLES = {
  bg:           { source: 'neutral', shade: '900' },
  surface:      { source: 'neutral', shade: '800' },
  border:       { source: 'neutral', shade: '700' },
  'text-muted': { source: 'neutral', shade: '400' },
  text:         { source: 'neutral', shade: '50' },
  primary:      { source: 'color',   shade: '600' },  // solid fill — passes AA with neutral/50 text
  'primary-text': { source: 'color', shade: '400' },  // colored text/links — passes AA on dark surface
  secondary:    { source: 'accent',  shade: '800' },
};

export function resolveTokens(colorScale, neutralScale, secondaryScale, dark) {
  const roles = dark ? DARK_ROLES : LIGHT_ROLES;
  // single scheme: no accent → secondary uses color/800 (darker shade of primary)
  const accentScale = secondaryScale || colorScale;
  const tokens = {};
  for (const [role, def] of Object.entries(roles)) {
    if (def.source === 'neutral') tokens[role] = neutralScale[def.shade];
    else if (def.source === 'accent') tokens[role] = accentScale[def.shade];
    else tokens[role] = colorScale[def.shade];
  }
  return tokens;
}

// ── WCAG ──────────────────────────────────────────────────────────────────────

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function checkWCAG(tokens) {
  const pairs = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['text-muted', 'bg'],
    ['text-muted', 'surface'],
    ['primary', 'bg'],
    ['primary', 'surface'],
    ...(tokens['primary-text'] ? [['primary-text', 'bg'], ['primary-text', 'surface']] : []),
  ];
  const wcag = {};
  for (const [fg, bg] of pairs) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    wcag[`${fg}/${bg}`] = { ratio: Math.round(ratio * 100) / 100, pass: ratio >= 4.5 };
  }
  return wcag;
}

// ── Main entry ────────────────────────────────────────────────────────────────

/**
 * Generate a full palette from a primary hex color.
 * @param {string} primaryHex - e.g. '#6366f1'
 * @param {{ scheme?: 'single'|'analogous'|'complementary', dark?: boolean }} options
 * @returns {{ tokens, colorScale, neutralScale, secondaryScale, wcag }}
 */
export function generatePalette(primaryHex, { scheme = 'single', dark = false } = {}) {
  const colorScale = generateColorScale(primaryHex);
  const neutralScale = generateNeutralScale(primaryHex);
  const secondaryScale = generateSecondaryScale(primaryHex, scheme);
  const tokens = resolveTokens(colorScale, neutralScale, secondaryScale, dark);
  const wcag = checkWCAG(tokens);
  return { tokens, colorScale, neutralScale, secondaryScale, wcag };
}
