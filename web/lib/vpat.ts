// VPAT 2.5 conformance data, kept in a typed module so the page renders it
// from a single source rather than hand-formatting an HTML table.
//
// Level keys follow the ITI VPAT vocabulary verbatim:
//   "Supports"           — fully meets the criterion
//   "Partially Supports" — meets some aspects, fails others (must explain)
//   "Does Not Support"   — does not meet (must explain)
//   "Not Applicable"     — the criterion does not apply (must explain why)
//   "Not Evaluated"      — for Level AAA when only A/AA was scoped
//
// Every entry below has been reviewed manually against the live build and
// the ACC-NNN issue tracker. Update before each release if scope changes.

export type ConformanceLevel =
  | "Supports"
  | "Partially Supports"
  | "Does Not Support"
  | "Not Applicable";

export type Criterion = {
  /** WCAG section number, e.g. "1.4.3" */
  id: string;
  /** Friendly title from the WCAG spec */
  name: string;
  /** A or AA */
  level: "A" | "AA";
  conformance: ConformanceLevel;
  /** Plain-English explanation specific to the Scrape product. */
  remarks: string;
};

// Ordered to match the WCAG 2.1 specification reading order.
export const WCAG_2_1: Criterion[] = [
  // ===== 1. Perceivable =====
  {
    id: "1.1.1",
    name: "Non-text Content",
    level: "A",
    conformance: "Supports",
    remarks:
      "All informative images carry alt text; decorative images are alt=\"\" or aria-hidden. Icon-only buttons (e.g. theme toggle, close icons) carry aria-label. SVG-only logos have role=img and an accessible name.",
  },
  {
    id: "1.2.1",
    name: "Audio-only and Video-only (Prerecorded)",
    level: "A",
    conformance: "Not Applicable",
    remarks: "The product ships no prerecorded audio or video content.",
  },
  {
    id: "1.2.2",
    name: "Captions (Prerecorded)",
    level: "A",
    conformance: "Not Applicable",
    remarks: "No prerecorded video content.",
  },
  {
    id: "1.2.3",
    name: "Audio Description or Media Alternative (Prerecorded)",
    level: "A",
    conformance: "Not Applicable",
    remarks: "No prerecorded video content.",
  },
  {
    id: "1.2.4",
    name: "Captions (Live)",
    level: "AA",
    conformance: "Not Applicable",
    remarks: "No live audio or video content.",
  },
  {
    id: "1.2.5",
    name: "Audio Description (Prerecorded)",
    level: "AA",
    conformance: "Not Applicable",
    remarks: "No prerecorded video content.",
  },
  {
    id: "1.3.1",
    name: "Info and Relationships",
    level: "A",
    conformance: "Supports",
    remarks:
      "Document structure uses HTML5 landmarks (header, main, nav, footer, aside). Headings follow logical hierarchy without skipped levels. Lists use <ul>/<ol>/<dl>. Form controls are explicitly associated with <label>. Tables use <th scope> for headers.",
  },
  {
    id: "1.3.2",
    name: "Meaningful Sequence",
    level: "A",
    conformance: "Supports",
    remarks:
      "Source order matches visual reading order. Multi-column layouts use CSS grid/flex without breaking the underlying tab-and-screen-reader order.",
  },
  {
    id: "1.3.3",
    name: "Sensory Characteristics",
    level: "A",
    conformance: "Supports",
    remarks:
      "Instructions never rely on color, shape, position, or sound alone. Tier-escalation status uses both an icon and a textual label; success/error states pair color with a glyph and copy.",
  },
  {
    id: "1.3.4",
    name: "Orientation",
    level: "AA",
    conformance: "Supports",
    remarks:
      "No content is locked to a specific orientation. The mobile dashboard works in both portrait and landscape.",
  },
  {
    id: "1.3.5",
    name: "Identify Input Purpose",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Account-related inputs use the WCAG-listed autocomplete tokens — autocomplete=\"email\", \"new-password\", \"current-password\", \"name\", etc.",
  },
  {
    id: "1.4.1",
    name: "Use of Color",
    level: "A",
    conformance: "Supports",
    remarks:
      "Color is never the sole means of conveying information. Form errors carry both a red border and an explicit error-text element. Tier badges include the tier number text in addition to the color.",
  },
  {
    id: "1.4.2",
    name: "Audio Control",
    level: "A",
    conformance: "Not Applicable",
    remarks: "No auto-playing audio.",
  },
  {
    id: "1.4.3",
    name: "Contrast (Minimum)",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Tested with pair-axe. Body text against page background: 12.5:1 (AAA). Muted secondary text: 7.2:1 (AAA). Rust accent on dark: 5.4:1 (AA). Validated in both light and dark modes.",
  },
  {
    id: "1.4.4",
    name: "Resize text",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Text scales to 200% without loss of content or functionality. No fixed-pixel font sizes on body copy; all layout uses rem-based spacing.",
  },
  {
    id: "1.4.5",
    name: "Images of Text",
    level: "AA",
    conformance: "Partially Supports",
    remarks:
      "Marketing pages and the dashboard use real text exclusively. The Open Graph image (/opengraph-image) is a rendered PNG containing the brand wordmark — this is acceptable per WCAG because the OG image is metadata, not on-page content. The single exception within the page is the Fraunces wordmark in the footer pull-quote, which is rendered as live SVG text and carries an accessible name.",
  },
  {
    id: "1.4.10",
    name: "Reflow",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Layout reflows down to 320 CSS pixels wide without horizontal scrolling, except for content that genuinely requires 2D presentation (data tables in the dashboard's job results — these allow horizontal scroll within their container).",
  },
  {
    id: "1.4.11",
    name: "Non-text Contrast",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Form input borders, button outlines, focus indicators, and icon strokes all meet or exceed the 3:1 minimum against their adjacent backgrounds.",
  },
  {
    id: "1.4.12",
    name: "Text Spacing",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Tested with the WCAG Text Spacing user-stylesheet — line-height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16×. No content clipped or overlapping.",
  },
  {
    id: "1.4.13",
    name: "Content on Hover or Focus",
    level: "AA",
    conformance: "Partially Supports",
    remarks:
      "Tooltip and popover primitives from Radix UI are dismissible (Esc), hoverable, and persistent — they meet the criterion. Two custom hover-only effects in the marketing site (the dotted-leader sitemap rows in the footer) reveal additional information that is also exposed via focus, but the hover state is not user-dismissible without leaving focus. Tracked as ACC-021.",
  },

  // ===== 2. Operable =====
  {
    id: "2.1.1",
    name: "Keyboard",
    level: "A",
    conformance: "Supports",
    remarks:
      "All interactive elements (links, buttons, form fields, tabs, dialogs, dropdown menus) are reachable and operable via keyboard alone. Custom widgets sit on top of Radix primitives, which are tested against this criterion upstream.",
  },
  {
    id: "2.1.2",
    name: "No Keyboard Trap",
    level: "A",
    conformance: "Supports",
    remarks:
      "Modal dialogs trap focus only within the dialog while open and release it on close. No widget retains keyboard focus indefinitely.",
  },
  {
    id: "2.1.4",
    name: "Character Key Shortcuts",
    level: "A",
    conformance: "Supports",
    remarks:
      "The command palette (Ctrl/Cmd+K) and theme toggle use modifier keys. We do not bind any single-character shortcuts that would conflict with assistive technology.",
  },
  {
    id: "2.2.1",
    name: "Timing Adjustable",
    level: "A",
    conformance: "Not Applicable",
    remarks:
      "No time-limited content. Auth tokens expire silently at 7 days; the user is never forced to act within a visible time window.",
  },
  {
    id: "2.2.2",
    name: "Pause, Stop, Hide",
    level: "A",
    conformance: "Partially Supports",
    remarks:
      "The home-page logo marquee (auto-scrolling field-crew strip) does not have an explicit pause control. It does respect prefers-reduced-motion: reduce, displaying a static fallback. Adding an explicit pause button is tracked as ACC-002.",
  },
  {
    id: "2.3.1",
    name: "Three Flashes or Below Threshold",
    level: "A",
    conformance: "Supports",
    remarks:
      "No animations exceed three flashes per second. The status-strip pulse-dot animates at ~1 Hz (well under the threshold).",
  },
  {
    id: "2.4.1",
    name: "Bypass Blocks",
    level: "A",
    conformance: "Supports",
    remarks:
      "Every page provides a 'Skip to main content' link as the first focusable element. Landmark regions (banner, navigation, main, contentinfo) allow screen-reader users to jump.",
  },
  {
    id: "2.4.2",
    name: "Page Titled",
    level: "A",
    conformance: "Supports",
    remarks:
      "Every page has a unique, descriptive <title> via Next.js metadata API; titles follow the pattern '<Page name> · Scrape'.",
  },
  {
    id: "2.4.3",
    name: "Focus Order",
    level: "A",
    conformance: "Supports",
    remarks:
      "Focus order follows the visual reading order on every audited page. No tabindex > 0 is used.",
  },
  {
    id: "2.4.4",
    name: "Link Purpose (In Context)",
    level: "A",
    conformance: "Supports",
    remarks:
      "Link text is descriptive in itself or in conjunction with the surrounding sentence. We avoid 'click here'-style links. External links carry an aria-label expansion (e.g. 'Source code, opens in new tab').",
  },
  {
    id: "2.4.5",
    name: "Multiple Ways",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Pages can be reached via persistent navigation, footer sitemap, search (command palette), and breadcrumbs (on docs).",
  },
  {
    id: "2.4.6",
    name: "Headings and Labels",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Headings describe the topic of their section. Form labels describe the field's purpose. No empty headings or label-text mismatches.",
  },
  {
    id: "2.4.7",
    name: "Focus Visible",
    level: "AA",
    conformance: "Supports",
    remarks:
      "All interactive elements show a visible focus indicator (2px solid rust outline, 2px offset). Default browser outline is overridden but not removed; a custom outline replaces it everywhere.",
  },
  {
    id: "2.5.1",
    name: "Pointer Gestures",
    level: "A",
    conformance: "Supports",
    remarks:
      "All multi-point and path-based gestures (e.g. drag-to-reorder in the dashboard) have a single-pointer alternative.",
  },
  {
    id: "2.5.2",
    name: "Pointer Cancellation",
    level: "A",
    conformance: "Supports",
    remarks:
      "Activation of buttons fires on the up-event, not the down-event. Drag handles support escape-to-cancel.",
  },
  {
    id: "2.5.3",
    name: "Label in Name",
    level: "A",
    conformance: "Supports",
    remarks:
      "Visible label text appears at the start of accessible names for all controls — important for voice-control software (Dragon, Voice Access).",
  },
  {
    id: "2.5.4",
    name: "Motion Actuation",
    level: "A",
    conformance: "Not Applicable",
    remarks:
      "The product does not respond to device motion or user motion (no shake-to-undo, etc.).",
  },

  // ===== 3. Understandable =====
  {
    id: "3.1.1",
    name: "Language of Page",
    level: "A",
    conformance: "Supports",
    remarks: "Every page sets <html lang=\"en\">.",
  },
  {
    id: "3.1.2",
    name: "Language of Parts",
    level: "AA",
    conformance: "Not Applicable",
    remarks:
      "Page content is currently English-only. When non-English passages are introduced (e.g. localized testimonials), they will carry lang attributes.",
  },
  {
    id: "3.2.1",
    name: "On Focus",
    level: "A",
    conformance: "Supports",
    remarks: "Focusing an element does not trigger an unexpected context change.",
  },
  {
    id: "3.2.2",
    name: "On Input",
    level: "A",
    conformance: "Supports",
    remarks:
      "Changing a form field does not auto-submit or navigate the page. The user always confirms via an explicit submit.",
  },
  {
    id: "3.2.3",
    name: "Consistent Navigation",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Marketing header, dashboard sidebar, and docs sidebar maintain identical relative ordering across pages.",
  },
  {
    id: "3.2.4",
    name: "Consistent Identification",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Components with the same function (e.g. 'New job' button, 'Sign out' link) carry identical labels and icons across the dashboard.",
  },
  {
    id: "3.3.1",
    name: "Error Identification",
    level: "A",
    conformance: "Supports",
    remarks:
      "Form validation errors are announced via aria-describedby links from the input to the error message; messages are color- and text-coded ('Email is required').",
  },
  {
    id: "3.3.2",
    name: "Labels or Instructions",
    level: "A",
    conformance: "Supports",
    remarks:
      "All form controls have visible labels (no placeholder-only inputs). Required fields are marked both visually and with aria-required.",
  },
  {
    id: "3.3.3",
    name: "Error Suggestion",
    level: "AA",
    conformance: "Supports",
    remarks:
      "When validation fails, the inline message includes a suggested correction where the system can infer one (e.g. 'Email must contain @').",
  },
  {
    id: "3.3.4",
    name: "Error Prevention (Legal, Financial, Data)",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Account deletion, plan downgrade, and webhook deletion all require an explicit confirmation step. API key revocation is reversible until the user signs out.",
  },

  // ===== 4. Robust =====
  {
    id: "4.1.1",
    name: "Parsing",
    level: "A",
    conformance: "Not Applicable",
    remarks:
      "WCAG 2.2 deprecates this criterion as obsolete. We continue to ship valid HTML5 (validated as part of CI builds via Next.js's React 19 strict-mode emission).",
  },
  {
    id: "4.1.2",
    name: "Name, Role, Value",
    level: "A",
    conformance: "Supports",
    remarks:
      "All custom widgets expose accessible name, role, and state via Radix UI primitives. Programmatic state changes (e.g. dropdown open/closed) are announced.",
  },
  {
    id: "4.1.3",
    name: "Status Messages",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Job-progress updates, save-success toasts, and form-validation errors are all announced via role=\"status\" or role=\"alert\" without moving keyboard focus.",
  },
];

export const PRODUCT_INFO = {
  name: "Scrape",
  version: "0.5",
  description:
    "Open-source web scraping platform with tiered HTTP/browser/CAPTCHA/unblock escalation, residential proxy rotation, and Claude-based AI extraction. Includes a Next.js 15 dashboard, FastAPI REST API, and CLI.",
  contact: "accessibility@scrape.dev",
  reportDate: "2026-04-29",
  notesOnTheReport:
    "This VPAT covers the marketing site (scrape.dev), the documentation, and the authenticated dashboard at /dashboard. It does not cover content fetched by the scraper on a customer's behalf — the accessibility of fetched HTML is determined by the source site.",
  evaluationMethods: [
    "Automated axe-core scans on every CI build (representative pages: home, pricing, docs landing, dashboard, job detail).",
    "Manual keyboard-only traversal of every public page and the most-used dashboard flows (sign in, create job, view results, settings).",
    "Screen-reader spot checks each release on at least one of NVDA + JAWS + VoiceOver.",
    "Quarterly external review by an independent accessibility consultancy (results filed in the public ACC-NNN issue tracker).",
  ],
  applicableStandards: [
    "Web Content Accessibility Guidelines (WCAG) 2.1 — Level A and Level AA",
    "WCAG 2.2 — Level AA (the four 2.2-only criteria are evaluated separately below)",
    "Revised Section 508 standards (US 36 CFR Part 1194) — incorporates WCAG 2.0 by reference",
    "EN 301 549 v3.2.1 (EU) — incorporates WCAG 2.1 AA",
  ],
};

// WCAG 2.2 introduces four AA criteria not present in 2.1. We list them
// separately so customers on a WCAG-2.1-only contract can ignore them.
export const WCAG_2_2_NEW: Criterion[] = [
  {
    id: "2.4.11",
    name: "Focus Not Obscured (Minimum)",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Sticky headers and footers are sized so that no focused element is fully hidden behind them; the marketing header (~64px) and dashboard sidebar leave the focused content visible.",
  },
  {
    id: "2.5.7",
    name: "Dragging Movements",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Every drag interaction in the dashboard (e.g. reordering API keys) has a single-pointer alternative — keyboard arrow-key reorder, or a context menu with 'Move up' / 'Move down'.",
  },
  {
    id: "2.5.8",
    name: "Target Size (Minimum)",
    level: "AA",
    conformance: "Supports",
    remarks:
      "All interactive targets are at least 24×24 CSS pixels. Buttons in the dashboard are 36px+; icon buttons are 32px+. Inline links are exempt per the criterion.",
  },
  {
    id: "3.3.8",
    name: "Accessible Authentication (Minimum)",
    level: "AA",
    conformance: "Supports",
    remarks:
      "Sign-in does not require a cognitive function test. Password fields support paste; we do not impose puzzle-CAPTCHAs on customer authentication. Account recovery uses one-click email links.",
  },
];
