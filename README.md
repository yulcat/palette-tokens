# palette-tokens

Generate UI color palettes from a single primary hex color. Outputs semantic design tokens (bg, surface, border, text, primary, secondary) plus full 11-shade color scales.

Built with [dittotones](https://github.com/nicedoc/dittotones) and [culori](https://culorijs.org/).

## Install

```bash
npm install
npm link   # optional, to use as global CLI
```

## Usage

```bash
palette-tokens <hex> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--scheme <type>` | `single`, `analogous`, or `complementary` | `single` |
| `--dark` | Output dark mode tokens | light mode |
| `--format <fmt>` | `css`, `json`, or `both` | `css` |
| `--preview` | Show colored terminal preview | off |
| `--help` | Show help message | |

### Examples

```bash
# Basic CSS output
palette-tokens "#6366f1"

# Dark mode with preview
palette-tokens "#10b981" --dark --preview

# Analogous scheme, JSON output
palette-tokens "#f59e0b" --scheme analogous --format json

# Complementary scheme, all outputs
palette-tokens "#e11d48" --scheme complementary --format both --preview
```

### Output

**CSS** — Custom properties ready for your stylesheet:

```css
:root {
  --color-bg: #f7f9ff;
  --color-surface: #f2f4ff;
  --color-border: #e2e4f3;
  --color-text-muted: #797b88;
  --color-text: #151620;
  --color-primary: #6366f1;
  --color-secondary: #cdd5fd;

  /* Color scale (50–950) */
  /* Neutral scale (50–950) */
}
```

**JSON** — Structured data with tokens, full scales, and WCAG contrast ratios:

```json
{
  "mode": "light",
  "scheme": "single",
  "input": "#6366f1",
  "tokens": { "bg": "#f7f9ff", "...": "..." },
  "scales": {
    "color": { "50": "#f1f3ff", "...": "..." },
    "neutral": { "50": "#f7f9ff", "...": "..." }
  },
  "wcag": {
    "text/bg": { "ratio": 17.09, "pass": true },
    "...": "..."
  }
}
```

**Preview** — ANSI-colored terminal output showing token swatches and full scales.

## WCAG Contrast

Automatically checks these foreground/background pairs against the 4.5:1 AA threshold:

- text / bg
- text / surface
- text-muted / bg
- text-muted / surface
- primary / bg
- primary / surface

## License

ISC
