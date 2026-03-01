#!/usr/bin/env node

import { DittoTones } from 'dittotones';
import { tailwindRamps } from 'dittotones/ramps/tailwind';
import { formatHex, oklch, parse } from 'culori';

// ── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getFlag(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  args.splice(i, 1);
  return true;
}

function getOption(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const val = args[i + 1];
  args.splice(i, 2);
  return val;
}

const showHelp = getFlag('help') || getFlag('h');
const dark = getFlag('dark');
const preview = getFlag('preview');
const scheme = getOption('scheme', 'single');
const format = getOption('format', 'css');
const hueOpt = getOption('hue', null);

if (showHelp) {
  console.log(`
palette-tokens — Generate UI color palettes from a hue or hex color

Usage:
  palette-tokens [hue|hex] [options]

Arguments:
  [hue]           Hue value 0–360 (e.g. 240)
  [hex]           Hex color (e.g. 6366f1)
  (no argument)   Random hue

Options:
  --hue <value>   Hue value 0–360 (alternative to positional arg)
  --scheme <type> Color scheme: single, analogous, complementary (default: single)
  --dark          Output dark mode tokens
  --format <fmt>  Output format: css, json, both (default: css)
  --preview       Show colored terminal preview
  --help          Show this help message

Examples:
  palette-tokens              # random hue
  palette-tokens 240          # hue 240 (blue)
  palette-tokens 6366f1       # from hex
  palette-tokens --hue 120 --scheme analogous --preview
`);
  process.exit(0);
}

// ── Resolve primary hex ───────────────────────────────────────────────────────

function hueToHex(hue) {
  return formatHex({ mode: 'oklch', l: 0.55, c: 0.2, h: hue });
}

let primaryHex;
let resolvedHue;

const positional = args[0] ? String(args[0]).replace(/^['"]|['"]$/g, '') : null;

if (hueOpt !== null) {
  // --hue flag takes precedence
  resolvedHue = parseFloat(hueOpt) % 360;
  primaryHex = hueToHex(resolvedHue);
} else if (positional !== null && /^\d+(\.\d+)?$/.test(positional)) {
  // Positional numeric → treat as hue
  resolvedHue = parseFloat(positional) % 360;
  primaryHex = hueToHex(resolvedHue);
} else if (positional !== null && /^#?[0-9a-fA-F]{6}$/.test(positional)) {
  // Positional hex
  primaryHex = positional.startsWith('#') ? positional : `#${positional}`;
} else if (positional !== null) {
  console.error(`Error: Invalid input "${positional}". Use a hue (0–360) or hex color.`);
  process.exit(1);
} else {
  // No argument → random hue
  resolvedHue = Math.floor(Math.random() * 360);
  primaryHex = hueToHex(resolvedHue);
  if (process.stderr.isTTY) process.stderr.write(`hue: ${resolvedHue}\n`);
}

if (!['single', 'analogous', 'complementary'].includes(scheme)) {
  console.error(`Error: Invalid scheme "${scheme}". Use single, analogous, or complementary.`);
  process.exit(1);
}

if (!['css', 'json', 'both'].includes(format)) {
  console.error(`Error: Invalid format "${format}". Use css, json, or both.`);
  process.exit(1);
}

// ── Color generation ─────────────────────────────────────────────────────────

const ditto = new DittoTones({ ramps: tailwindRamps });
const shadeKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function scaleToHex(result) {
  const out = {};
  for (const shade of shadeKeys) {
    out[shade] = formatHex(result.scale[shade]);
  }
  return out;
}

// Primary color scale
const colorResult = ditto.generate(primaryHex);
const colorScale = scaleToHex(colorResult);

// Neutral scale: same hue, chroma reduced to 12% (max 0.02)
const p = oklch(parse(primaryHex));
const neutralColor = formatHex({ mode: 'oklch', l: p.l, c: Math.min(p.c * 0.12, 0.02), h: p.h });
const neutralResult = ditto.generate(neutralColor);
const neutralScale = scaleToHex(neutralResult);

// Secondary scale (if scheme != single)
let secondaryScale = null;
if (scheme !== 'single') {
  const shift = scheme === 'analogous' ? 40 : 180;
  const newHue = ((p.h || 0) + shift) % 360;
  const secColor = formatHex({ mode: 'oklch', l: p.l, c: p.c * 0.85, h: newHue });
  const secResult = ditto.generate(secColor);
  secondaryScale = scaleToHex(secResult);
}

// ── Role mapping ─────────────────────────────────────────────────────────────

const accentScale = secondaryScale || colorScale;

const tokens = dark
  ? {
      bg: neutralScale['950'],
      surface: neutralScale['900'],
      border: neutralScale['800'],
      'text-muted': neutralScale['400'],
      text: neutralScale['50'],
      primary: colorScale['400'],
      secondary: accentScale['700'],
    }
  : {
      bg: neutralScale['50'],
      surface: neutralScale['100'],
      border: neutralScale['200'],
      'text-muted': neutralScale['500'],
      text: neutralScale['900'],
      primary: colorScale['500'],
      secondary: accentScale['200'],
    };

// ── WCAG contrast ────────────────────────────────────────────────────────────

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const wcagPairs = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text-muted', 'bg'],
  ['text-muted', 'surface'],
  ['primary', 'bg'],
  ['primary', 'surface'],
];

const wcag = {};
for (const [fg, bg] of wcagPairs) {
  const ratio = contrastRatio(tokens[fg], tokens[bg]);
  const key = `${fg}/${bg}`;
  wcag[key] = { ratio: Math.round(ratio * 100) / 100, pass: ratio >= 4.5 };
}

// ── Output: CSS ──────────────────────────────────────────────────────────────

function outputCSS() {
  const lines = [':root {'];
  for (const [role, hex] of Object.entries(tokens)) {
    lines.push(`  --color-${role}: ${hex};`);
  }
  lines.push('');
  lines.push('  /* Color scale */');
  for (const shade of shadeKeys) {
    lines.push(`  --color-${shade}: ${colorScale[shade]};`);
  }
  lines.push('');
  lines.push('  /* Neutral scale */');
  for (const shade of shadeKeys) {
    lines.push(`  --neutral-${shade}: ${neutralScale[shade]};`);
  }
  if (secondaryScale) {
    lines.push('');
    lines.push('  /* Secondary scale */');
    for (const shade of shadeKeys) {
      lines.push(`  --secondary-${shade}: ${secondaryScale[shade]};`);
    }
  }
  lines.push('}');
  console.log(lines.join('\n'));
}

// ── Output: JSON ─────────────────────────────────────────────────────────────

function buildJSON() {
  const scales = { color: colorScale, neutral: neutralScale };
  if (secondaryScale) scales.secondary = secondaryScale;
  return {
    mode: dark ? 'dark' : 'light',
    scheme,
    input: primaryHex,
    ...(resolvedHue != null && { hue: resolvedHue }),
    tokens,
    scales,
    wcag,
  };
}

function outputJSON() {
  console.log(JSON.stringify(buildJSON(), null, 2));
}

// ── Output: Preview ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function bgColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  return `\x1b[48;2;${r};${g};${b}m`;
}

function fgColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const reset = '\x1b[0m';

function outputPreview() {
  console.log('\n── Palette Preview ─────────────────────────────────────');
  const inputLabel = resolvedHue != null ? `hue ${resolvedHue} → ${primaryHex}` : primaryHex;
  console.log(`   Mode: ${dark ? 'dark' : 'light'}  |  Scheme: ${scheme}  |  Input: ${inputLabel}\n`);

  // Role tokens
  console.log('  Tokens:');
  const maxLen = Math.max(...Object.keys(tokens).map((k) => k.length));
  for (const [role, hex] of Object.entries(tokens)) {
    const label = role.padEnd(maxLen + 1);
    const block = `${bgColor(hex)}      ${reset}`;
    // Pick contrasting text for the swatch label
    const lum = relativeLuminance(hex);
    const textHex = lum > 0.18 ? '#000000' : '#ffffff';
    const swatch = `${bgColor(hex)}${fgColor(textHex)} ${hex} ${reset}`;
    console.log(`    ${label} ${block} ${swatch}`);
  }

  // Scales
  console.log('\n  Color scale:');
  let row = '    ';
  for (const shade of shadeKeys) {
    row += `${bgColor(colorScale[shade])}  ${reset}`;
  }
  console.log(row);
  row = '    ';
  for (const shade of shadeKeys) {
    const lum = relativeLuminance(colorScale[shade]);
    const fg = lum > 0.18 ? '\x1b[30m' : '\x1b[97m';
    row += `${bgColor(colorScale[shade])}${fg}${shade.padStart(2)}${reset}`;
  }
  console.log(row);

  console.log('\n  Neutral scale:');
  row = '    ';
  for (const shade of shadeKeys) {
    row += `${bgColor(neutralScale[shade])}  ${reset}`;
  }
  console.log(row);
  row = '    ';
  for (const shade of shadeKeys) {
    const lum = relativeLuminance(neutralScale[shade]);
    const fg = lum > 0.18 ? '\x1b[30m' : '\x1b[97m';
    row += `${bgColor(neutralScale[shade])}${fg}${shade.padStart(2)}${reset}`;
  }
  console.log(row);

  if (secondaryScale) {
    console.log('\n  Secondary scale:');
    row = '    ';
    for (const shade of shadeKeys) {
      row += `${bgColor(secondaryScale[shade])}  ${reset}`;
    }
    console.log(row);
    row = '    ';
    for (const shade of shadeKeys) {
      const lum = relativeLuminance(secondaryScale[shade]);
      const fg = lum > 0.18 ? '\x1b[30m' : '\x1b[97m';
      row += `${bgColor(secondaryScale[shade])}${fg}${shade.padStart(2)}${reset}`;
    }
    console.log(row);
  }
  console.log('');
}

// ── Output: WCAG report ──────────────────────────────────────────────────────

function outputWCAG() {
  console.log('── WCAG Contrast (≥ 4.5:1) ─────────────────────────────');
  for (const [pair, { ratio, pass }] of Object.entries(wcag)) {
    const icon = pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const ratioStr = ratio.toFixed(2).padStart(6);
    console.log(`  ${icon} ${pair.padEnd(20)} ${ratioStr}:1`);
  }
  console.log('');
}

// ── Main output ──────────────────────────────────────────────────────────────

if (preview) outputPreview();

if (format === 'css' || format === 'both') {
  outputCSS();
}

if (format === 'json' || format === 'both') {
  if (format === 'both') console.log('');
  outputJSON();
}

outputWCAG();
