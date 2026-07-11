# Design — Personal Agent

A locked design system for this app. New and redesigned screens read this file first and share one visual language.

## Genre

Modern-minimal, with an austere iOS-like application voice. The interface is a calm secretary: it tells the user what matters now and keeps actions close to the work.

## Macrostructure family

- App pages: **Workbench** — compact identity header, one active workspace, persistent task navigation.
- Content pages: **Long Document** — reserved for reports and long AI output.
- Marketing pages: not currently in scope.

## Theme

- Paper: `oklch(97.5% 0.003 265)` light / `oklch(14% 0.012 285)` dark.
- Ink: `oklch(17% 0.012 285)` light / `oklch(95% 0.008 285)` dark.
- Accent: `oklch(52% 0.18 285)` indigo. Use only for the active destination, primary actions, and focus.
- Semantic red, green, and amber communicate error, completion, and due-soon state; they are never the main palette.

## Typography

- One native sans system for the wordmark, headings, body, controls, and data.
- Weights: 400 body, 500 controls, 600 labels, 700 headings. Never 800 or 900.
- Type scale: 13 / 15 / 17 / 20 / 22 / 28 / 32. Product UI uses fixed sizes, not fluid display type.

## Spacing and shape

- Four-point named scale from `--space-3xs` through `--space-4xl`.
- Cards: 16px radius, one hairline border, whisper shadow maximum.
- Controls: 12px radius, 44px minimum touch target.
- Navigation: quiet segmented bar on desktop; safe-area-aware bottom bar on mobile.

## Motion

- State changes use `--ease-out`, `--ease-in`, and `--ease-in-out` only.
- Motion is limited to button press, tab crossfade, sheet presentation, and functional loading.
- Reduced motion collapses spatial movement to a 150ms opacity change.

## Microinteractions stance

- Silent success when the result is visible.
- Errors and hidden async outcomes use non-blocking toasts.
- Focus appears instantly; hover never owns unique functionality.
- Reversible destructive actions should use optimistic update plus Undo.

## CTA voice

- Primary: restrained indigo fill, one-line verb label.
- Secondary: card-coloured surface with a visible hairline border.
- Icon-only actions always have an accessible name and tooltip/title.

## Per-page allowances

- App pages do not use decorative enrichment, gradient blobs, dot-grid paper, rotated stickers, or fake device chrome.
- Category colours appear only as small dots and chips.
- Today may show one completion ring; Habits may show streaks. No currency or points surfaces.

## What pages must share

- Personal Agent wordmark, indigo accent, type stacks, card/control shapes, focus treatment, and light/dark modes.
- The five destinations: Today, Plan, Tasks, Habits, Projects.
- One conversational AI surface.

## What pages may differ on

- Information density and list/grid choice required by the task.
- Small semantic colour markers.
- Page-local view controls rendered with the shared segmented control.

## Exports

### tokens.css

The canonical implementation is [`tokens.css`](tokens.css). It contains the complete light/dark palette, type, space, radius, motion, shadow, and z-index tokens.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(97.5% 0.003 265);
  --color-paper-2: oklch(95% 0.004 265);
  --color-card: oklch(99.5% 0.001 265);
  --color-rule: oklch(88% 0.005 265);
  --color-muted: oklch(49% 0.012 265);
  --color-ink: oklch(17% 0.008 265);
  --color-accent: oklch(52% 0.18 285);
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", ui-sans-serif, system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", ui-sans-serif, system-ui, sans-serif;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --radius-card: 1rem;
  --radius-input: 0.75rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97.5% 0.003 265)", "$type": "color" },
    "card": { "$value": "oklch(99.5% 0.001 265)", "$type": "color" },
    "ink": { "$value": "oklch(17% 0.008 265)", "$type": "color" },
    "accent": { "$value": "oklch(52% 0.18 285)", "$type": "color" },
    "focus": { "$value": "oklch(60% 0.2 280)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "-apple-system, BlinkMacSystemFont, SF Pro Display, SF Pro Text, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "-apple-system, BlinkMacSystemFont, SF Pro Text, SF Pro Display, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 97.5% 0.008 285;
  --foreground: 17% 0.012 285;
  --card: 99.3% 0.004 285;
  --card-foreground: 17% 0.012 285;
  --primary: 52% 0.18 285;
  --primary-foreground: 98% 0.008 285;
  --muted: 94.5% 0.01 285;
  --muted-foreground: 49% 0.018 285;
  --border: 88% 0.012 285;
  --input: 88% 0.012 285;
  --ring: 60% 0.2 280;
  --radius: 1rem;
}
```
