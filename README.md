# palette-tokens

Generate UI color palettes from a single primary hex color. Outputs semantic design tokens (bg, surface, border, text, primary, secondary) plus full 11-shade color scales.

Built with [dittotones](https://github.com/nicedoc/dittotones) and [culori](https://culorijs.org/).

## Install

```bash
# Global install (recommended)
npm install -g https://github.com/yulcat/palette-tokens

# Or clone and link
git clone https://github.com/yulcat/palette-tokens
cd palette-tokens && npm install && npm link
```

## Usage

```bash
palette-tokens [hue|hex] [options]
```

Hue (0–360), hex, or no argument (random hue) all accepted.

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
# Basic CSS output (no # needed)
palette-tokens 6366f1

# Dark mode with preview
palette-tokens 10b981 --dark --preview

# Analogous scheme, JSON output
palette-tokens f59e0b --scheme analogous --format json

# Complementary scheme, all outputs
palette-tokens e11d48 --scheme complementary --format both --preview
```

## Use with Claude Code / AI Agents

A `SKILL.md` is available for use with [OpenClaw](https://openclaw.ai) and Claude Code:

```bash
# OpenClaw
npx skills add github:yulcat/palette-tokens

# Claude Code — add to CLAUDE.md or .claude/skills/
curl -o .claude/skills/palette-tokens.md \
  https://raw.githubusercontent.com/yulcat/palette-tokens/master/SKILL.md
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
