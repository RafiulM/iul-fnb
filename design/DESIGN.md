---
version: alpha.2
name: Sunlit Ledger
description: A warm productivity and operations foundation with cream working fields, serif editorial moments, black pill actions, and orange activity signals.
colors:
  primary: "#000000"
  primary-hover: "#4F4F4F"
  primary-active: "#1D1E1C"
  on-primary: "#FFFFFF"
  accent: "#FA5D00"
  accent-soft: "#FA5D001A"
  on-accent: "#1D1E1C"
  canvas: "#FBF5F0"
  canvas-warm: "#FFF8F1"
  surface: "#FFFFFF"
  surface-muted: "#F3EBE4"
  surface-subtle: "#F8F5F1"
  text: "#1D1E1C"
  text-soft: "#2C222D"
  text-muted: "#6A696A"
  text-faint: "#858585"
  border: "#1D1E1C1A"
  border-strong: "#999999"
  focus-ring: "#FA5D00"
  positive: "#23A40C"
  warning: "#F18D2A"
  danger: "#CB5C5B"
  accent-text: "#C1490B"
  warning-text: "#A95D05"
typography:
  display:
    fontFamily: '"IBM Plex Serif", ui-serif, Georgia, serif'
    fontSize: 70px
    fontWeight: 400
    lineHeight: 77px
    letterSpacing: -2.8px
  heading-lg:
    fontFamily: '"IBM Plex Serif", ui-serif, Georgia, serif'
    fontSize: 50px
    fontWeight: 400
    lineHeight: 55px
    letterSpacing: -2px
  heading-md:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 30px
    fontWeight: 400
    lineHeight: 36px
    letterSpacing: -0.9px
  heading-sm:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 22px
    fontWeight: 500
    lineHeight: 26.4px
    letterSpacing: -0.66px
  body-lg:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 19px
    fontWeight: 400
    lineHeight: 26.6px
    letterSpacing: -0.57px
  body-md:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: -0.32px
  body-sm:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
    letterSpacing: -0.14px
  label-md:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 17px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: -0.17px
  label-sm:
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0px
spacing:
  space-4: 4px
  space-8: 8px
  space-12: 12px
  space-16: 16px
  space-20: 20px
  space-24: 24px
  space-32: 32px
  space-40: 40px
  space-64: 64px
  space-80: 80px
rounded:
  compact: 10px
  image: 16px
  card: 20px
  control: 30px
  pill: 9999px
components:
  page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    borderColor: "{colors.primary}"
    borderWidth: 1px
    typography: "{typography.label-md}"
    rounded: "{rounded.control}"
    padding: "{spacing.space-12} {spacing.space-24}"
  secondary-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    borderWidth: 1px
    typography: "{typography.label-md}"
    rounded: "{rounded.control}"
    padding: "{spacing.space-12} {spacing.space-24}"
  text-link:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    typography: "{typography.body-md}"
  email-capture:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    typography: "{typography.body-lg}"
    rounded: "{rounded.control}"
    padding: "{spacing.space-8}"
  product-proof-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.card}"
    padding: "{spacing.space-24}"
  work-ledger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.card}"
    padding: "{spacing.space-8}"
  ledger-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-soft}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    typography: "{typography.body-sm}"
    rounded: "{rounded.compact}"
    padding: "{spacing.space-12} {spacing.space-16}"
  activity-block:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    borderColor: "{colors.accent}"
    borderWidth: 1px
    typography: "{typography.body-sm}"
    rounded: "{rounded.compact}"
    padding: "{spacing.space-8} {spacing.space-12}"
  metric-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.card}"
    padding: "{spacing.space-20}"
  testimonial-card:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-soft}"
    borderColor: "{colors.surface-muted}"
    borderWidth: 1px
    rounded: "{rounded.card}"
    padding: "{spacing.space-24}"
  navigation-frame:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.control}"
    padding: "{spacing.space-12} {spacing.space-24}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border-strong}"
    borderWidth: 1px
    typography: "{typography.body-md}"
    rounded: "{rounded.image}"
    padding: "{spacing.space-12} {spacing.space-16}"
  status-chip:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-soft}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    typography: "{typography.label-sm}"
    rounded: "{rounded.pill}"
    padding: "{spacing.space-4} {spacing.space-8}"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    borderColor: "{colors.border}"
    borderWidth: 1px
    rounded: "{rounded.pill}"
    padding: "{spacing.space-8}"
  alert-banner:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text}"
    borderColor: "{colors.accent}"
    borderWidth: 1px
    typography: "{typography.body-sm}"
    rounded: "{rounded.compact}"
    padding: "{spacing.space-12} {spacing.space-16}"
---

## Overview

Sunlit Ledger is a published foundation for time-aware products, project operations, capacity planning, service delivery, invoicing, and work dashboards. The primary evidence is the repository-owned capture of https://www.getharvest.com/ on 2026-08-31 at 1920 by 1080 and 390 by 844. Its evidence hash is 897ca1ce2ced4ae0bffdda02bcc792cf98f0dc6e6dfa29e8f0683a341bcadd2c; the generated reports live at docs/prototype/design-references/captures/harvest.json and harvest.md, with local screenshots under public/design-references/harvest/.

The concrete product point of view is a calm operations workspace where units of work become visible outcomes. Its signature device is the Work Ledger: a readable grid of people, projects, time, capacity, value, or delivery windows, with one bounded orange activity signal connecting an input to a report or next action. The signal explains work state; it is not an orange decoration field.

The supplied reference brief described an earlier Harvest direction with #FFF8F1 as the page canvas, orange primary CTAs, 16px controls, Monarch display, and an orange gradient wash. The fresh local HTML, CSS, computed styles, desktop screenshot, and mobile screenshot show the current site using #FBF5F0 canvas, black 30px pill CTAs, Besley at 70px, orange as product/brand signal, and no verified CSS gradient. Current exact-URL evidence therefore owns the foundation. The older brief remains useful historical context but cannot override the capture.

## Curation record

**Retained.** Warm beige canvas, white working surfaces, near-black text, Besley-like editorial display contrast, Muoto-like geometric UI rhythm, black pill actions, 20px cards, restrained warm shadows, orange activity signals, credible product proof, and responsive movement from split hero to stacked mobile flow are retained.

**Translated.** Harvest's track-review-bill story becomes Work Ledger, a product-neutral grammar for connecting work input, current allocation, outcome evidence, and next action. IBM Plex Serif replaces Besley for editorial display and Inter replaces Muoto for body and controls; both substitutes are already self-hosted under SIL OFL-1.1. White text on orange product blocks is corrected to warm Ink for small-text contrast in generated UI.

**Excluded.** Harvest's name, orange bar mark, copy, customer logos, stopwatch illustration, exact time entries, screenshots, navigation, HubSpot assets, proprietary Muoto and Monarch files, and exact page composition are excluded from generated pages. No dedicated public brand-kit or trademark guideline authorizing compact logo use was located during the 2026-08-31 check, so the catalog uses text attribution getharvest.com in both locations.

## Colors

**Colour as text.** `accent`, `warning` are fills: use them for backgrounds, markers and borders, never as text on canvas or surface. For text, links or numbers in that colour family use `accent-text`, `warning-text`, which meet 4.5:1 on canvas and surface.

**Accessibility corrections (alpha.2).** These are deliberate derivations, not observed source values: `text-faint` #8B8B8B to #858585 (2.89:1 to 3.13:1, faint text at least 3). Hue is kept; only lightness moved. Values quoted elsewhere in this document remain the observed evidence.

The captured CSS explicitly defines Orange #FA5D00, Warm White #FFF8F1, Beige Light #FBF5F0, Beige Dark #F3EBE4, Smokey Charcoal #1D1E1C, Nav #6A696A, Secondary #8B8B8B, and white alternate cards. The rendered page uses Beige Light as the actual viewport canvas; Warm White remains a supporting warm surface rather than the default page background.

Primary is black because current navigation, email capture, and hero actions use black with white text. Orange is Accent: links on interaction, brand punctuation, active ledger blocks, and one product signal. It must not fill large page regions or compete with the black action hierarchy. The runtime adds Positive #23A40C, Warning #F18D2A, and Danger #CB5C5B from captured implementation evidence; each state requires text, icon, or structure.

No CSS gradient was observed in the primary local capture. Sunlit Ledger therefore defines no gradient token and agents must not invent an orange wash by default. A future version may add a gradient only after new exact-URL evidence and a version bump.

## Typography

Computed desktop styles show 70/400/77 with -2.8px tracking for h1 and 50/400/55 with -2px tracking for h2 in Besley. H3 uses Muoto at 30/400/36 and body roles use 19/400/26.6 or 16/400/24 with slightly negative tracking. Mobile keeps the serif voice while reducing and stacking the hero.

Besley is extraction evidence, but this foundation uses the repository's existing IBM Plex Serif files under SIL OFL-1.1 to avoid adding another dependency. Muoto VAR, MuotoWeb, and Monarch are proprietary or unverified hosted files and are not copied or hotlinked; existing self-hosted Inter under SIL OFL-1.1 provides UI and body roles. Serif is reserved for page and major section theses. Product labels, forms, data, and all text at 30px or below use Inter.

## Layout

Use a centered 1280px marketing column and a 1200px working column. Desktop heroes pair a five-column editorial message with a seven-column legible product workflow. The first proof must show readable work units, ownership, status, value, and one next action; an abstract browser frame is insufficient.

Product layouts use a 220px navigation rail, flexible ledger, and optional 300px context panel. Marketing and dashboard share the same cream/white surface ladder, serif-to-sans hierarchy, 10/16/20/30px shape vocabulary, and orange signal. Below 960px, stack message and proof. Below 720px, collapse navigation, make actions full width, move context after the selected ledger row, and preserve the Work Ledger as labelled cards or a horizontally scrollable table rather than shrinking it illegibly.

## Elevation & Depth

The captured system prefers surfaces and borders, with an observed small shadow of 0 0 14px rgba(0,0,0,.07), a warm panel shadow of 0 4px 9.9px rgba(123,85,31,.21), and a navigation shadow around 0 14px 14px rgba(0,0,0,.10). Use the small shadow for floating navigation and menus and the warm shadow for one product-proof panel. Ordinary ledger rows and dashboard cards rely on one-pixel edges, not independent floating shadows.

## Shapes

Current CSS exposes 20px cards and 30px buttons, while computed form controls also show 16px. Use 10px for dense ledger cells, 16px for inputs and images, 20px for cards and product windows, and 30px for primary/secondary controls. Fully rounded pills are reserved for compact status and icon controls. Do not flatten the system to one universal radius.

## Interaction and motion

Captured CSS includes 154 hover, 22 focus-visible, 29 active, 17 disabled, and one reduced-motion rule. Navigation links move from gray toward orange in 200ms. Black actions move to #4F4F4F on hover and focus. The foundation normalizes keyboard focus to a visible 2px orange ring with 3px offset because several source controls remove the native outline.

Routine transitions use 200ms; reveal or panel transitions may use 300ms. Work Ledger activity may slide or draw within one row only when it explains a state change. Reduced motion removes translation and reveals the final state immediately. Disabled controls retain a readable label and may not rely on opacity alone.

## Component coverage inventory

**Major surfaces observed.** Floating navigation, editorial hero, email capture, readable time-grid product proof, trust-logo row, workflow/capability sections, product panels, testimonial cards, integration regions, pricing/action regions, FAQ, and footer were present in rendered HTML, CSS, or screenshots.

**Micro-components observed.** Primary and ghost actions, text links, dropdown triggers, chevrons, email inputs, icon buttons, tabs, activity blocks, timer controls, badges, customer marks, dividers, FAQ disclosure controls, metric labels, and visible hover/focus/active/disabled behavior were evidenced.

**Not observed as signature components.** Toasts, destructive confirmation dialogs, pagination, loading skeletons, and file uploads were not established as signature parts of the captured viewport. Use generic accessible behavior for these cases rather than claiming a Harvest-derived treatment.

## Component contract

YAML recipes are semantic specifications, not registered component source. Agents must not create or register reusable components unless implementation is explicitly requested. Component prompts own anatomy, slots, bounded variants, states, responsive behavior, composition, and anti-copy boundaries.

Work Ledger slots are scope, columns, rows, activity blocks, current marker, selection, totals, filters, and next action. Ledger row slots are identity, owner, work label, duration or quantity, value, status, and actions. Activity block slots are label, metadata, start/end or range, state, and optional action. Product-proof panel slots are heading, controls, credible data surface, state note, and next action.

## Component prompts

### Product-proof hero

"Create a warm split hero with an IBM Plex Serif thesis, concise Inter body, one black primary pill, one quieter secondary action, and a readable operational proof. The proof must expose real work units, owner, state, value, and next action. Stack on mobile. Do not copy Harvest's words, timer illustration, customer marks, or exact time-grid arrangement."

### Work Ledger

"Create a responsive Work Ledger with configurable scope, labelled columns, rows, activity blocks, current marker, selection, totals, filters, and next action. Support compact and comfortable density plus loading, empty, disabled, warning, and error states. Use orange for one active or selected activity signal and pair it with text or position. Combine ledger rows, status chips, metric cards, and a context panel without hard-coding time-tracking nouns."

### Ledger row and activity block

"Create a ledger row with identity, owner, work label, quantity or duration, value, status, and actions. Activity blocks expose label, metadata, range, state, and optional action. Hover may reveal secondary actions in 200ms; focus uses a visible orange ring; selected state adds structure beyond color. Support capacity, production, service, editorial, and finance use cases without copying Harvest entries."

### Email capture and actions

"Create an email or single-field capture shell with a labelled input and black 30px pill action. Desktop may place the action inside the shell; mobile stacks a full-width input and action. Include error, pending, success, disabled reason, and focus-visible behavior. Do not use Harvest CTA copy or its logo."

### Product dashboard

"Create a cream-and-white operations dashboard with navigation rail, Work Ledger, metrics, filters, context, and one black next action. Use orange only for current activity, focus, or a small brand-neutral signal. Include loading, empty, positive, warning, danger, and permission states with labels and icons."

### Testimonial and proof row

"Create a warm muted proof card with quote, role, organization descriptor, outcome metric, and source link slots. Customer identity is optional and must be supplied by the implementing product. Combine with a grayscale trust row; never reuse Harvest customer names or logos."

### Micro component kit

"Create product-neutral dropdown triggers, icon buttons, tabs, inputs, status chips, dividers, disclosure controls, metric labels, current markers, and compact activity controls. Every piece uses semantic tokens, accessible names, and explicit hover, focus, active, disabled, loading, and error states. Compose each piece in at least two parents such as Work Ledger, dashboard panel, capture shell, or testimonial card."

## Cross-product compositions

**Studio delivery.** Rows represent projects and owners; activity blocks represent production sessions and review windows; metrics show capacity, budget, and delivery risk; context connects the selected deliverable to approval.

**Customer success.** Rows represent accounts; blocks represent onboarding steps, touchpoints, and renewal windows; metrics show health and value; alerts identify stalled outcomes without turning orange into a status color.

**Field service.** Rows represent teams or equipment; blocks represent service windows and travel; context shows work orders, safety state, and completion evidence; black remains the committed dispatch action.

**Content operations.** Rows represent assets; blocks represent drafting, review, legal approval, and publishing; metrics show throughput and overdue work; the current marker connects one asset to its next reviewer.

## Do's and Don'ts

- Do let warm beige, white, and Ink own most of the viewport.
- Do use serif only for brief editorial theses and Inter for working UI.
- Do reserve black for committed actions and orange for one bounded activity signal.
- Do make product proof legible and operational on both desktop and mobile.
- Do pair status color with text, icon, shape, or position.
- Don't recreate Harvest's logo, copy, customer marks, stopwatch, screenshot, or exact track-review-bill sequence.
- Don't copy or hotlink Muoto, Monarch, or other unverified hosted fonts.
- Don't invent an orange gradient wash; no gradient was verified in the fresh capture.
- Don't use white small text on orange when Ink provides safer contrast.
- Keep future visual changes versioned and rerun the visual, responsive, accessibility, and component-coverage gates before release.
