# Livestream card design QA

- Source: the user-provided landscape image card with a rounded white frame, full-card photo, upper-left copy, and lower-left pill action.
- Prototype: the active livestream directory rendered in the member shell at 1280 × 800.
- Content behavior: each card uses the video thumbnail when a YouTube ID is available, falls back to the creator image, and opens its dedicated broadcast page.

## Comparison

- Frame and silhouette: matched with a 16:9 landscape card, 26px radius, and 3px light border.
- Image treatment: matched with a full-bleed cover image and dark left-to-right readability layer.
- Hierarchy: matched with title and description at the upper left.
- Action: adapted as requested to a white Play pill at the lower left; no price appears.
- Responsive behavior: cards retain the visual hierarchy at mobile widths and remove the fixed aspect ratio when extra vertical room is needed.
- Interaction: hover, keyboard focus, and card navigation are present.

Remaining P3: source imagery naturally varies by broadcast thumbnail, so focal composition differs from the static reference.

final result: passed
