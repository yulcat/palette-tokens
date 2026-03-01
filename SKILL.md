---
name: palette-tokens
description: >-
  Generate a complete UI color palette (design tokens) from a single primary color.
  Uses the dittoTones algorithm with Tailwind v4's proven L/C curves (non-linear
  Lightness + Gaussian Chroma in OKLCH). Use when: (1) creating a color system for
  a new app/website, (2) generating CSS custom properties or design tokens from a
  brand color, (3) asked to pick/suggest UI colors, theme colors, or a palette,
  (4) building any frontend with consistent color roles (bg, surface, text, primary, etc.).
  Triggers: color palette, design tokens, theme, color scheme, UI colors, brand colors.
---

# Palette Tokens

Generate a full UI color palette from one primary hex color using the `palette-tokens` CLI (dittoTones + Tailwind v4 color DNA).

**Always run the CLI — do not compute colors manually.**

## Setup

```bash
npm install -g https://github.com/yulcat/palette-tokens
```

After install, `palette-tokens` is available globally.

## Usage

```bash
palette-tokens [hue|hex] [options]
```

| Argument | Description |
|----------|-------------|
| (none) | Random hue |
| `240` | Hue value (0–360) |
| `6366f1` | Hex color |

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--hue <value>` | 0–360 | — | Hue value (alternative to positional arg) |
| `--scheme` | `single` `analogous` `complementary` | `single` | Color scheme type |
| `--dark` | flag | off | Output dark mode tokens |
| `--format` | `css` `json` `both` | `css` | Output format |
| `--preview` | flag | off | Terminal color preview |

### Examples

```bash
# Random palette
palette-tokens

# Specify by hue
palette-tokens 240
palette-tokens --hue 120 --scheme analogous --preview

# Specify by hex
palette-tokens 6366f1

# Dark mode + JSON
palette-tokens 240 --dark --format json
```

## Workflow

1. Run CLI with the requested color (no `#` needed)
2. Paste output directly into the codebase
3. For dark mode, run again with `--dark`

## Output Roles (Light Mode)

| Token | Role |
|-------|------|
| `--color-bg` | Page background |
| `--color-surface` | Card / panel background |
| `--color-border` | Borders, dividers |
| `--color-text-muted` | Secondary text, captions |
| `--color-text` | Primary body text |
| `--color-primary` | Buttons, links, accents |
| `--color-secondary` | Tags, highlights, subtle accents |
| `--color-50` ~ `--color-950` | Full 11-step color scale |
| `--neutral-50` ~ `--neutral-950` | Tinted gray scale |
