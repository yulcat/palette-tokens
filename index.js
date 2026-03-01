#!/usr/bin/env node

import { formatHex } from 'culori';
import {
  hueToHex, generatePalette,
  SHADE_KEYS, LIGHT_ROLES, DARK_ROLES,
  contrastRatio,
} from './lib/core.js';

// ── Arg parsing ───────────────────────────────────────────────────────────────

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

let primaryHex;
let resolvedHue;

const positional = args[0] ? String(args[0]).replace(/^['"]|['"]$/g, '') : null;

if (hueOpt !== null) {
  resolvedHue = parseFloat(hueOpt) % 360;
  primaryHex = hueToHex(resolvedHue);
} else if (positional !== null && /^\d+(\.\d+)?$/.test(positional)) {
  resolvedHue = parseFloat(positional) % 360;
  primaryHex = hueToHex(resolvedHue);
} else if (positional !== null && /^#?[0-9a-fA-F]{6}$/.test(positional)) {
  primaryHex = positional.startsWith('#') ? positional : `#${positional}`;
} else if (positional !== null) {
  console.error(`Error: Invalid input "${positional}". Use a hue (0–360) or hex color.`);
  process.exit(1);
} else {
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

// ── Generate ──────────────────────────────────────────────────────────────────

const { tokens, colorScale, neutralScale, secondaryScale, wcag } =
  generatePalette(primaryHex, { scheme, dark });

// ── Output: CSS ───────────────────────────────────────────────────────────────

function outputCSS() {
  const lines = [':root {'];
  for (const [role, hex] of Object.entries(tokens)) {
    lines.push(`  --color-${role}: ${hex};`);
  }
  lines.push('');
  lines.push('  /* Color scale */');
  for (const shade of SHADE_KEYS) lines.push(`  --color-${shade}: ${colorScale[shade]};`);
  lines.push('');
  lines.push('  /* Neutral scale */');
  for (const shade of SHADE_KEYS) lines.push(`  --neutral-${shade}: ${neutralScale[shade]};`);
  if (secondaryScale) {
    lines.push('');
    lines.push('  /* Secondary scale */');
    for (const shade of SHADE_KEYS) lines.push(`  --secondary-${shade}: ${secondaryScale[shade]};`);
  }
  lines.push('}');
  console.log(lines.join('\n'));
}

// ── Output: JSON ──────────────────────────────────────────────────────────────

function outputJSON() {
  const scales = { color: colorScale, neutral: neutralScale };
  if (secondaryScale) scales.secondary = secondaryScale;
  console.log(JSON.stringify({
    mode: dark ? 'dark' : 'light',
    scheme,
    input: primaryHex,
    ...(resolvedHue != null && { hue: resolvedHue }),
    tokens,
    scales,
    wcag,
  }, null, 2));
}

// ── Output: Preview ───────────────────────────────────────────────────────────

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
const bgAnsi = (hex) => { const [r,g,b] = hexToRgb(hex); return `\x1b[48;2;${r};${g};${b}m`; };
const fgAnsi = (hex) => { const [r,g,b] = hexToRgb(hex); return `\x1b[38;2;${r};${g};${b}m`; };
const reset = '\x1b[0m';

function relativeLuminanceSimple(hex) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const t = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4;
  return 0.2126*t(r) + 0.7152*t(g) + 0.0722*t(b);
}

function outputPreview() {
  const inputLabel = resolvedHue != null ? `hue ${resolvedHue} → ${primaryHex}` : primaryHex;
  console.log('\n── Palette Preview ─────────────────────────────────────');
  console.log(`   Mode: ${dark ? 'dark' : 'light'}  |  Scheme: ${scheme}  |  Input: ${inputLabel}\n`);

  console.log('  Tokens:');
  const maxLen = Math.max(...Object.keys(tokens).map(k => k.length));
  for (const [role, hex] of Object.entries(tokens)) {
    const textHex = relativeLuminanceSimple(hex) > 0.18 ? '#000000' : '#ffffff';
    const swatch = `${bgAnsi(hex)}${fgAnsi(textHex)} ${hex} ${reset}`;
    console.log(`    ${role.padEnd(maxLen + 1)} ${bgAnsi(hex)}      ${reset} ${swatch}`);
  }

  for (const [label, scale] of [['Color', colorScale], ['Neutral', neutralScale], ...(secondaryScale ? [['Secondary', secondaryScale]] : [])]) {
    console.log(`\n  ${label} scale:`);
    let row = '    ';
    for (const shade of SHADE_KEYS) {
      const lum = relativeLuminanceSimple(scale[shade]);
      const fg = lum > 0.18 ? '\x1b[30m' : '\x1b[97m';
      row += `${bgAnsi(scale[shade])}${fg}${shade.padStart(2)}${reset}`;
    }
    console.log(row);
  }
  console.log('');
}

// ── Output: WCAG ──────────────────────────────────────────────────────────────

function outputWCAG() {
  console.log('── WCAG Contrast (≥ 4.5:1) ─────────────────────────────');
  for (const [pair, { ratio, pass }] of Object.entries(wcag)) {
    const icon = pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${icon} ${pair.padEnd(20)} ${ratio.toFixed(2).padStart(6)}:1`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (preview) outputPreview();
if (format === 'css' || format === 'both') outputCSS();
if (format === 'json' || format === 'both') { if (format === 'both') console.log(''); outputJSON(); }
outputWCAG();
