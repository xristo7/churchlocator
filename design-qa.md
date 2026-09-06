**Design QA — standardized module directory headers and dark focus state**

- Source visual truth: `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-8c5f6312-f30e-4591-a26e-c21909cfbc5d.png` for the latest focused dark-mode correction; earlier toolbar source retained in comparison history.
- Implementation evidence: in-app browser owner-dashboard Events capture (`owner-dashboard.html#events`) with the search focused and responsive overflow visible.
- Viewport: 1280 × 720 CSS px.
- Source: 1723 × 183 px. Implementation: 1280 × 720 at browser density. Comparison focused on the toolbar region and normalized its available content width.
- State: dark theme, French, focused search field, reduced-width desktop toolbar with overflow control.

**Full-view comparison evidence**

The reference and browser implementation were reviewed as a paired comparison. Both use a deep plum/navy atmospheric hero, uppercase kicker, oversized white heading, supporting copy, right-aligned CTA, separate rounded purple filter tray, and cards below it. The SPA shell around the implementation is intentional product context.

**Focused region comparison evidence**

Review covered hero hierarchy, raster background, CTA position, control sizing, tray radius, card-grid transition, and the equivalent Churches implementation. These are the reusable surfaces shared by all seven modules.

**Required fidelity surfaces**

- Fonts and typography: passed. Display scale, weight, tracking, line height, kicker and body hierarchy follow the reference.
- Spacing and layout: passed. Search, dropdowns and tabs share a 56 px height and 14 px radius in one row. Search expands with available space but never shrinks below 360 px on desktop. Up to three filters remain visible; overflow appears only for additional filters or when the 360 px search floor would otherwise be violated.
- Colors and tokens: passed. Plum hero, violet accent, white type, lavender copy, purple controls, borders and shadows match the target.
- Image quality: passed. No new image was introduced; the implementation reuses the existing Channels hero’s theme-aware ambient blob treatment.
- Copy and content: passed. Each module keeps its icon, title, description, CTA, filters and translations.
- Icons: passed. Existing Lucide UI icons remain aligned and consistent.
- Responsiveness and accessibility: passed. Desktop controls never wrap; excess controls move to an accessible overflow menu. At 700 px and below, only search and a labelled filter button remain, opening a scrollable custom popup while semantic controls remain intact.

**Interactions tested**

- Church search reduced four cards to the matching Toronto result.
- City filter opened above the cards with Calgary, Edmonton and Toronto options; its trigger and reset action remained on the same row.
- Channels native selects rendered as customized dropdowns in the standardized tray, and the open menu cleared the hero edge without clipping.
- The dense Resources toolbar kept three filters visible in one row and exposed the remaining two through its trailing overflow button; nested custom dropdowns remained selectable.
- At 390 CSS px, the search field and right-edge filter button were the only inline controls. The button opened a stable custom popup containing all five filters.
- Changing the primary accent from Sapphire Blue to Royal Amethyst recolored both animated hero blobs and the surrounding module accents immediately.
- Meditation and Livestream search/filter wiring passed automated coverage.
- All seven routes returned HTTP 200; no blocking browser-rendered page error appeared.

**Findings**

- No actionable P0, P1 or P2 differences remain for this request.

**Implementation Checklist**

- [x] Shared hero on Churches, Meditation, Events, Store, Livestream, Resources and Channels.
- [x] Shared search/filter tray directly below every hero.
- [x] Cards/results below the tray.
- [x] Working Meditation and Livestream filters.
- [x] Responsive, reduced-motion, route, syntax and automated checks.

**Comparison History**

- Initial P1: Churches, Events and Livestream used unrelated structures; Meditation lacked search; featured Events preceded filters.
- Fix: reused the existing Channels hero/tray primitives, reordered results and added missing controls.
- Initial P2: Churches displayed an inner rectangular search-input surface.
- Fix: normalized the input inside its rounded field.
- Refinement P2: legacy absolute search-icon positioning caused text overlap, and the Church reset action wrapped unnecessarily.
- Fix: the shared module component now owns icon positioning and direct filter-action sizing; no page-specific layout override was introduced.
- Post-fix: Channels and Churches captures show the same hero/tray/card hierarchy, 50/50 overlap, aligned controls and visible customized dropdown menus without remaining P0/P1/P2 mismatches.
- Responsive P1: the first mobile filter-button placement inside a label caused a delayed second activation that closed the popup.
- Fix: moved the button to the shared toolbar overlay layer, reserved its inline search space, and verified the expanded state remains stable after 500 ms.
- Clarification P1: the first desktop capacity calculation reserved overflow space before checking whether filters fit and inherited a 99 px meditation pill radius.
- Fix: the shared algorithm now tests visible-filter capacity against the 360 px search floor first, limits dense bars to three visible filters, and applies the same 56 px height and 14 px radius to search, selects, tabs and overflow controls.
- Outer-height P1: meditation tab padding was added outside the declared 56 px height because the legacy tab used content-box sizing.
- Fix: all shared search and filter controls now enforce border-box sizing, making their measured outer heights exactly equal in the final browser capture.
- Focus-state P2: the admin search inherited the standalone-input focus ring, producing a second nested outline inside the shared search container.
- Fix: module-search inputs are excluded from standalone dark-input styling; only the outer shared field renders the focus ring. Browser inspection confirmed the input has no shadow while the outer field owns the accent border and focus halo.
- Overflow-icon P3: the compact responsive filter button duplicated disclosure affordances with both sliders and a down chevron.
- Fix: removed the chevron from the shared overflow trigger. Browser inspection confirmed one SVG remains, and the filter popup still opens with `aria-expanded="true"`.

**Follow-up Polish**

- P3: modules without a creation action intentionally keep a wider text column.

---

**Design QA — public search-bar unification**

- Source visual truth: `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-c79e01b8-62a7-424a-99d3-e3d7bb02e951.png`, `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-d9b7558d-3e5d-464b-9006-7ae905afd552.png`, and `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-20f342ca-b54d-4cae-be56-9534674187dc.png`.
- Implementation evidence: browser-rendered public SPA captures for Channels, Events, and Meditation; latest focused captures were inspected in the in-app browser at 1280 × 720 CSS px.
- State: dark theme, desktop public module directories, overflow visible only where the search-width floor requires it.

**Full-view comparison evidence**

The source captures showed three incompatible public filter trays: a pill/reset layout, a compact select layout, and a two-row meditation layout. The revised Channels, Events, and Meditation captures each render the same outer tray, 20 px tray radius, 56 px controls, 14 px inner-control radius, spacing, dark surface, icon alignment, and trailing overflow affordance. The product-specific labels and filters remain intentionally different.

**Focused region comparison evidence**

The search/filter region was checked at the same desktop state on all three routes. Channels and Meditation measured 56 px search/control heights and 14 px inner radii. Events rendered the same one-row layout with three visible filters and the trailing overflow button. Focus, custom dropdown, and overflow behavior retain the shared implementation.

**Required fidelity surfaces**

- Fonts and typography: passed. Shared control type scale, truncation, icon alignment, and active-tab emphasis are consistent.
- Spacing and layout rhythm: passed. One `.site-search-bar` owns 12 px gaps, 12 px tray padding, 20 px tray radius, 56 px control height, 14 px control radius, and the 360 px desktop search floor.
- Colors and visual tokens: passed. The component uses the theme tokens for surface, border, primary selection, focus ring, and dark elevation.
- Image quality and asset fidelity: passed. No image or decorative asset changed.
- Copy and content: passed. Search placeholders and filter labels remain module-specific and translatable.

**Findings**

- Earlier P1: the initial public pass layered `.site-search` on top of legacy toolbar/pill classes, so page-specific CSS still changed the visible tray.
  Fix: every public module now uses only `.site-search-bar` as its outer visual component; the previous public outer toolbar/pill classes were removed. Existing nested classes remain semantic/behavior hooks only.
- No actionable P0, P1, or P2 differences remain for the requested public search-bar uniformity.

**Implementation Checklist**

- [x] Applied `.site-search-bar` to Churches, Meditation, Events, Store, Livestream, Resources, and Channels.
- [x] Centralized desktop, dark mode, focus, custom-dropdown, overflow, and mobile rules in that component.
- [x] Preserved existing filter interactions and responsive overflow.
- [x] Verified browser-rendered Channels, Events, and Meditation states.
- [x] Passed 52 automated tests.

final result: passed

---

**Design QA — public tray geometry and overlay correction**

- Source visual truth: `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-1e3070a9-917a-4dfa-98ba-68f76a8d7ca7.png` and `C:\Users\ADMINI~1\AppData\Local\Temp\codex-clipboard-26fabd0e-ce87-4784-b01f-dc9cffd369cc.png`.
- Implementation evidence: browser-rendered `churches.html?embed=1` and SPA directory captures at 1280 × 720 CSS px.
- State: dark theme, desktop filter row; compact overflow menu open over cards.

**Comparison history**

- Earlier P1: Church inherited the legacy inner search-input surface, fixed narrow controls truncated “Denomination,” Reset remained in the visible row, and dropdowns could visually fall below page content.
- Fix: the shared tray now owns the Church icon/input geometry, uses 178 px full-label filter controls, moves Reset into the sliders menu, fixes the overflow button to a 56 px square, and creates an isolated stacking layer for all popups.
- Post-fix evidence: the full-width Church capture measured a 56 px search field, two 178 px full-label controls, and a 56 px sliders-only button in one row. The open overflow panel had `z-index: 1000`, rendered over the cards, and retained Reset and the concealed filter.

**Required fidelity surfaces**

- Fonts and typography: passed; labels no longer truncate at desktop widths.
- Spacing and layout rhythm: passed; all visible controls use the same 56 px height, 14 px radius, and shared tray gap/padding.
- Colors and visual tokens: passed; dynamic theme tokens continue to control dark surfaces and accents.
- Image quality: passed; no imagery changed.
- Copy and content: passed; labels and filters remain specific to each module and translatable.

**Findings**

- No actionable P0, P1, or P2 differences remain.

**Implementation Checklist**

- [x] Removed the Church inner search border.
- [x] Prevented desktop filter-label truncation.
- [x] Moved Reset from the visible row into the compact overflow menu.
- [x] Raised custom dropdown and overflow popup layers above cards.
- [x] Passed 52 automated tests.

final result: passed

final result: passed
