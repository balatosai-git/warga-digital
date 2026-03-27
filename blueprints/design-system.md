# Warga Digital — Design System & Consistency Guide

> **Authority document.** Every new page, component, and modification must align to the rules in this file. When in doubt, refer here first — not to intuition, not to other frameworks.

---

## 1. Core Philosophy

| Principle | Rule |
|-----------|------|
| **Mobile-first** | Primary canvas is 430px wide. Every layout must work perfectly at 375px before considering wider sizes. |
| **Dynamic theming** | Zero hardcoded brand colors in components. All color must flow through CSS custom properties (`var(--color-*)`). |
| **No redundancy** | If data appears in a hero metric strip, it must not appear again in stat cards below on the same screen. |
| **Proportional density** | Information density must match the action level — dashboards are dense, forms are spacious. |
| **Purposeful affordance** | Interactive elements that have no destination must be visually de-emphasized (`opacity-40`), not hidden or removed. |
| **Semantic structure** | `<main>` wraps the page, `<header>` for sticky top bars, `<section>` for hero regions, `<article>` for content cards. |

---

## 2. Token System

All tokens are defined as CSS custom properties in `src/app/globals.css` and aliased into Tailwind via `tailwind.config.ts`. Never use raw hex colors in JSX — always use a token.

### 2.1 CSS Custom Properties

```css
/* Primary palette */
--color-primary              /* main brand color (CTA, active, links) */
--color-primary-hover        /* darker shade for hover / gradient end */
--color-primary-muted        /* very light tint — icon backgrounds, pills */
--color-primary-shadow       /* rgba version for box-shadow glow */

/* Surfaces */
--color-surface              /* pure white card/sheet background */
--color-surface-alt          /* off-white page background */
--color-surface-gradient-start
--color-surface-gradient-mid
--color-surface-gradient-end

/* Typography */
--color-title                /* darkest — headings, strong labels */
--color-body                 /* default body text */
--color-body-muted           /* secondary / supporting text */

/* Indicators */
--color-indicator-active     /* progress dots, active state */
--color-indicator-inactive

/* Structural */
--color-input-border         /* border for inputs, card separators, dividers */
--color-bg-gradient-start    /* page-level bg gradient top */
--color-bg-gradient-end      /* page-level bg gradient bottom */

/* App canvas */
--app-max-width: 430px
--app-height: 100dvh
```

### 2.2 Tailwind Color Aliases

Use `app-*` prefix in Tailwind classes. Never interpolate raw hex.

| Tailwind class | Maps to |
|----------------|---------|
| `text-app-primary` | `var(--color-primary)` |
| `bg-app-primary` | `var(--color-primary)` |
| `bg-app-primary-muted` | `var(--color-primary-muted)` |
| `bg-app-surface` | `var(--color-surface)` |
| `bg-app-surface-alt` | `var(--color-surface-alt)` |
| `text-app-title` | `var(--color-title)` |
| `text-app-body` | `var(--color-body)` |
| `text-app-body-muted` | `var(--color-body-muted)` |

For values Tailwind cannot express as classes (e.g. `box-shadow`, `border-color` in a dynamic context), use `style={{ … }}` with the CSS variable directly.

---

## 3. Themes

Six themes ship in `src/lib/themes.ts`. The currently active theme is stored in `appearance-store` and applied by `ThemeApplicator`. All components inherit the active theme automatically through CSS variables — no theme-specific class names or conditionals are ever needed in component code.

| ID | Name | Primary |
|----|------|---------|
| `green` | Hijau (default) | `#43a047` |
| `blue` | Biru | `#1976d2` |
| `purple` | Ungu | `#7b1fa2` |
| `orange` | Oranye | `#e65100` |
| `teal` | Teal | `#00897b` |
| `rose` | Merah Muda | `#c2185b` |

**Rule:** A component is theme-correct if replacing the active theme causes every color to update automatically with no code changes.

---

## 4. Typography

All type is set in the system sans-serif stack (`-apple-system`, `BlinkMacSystemFont`, `sans-serif`). `-webkit-font-smoothing: antialiased` is set globally.

### 4.1 Scale

| Role | Size | Weight | Color token | Usage |
|------|------|--------|-------------|-------|
| Page title (hero) | `text-[19px]` | `font-extrabold` | `text-white` | Admin dashboard h1 |
| Section title (hero, sub-page) | `text-lg` (`18px`) | `font-extrabold` | `text-white` | Sub-page h1 |
| Card title | `text-sm` (`14px`) | `font-extrabold` | `text-app-title` | Role name, house blok |
| Nav card label | `text-[13px]` | `font-semibold` | `text-app-title` | NavCard title |
| Top bar label | `text-[13px]` | `font-bold` | `text-app-title` | Sticky header brand |
| Body / list item | `text-sm` (`14px`) | `font-medium` | `text-app-body` | General content |
| Section label | `text-[11px]` | `font-bold` | `text-app-body-muted` | `uppercase tracking-[0.07em]` |
| Sub-label / sublabel | `text-[11px]` | normal | `text-app-body-muted` | NavCard subtitle, member secondary |
| Breadcrumb / badge label | `text-[10px]` | `font-bold` | `text-white/70` | In-hero breadcrumb |
| Metric value (hero) | `text-[15px]` | `font-extrabold` | `text-white` | MetricPill value |
| Metric label (hero) | `text-[9px]` | `font-semibold` | `text-white/60` | MetricPill label, `uppercase tracking-widest` |
| Stat value (strip) | `text-base` (`16px`) | `font-extrabold` | `text-white` | Stats strip in sub-page hero |
| Stat label (strip) | `text-[10px]` | `font-medium` | `text-white/70` | Stats strip label |
| Form label | `text-[11px]` | `font-bold` | `text-app-body-muted` | `uppercase tracking-widest mb-2` |
| Form input | `text-sm` | `font-semibold` | `text-app-title` | Input, textarea value |
| Form placeholder | `text-sm` | normal | `text-app-body-muted/50` | — |
| Badge / pill text | `text-[10px]` | `font-bold` | varies | `uppercase tracking-wider` |
| Footer / caption | `text-[10px]` | normal | `text-app-body-muted/50` | Page footer, timestamps |
| Monospace | `text-[11px] font-mono font-semibold` | — | `text-app-body-muted/70` | Role slug, system identifiers |

### 4.2 Line Heights

- Headings: `leading-tight`
- Body copy: `leading-relaxed` (in descriptions, modal body)
- Single-line labels: `leading-none` or default

### 4.3 Letter Spacing

- Section labels (uppercase small): `tracking-[0.07em]`
- Metric labels (uppercase tiny): `tracking-widest`
- Breadcrumbs / role pills (uppercase tiny): `tracking-widest`
- All other text: default (no explicit tracking)

---

## 5. Spacing & Layout

### 5.1 Page Canvas

```
AppShell → max-w-[430px] centered, height: 100dvh, overflow: hidden
  └── Each page: flex flex-col h-full min-h-0
```

Every page root must be:
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### 5.2 Horizontal Padding

| Context | Padding |
|---------|---------|
| Hero section content | `px-4` |
| Sticky search/filter bar | `px-4` |
| Scrollable list area | `px-4` |
| Bottom sheet content | `px-5` |
| Dialog content | `p-6` |
| Card internal content | `p-4` |

### 5.3 Vertical Spacing

| Context | Value |
|---------|-------|
| Hero top padding | `pt-5` |
| Hero bottom padding | `pb-5` or `pb-6` |
| Dashboard content area top | `pt-5` |
| Dashboard content area bottom | `pb-10` |
| Section spacing (between sections) | `space-y-5` or `space-y-6` |
| Section label to content gap | `mb-3` |
| Card list item gap | `space-y-2.5` or `space-y-3` |
| Stats strip from nav row | `mt-4` |
| Sticky bar vertical | `py-3` |
| Form fields gap | `space-y-4` |
| Sheet header to form gap | `mb-5` |
| Sheet bottom padding | `pb-8` |

### 5.4 Border Radius Reference

| Element | Radius |
|---------|--------|
| Page-level content cards (standard) | `rounded-2xl` |
| Role/feature cards (elevated) | `rounded-3xl` |
| Hero / gradient section | none (edge-to-edge) |
| Icon containers (standard) | `rounded-xl` |
| Icon containers (large, in cards) | `rounded-2xl` |
| Avatar (admin identity) | `rounded-[14px]` |
| Bottom sheet | `rounded-t-[2rem]` |
| Dialog / modal | `rounded-3xl` |
| Buttons (primary CTA) | `rounded-2xl` |
| Buttons (small inline) | `rounded-xl` |
| FAB | `rounded-2xl` |
| Filter pills | `rounded-xl` |
| Search bar | `rounded-2xl` |
| Status badge / pill | `rounded-full` |
| Input / textarea | `rounded-2xl` |
| Metric pill (hero) | `rounded-2xl` |
| Stats strip pill | `rounded-xl` |
| Drag handle | `rounded-full` |
| Skeleton elements | `rounded` or `rounded-lg` |

### 5.5 Grid Layouts

| Use case | Grid |
|----------|------|
| Admin dashboard NavCards | `grid grid-cols-2 gap-3` |
| Hero metric pills (3 items) | `grid grid-cols-3 gap-2` |
| Sub-page stats strip (3 items) | `grid grid-cols-3 gap-2` |
| Sub-page stats strip (4 items) | `grid grid-cols-4 gap-2` |
| Dialog action row | `flex gap-2` (equal `flex-1`) |
| Form scope selector | `grid grid-cols-3 gap-2` |
| Card detail row | `grid grid-cols-2 gap-2` |

---

## 6. Color Usage Reference

### 6.1 Semantic Color Rules

| Semantic | Token / Class | Notes |
|----------|---------------|-------|
| Primary action | `var(--color-primary)` | Buttons, links, active filters, icon fill |
| Primary icon bg | `bg-app-primary-muted` | NavCard icons, empty-state icon containers |
| Pending / warning | `bg-amber-500` (badge), `text-amber-200` (hero pill), `bg-amber-50 border-amber-200` (inline warning) | Always amber for "needs attention" |
| Destructive | `#dc2626` (inline style) | Delete button bg, error toast bg |
| Destructive hover area | `hover:bg-red-50 text-red-500` | Inline destructive action buttons |
| Error banner | `bg-red-50 border-red-100 text-red-600` | Inline error states |
| Success toast | `var(--color-primary)` | Success feedback |
| Warning toast | `#d97706` | Warning feedback |
| Error toast | `#dc2626` | Error feedback |
| Scope: SYSTEM | `#7c3aed` (purple) | Hardcoded — scope-specific, not brand |
| Scope: TENANT | `var(--color-primary)` | Community-level role |
| Scope: HOUSE | `#d97706` (amber) | Hardcoded — scope-specific, not brand |

### 6.2 Surface Layering

```
Page bg          bg-app-surface-alt    (off-white, the canvas)
Cards            bg-app-surface        (pure white, elevated)
Expanded panels  var(--color-surface-alt)  (same as page, recessed feel)
Sheets / modals  bg-app-surface        (white, highest layer)
```

### 6.3 White Overlays (on gradient hero)

| Use | Class |
|-----|-------|
| Metric / stats pill bg | `bg-white/15` |
| Back / utility button default | `bg-white/20` |
| Back / utility button hover | `hover:bg-white/30` |
| Role pill (identity) | `bg-white/15` |
| Decorative blob (large) | `bg-white/10` |
| Decorative blob (secondary) | `bg-white/[0.06]` |
| Text primary on gradient | `text-white` |
| Text secondary on gradient | `text-white/70` |
| Text tertiary on gradient | `text-white/60` |

---

## 7. Shadows

Shadows use the low-saturation green-tinted rgba system `rgba(0,40,5,N)` to harmonize with the green primary palette. On non-green themes, this still looks natural because the shadow is very subtle.

| Context | Shadow value |
|---------|-------------|
| Standard content card | `shadow-[0_2px_12px_rgba(0,0,0,0.06)]` |
| Elevated content card | `shadow-[0_8px_24px_rgba(0,40,5,0.06)]` |
| Elevated card hover | `hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]` |
| NavCard (dashboard) | `shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)]` |
| Member row | `shadow-[0_2px_8px_rgba(0,40,5,0.05)]` |
| Skeleton card | `shadow-[0_8px_24px_rgba(0,40,5,0.04)]` |
| Sticky search bar | `shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]` |
| Bottom sheet | `shadow-[0_-20px_60px_rgba(0,40,5,0.18)]` |
| Dialog | `shadow-[0_32px_64px_rgba(0,0,0,0.18)]` |
| FAB | `0 8px 24px -6px var(--color-primary-shadow)` |
| Primary CTA button | `0 8px 22px -12px var(--color-primary-shadow)` |
| Inline primary button | `0 8px 20px -10px var(--color-primary-shadow)` |
| Search input | `shadow-sm` |
| Top bar | none (border-b only) |

---

## 8. Page Structure Patterns

### 8.1 Admin Dashboard (`/admin`)

```
<main flex flex-col h-full min-h-0 bg-app-surface-alt>
  │
  ├── <header shrink-0>                    ← Sticky top bar
  │     Brand icon + "Admin Panel" label
  │     Refresh button + Bell button
  │
  └── <div min-h-0 flex-1 overflow-y-auto overscroll-contain>
        │
        ├── <section>                      ← Gradient hero (NOT sticky, scrolls away)
        │     Identity row (initials avatar, role pill, h1, subtitle)
        │     MetricPills grid (3 cols)
        │
        └── <div space-y-5 px-4 pb-10 pt-5>   ← Content sections
              Error banner (conditional)
              <section> Kelola (NavCard grid)
              <section> Aktivitas Terkini
              Footer text
```

### 8.2 Admin Sub-pages (e.g. `/admin/roles`, `/admin/blok-rumah`)

```
<main flex flex-col h-full min-h-0 bg-app-surface-alt>
  │
  ├── <section shrink-0>                   ← Gradient hero (sticky, does NOT scroll)
  │     Decorative blobs
  │     Nav row: [back button] [title area] [utility button(s)]
  │     Stats strip grid (3–4 cols)
  │
  ├── <div shrink-0>                       ← Sticky search + filter bar (optional)
  │     Error banner (conditional)
  │     Search input
  │     Filter pills (horizontal scroll)
  │
  └── <div flex-1 overflow-y-auto px-4 py-3>  ← Scrollable list
        Loading skeletons  OR
        Empty state        OR
        Content list (space-y-2.5 or space-y-3)
```

**Key rule:** The hero on sub-pages uses `shrink-0` to stay fixed while content scrolls underneath. The dashboard hero does NOT use `shrink-0` because it sits inside the scrollable area.

### 8.3 Scrollable Container Rules

| Layer | Classes |
|-------|---------|
| Dashboard scrollable body | `min-h-0 flex-1 overflow-y-auto overscroll-contain` |
| Sub-page scrollable list | `flex-1 overflow-y-auto` |
| Horizontal scrollable strips | `flex overflow-x-auto scrollbar-none` |
| All scrollable areas | `overscroll-none` or `overscroll-contain` (never default) |

---

## 9. Component Patterns

### 9.1 Sticky Top Bar (dashboard only)

```tsx
<header className="flex shrink-0 items-center justify-between border-b border-[var(--color-input-border)] bg-app-surface/90 px-4 py-3 backdrop-blur-sm">
  {/* Left: brand */}
  <div className="flex items-center gap-2">
    <ShieldCheckSolidIcon className="h-[18px] w-[18px]" style={{ color: "var(--color-primary)" }} />
    <span className="text-[13px] font-bold tracking-tight text-app-title">Admin Panel</span>
  </div>

  {/* Right: utility buttons */}
  <div className="flex items-center gap-1.5">
    <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt transition hover:bg-app-primary-muted active:scale-90 disabled:opacity-40">
      <ArrowPathIcon className="h-4 w-4 text-app-body-muted" />
    </button>
  </div>
</header>
```

### 9.2 Gradient Hero Section

#### Sub-page variant (shrink-0, with nav row)

```tsx
<section
  className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
  style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" }}
>
  {/* Decorative blobs — always two, always these sizes */}
  <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
  <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />

  <div className="relative z-10">
    {/* Nav row */}
    <div className="flex items-center gap-3">
      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90">
        <ChevronLeftIcon className="h-5 w-5 text-white" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Breadcrumb · Context</p>
        <h1 className="truncate text-lg font-extrabold leading-tight text-white">Page Title</h1>
      </div>
      {/* Utility: refresh or add button — same style as back button */}
      <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50">
        <ArrowPathIcon className="h-4 w-4 text-white" />
      </button>
    </div>

    {/* Stats strip */}
    <div className="mt-4 grid grid-cols-3 gap-2"> {/* or grid-cols-4 */}
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm">
          <p className="text-[10px] text-white/70 font-medium leading-tight">{item.label}</p>
          <p className="text-base font-extrabold text-white leading-tight">{item.value}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

#### Dashboard hero variant (inside scrollable, with identity)

```tsx
<section
  className="relative overflow-hidden px-4 pb-5 pt-5"
  style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" }}
>
  <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" aria-hidden />
  <div className="pointer-events-none absolute -bottom-10 -left-4 h-28 w-28 rounded-full bg-white/[0.06]" aria-hidden />

  {/* Identity row */}
  <div className="relative z-10 flex items-center gap-3.5">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/20 text-base font-extrabold text-white backdrop-blur-sm">
      {initials}
    </div>
    <div className="min-w-0 flex-1">
      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-[3px]">
        <ShieldCheckSolidIcon className="h-3 w-3 text-white/80" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">RT Admin</span>
      </div>
      <h1 className="truncate text-[19px] font-extrabold leading-tight text-white">{adminName}</h1>
      <p className="text-[11px] text-white/60">Subtitle text</p>
    </div>
  </div>

  {/* Metric pills */}
  <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
    {/* MetricPill × 3 */}
  </div>
</section>
```

### 9.3 MetricPill

Used only inside the dashboard hero. Shows a single at-a-glance number.

```tsx
<div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
  {skeleton ? (
    <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
  ) : (
    <span className={`mt-0.5 text-[15px] font-extrabold leading-tight ${tone === "warning" ? "text-amber-200" : "text-white"}`}>
      {value}
    </span>
  )}
</div>
```

- `tone="warning"` → value in `text-amber-200` (for pending counts > 0)
- Always used in a `grid grid-cols-3 gap-2` container
- Never used outside a hero gradient section

### 9.4 SectionLabel

Used as the heading row for every content section outside the hero.

```tsx
<div className="mb-3 flex items-center justify-between">
  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
    {title}
  </h2>
  {action && (
    <button
      type="button"
      onClick={onAction}
      className="flex items-center gap-0.5 text-[11px] font-semibold transition-opacity hover:opacity-70 active:scale-95"
      style={{ color: "var(--color-primary)" }}
    >
      {action}
      <ChevronRightIcon className="h-3 w-3" />
    </button>
  )}
</div>
```

### 9.5 NavCard (dashboard management grid)

Two variants: linked (active page) and unlinked (page not yet built).

```tsx
{/* Linked — renders as <Link> */}
<Link
  href={href}
  className="group relative flex flex-col gap-3 rounded-2xl bg-app-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
>
  {/* Pending badge */}
  {badge > 0 && (
    <span className="absolute right-3 top-3 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white">
      {badge > 99 ? "99+" : badge}
    </span>
  )}
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary-muted">
    <Icon className="h-[18px] w-[18px] text-app-primary" />
  </div>
  <div className="min-w-0">
    <p className="text-[13px] font-semibold leading-snug text-app-title">{label}</p>
    <p className="mt-0.5 text-[11px] leading-snug text-app-body-muted">{sublabel}</p>
  </div>
</Link>

{/* Unlinked — renders as <div> */}
<div className="relative flex flex-col gap-3 rounded-2xl bg-app-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)] opacity-40">
  {/* Same inner content */}
</div>
```

**Rules:**
- Icon container: always `h-9 w-9 rounded-xl bg-app-primary-muted` + icon at `h-[18px] w-[18px] text-app-primary`
- Never use custom icon colors in NavCards — always the primary-muted/primary pair
- Sublabel must describe the navigation destination, not repeat the stat number already shown in the hero

### 9.6 Content Card (article)

Standard list item card used in data lists.

```tsx
<article className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
  {/* Header row */}
  <div className="flex items-start justify-between gap-2">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-body-muted">Label</p>
      <h2 className="truncate text-base font-extrabold text-app-title">Primary Value</h2>
    </div>
    <span className="rounded-full bg-app-primary-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-app-primary">
      Status
    </span>
  </div>

  {/* Detail row */}
  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-app-body-muted">
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4" />
      <span className="truncate">Detail</span>
    </div>
  </div>
</article>
```

For interactive / elevated cards (like `RoleCard`):
```tsx
<article className="overflow-hidden rounded-3xl bg-app-surface shadow-[0_8px_24px_rgba(0,40,5,0.06)] transition-shadow hover:shadow-[0_12px_32px_rgba(0,40,5,0.10)]">
```

### 9.7 Search Bar

```tsx
<div
  className="flex items-center gap-2.5 rounded-2xl border bg-app-surface px-3.5 py-2.5 shadow-sm"
  style={{ borderColor: "var(--color-input-border)" }}
>
  <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted/60" />
  <input
    type="search"
    className="flex-1 bg-transparent text-sm text-app-title placeholder:text-app-body-muted/50 outline-none"
    placeholder="Cari..."
  />
  {query && (
    <button type="button" onClick={clear} className="text-app-body-muted/60 hover:text-app-body-muted">
      <XMarkIcon className="h-4 w-4" />
    </button>
  )}
</div>
```

### 9.8 Filter Pills (horizontal scroll)

```tsx
<div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
  {options.map((opt) => {
    const isActive = filter === opt.key;
    return (
      <button
        key={opt.key}
        type="button"
        onClick={() => setFilter(opt.key)}
        className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
          isActive
            ? "text-white shadow-sm"
            : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
        }`}
        style={isActive ? { background: "var(--color-primary)" } : undefined}
      >
        {opt.label}
      </button>
    );
  })}
</div>
```

### 9.9 Inline Icon Buttons (card actions)

```tsx
{/* Edit */}
<button
  className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-[var(--color-primary-muted)] active:scale-90"
  style={{ color: "var(--color-primary)" }}
>
  <PencilSquareIcon className="h-4 w-4" />
</button>

{/* Delete */}
<button className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 active:scale-90">
  <TrashIcon className="h-4 w-4" />
</button>
```

### 9.10 Primary CTA Button (full-width)

```tsx
<button
  type="submit"
  disabled={loading || !isValid}
  className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
  style={{
    background: loading || !isValid ? "var(--color-body-muted)" : "var(--color-primary)",
    boxShadow: loading || !isValid ? "none" : "0 8px 22px -12px var(--color-primary-shadow)",
  }}
>
  {loading ? (
    <span className="flex items-center justify-center gap-2">
      <ArrowPathIcon className="h-4 w-4 animate-spin" />
      Menyimpan...
    </span>
  ) : "Label"}
</button>
```

### 9.11 FAB (Floating Action Button)

```tsx
<div className="fixed bottom-6 right-4 z-30">
  <button
    type="button"
    className="flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
    style={{
      background: "var(--color-primary)",
      boxShadow: "0 8px 24px -6px var(--color-primary-shadow)",
    }}
  >
    <PlusIcon className="h-5 w-5" />
    Action Label
  </button>
</div>
```

FAB `z-30` sits below sheets (`z-50`) and backdrop (`z-40`), above content (`z-0`).

### 9.12 Small Inline Primary Button

```tsx
<button
  type="button"
  className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white transition active:scale-90 disabled:opacity-50"
  style={{ background: "var(--color-primary)" }}
>
  <PlusIcon className="h-3.5 w-3.5" />
  Tambah
</button>
```

### 9.13 Member Row

```tsx
<div className="flex items-center justify-between gap-3 rounded-2xl bg-app-surface px-3 py-2.5 shadow-[0_2px_8px_rgba(0,40,5,0.05)]">
  <div className="flex items-center gap-2.5 min-w-0">
    {/* Avatar with initials */}
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-xs font-extrabold shadow-sm"
      style={{ background: "var(--color-primary)" }}
    >
      {initials}
    </div>
    <div className="min-w-0">
      <p className="truncate text-xs font-bold text-app-title leading-tight">{name}</p>
      <p className="text-[10px] text-app-body-muted">{secondary}</p>
    </div>
  </div>
  {/* Revoke / action */}
  <button className="shrink-0 flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50 active:scale-90 disabled:opacity-40">
    <UserMinusIcon className="h-3.5 w-3.5" />
    Cabut
  </button>
</div>
```

### 9.14 Error Banner

```tsx
<div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
  <p className="text-[13px] text-red-600">{message}</p>
  <button
    type="button"
    onClick={retry}
    className="shrink-0 text-xs font-semibold text-red-500 underline underline-offset-2"
  >
    Coba lagi
  </button>
</div>
```

### 9.15 Empty State

```tsx
<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface/60 py-8 text-center">
  <Icon className="h-7 w-7 text-app-body-muted/30" aria-hidden />
  <p className="text-[13px] font-medium text-app-body-muted">Title</p>
  <p className="max-w-[180px] text-[11px] leading-relaxed text-app-body-muted/60">
    Supporting description.
  </p>
</div>
```

For empty states inside data sections (no filter match):
```tsx
<div className="flex flex-col items-center gap-3 rounded-3xl bg-app-surface py-10 text-center px-6 shadow-[0_4px_16px_rgba(0,40,5,0.05)]">
  <MagnifyingGlassIcon className="h-10 w-10 text-app-body-muted/30" />
  <p className="text-sm font-bold text-app-body-muted">Tidak ditemukan</p>
  <p className="text-xs text-app-body-muted/70">Supporting text</p>
  <button className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>Reset Filter</button>
</div>
```

### 9.16 Skeleton Loading

```tsx
{/* Card-level skeleton */}
<div className="animate-pulse rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
  <div className="h-4 w-24 rounded bg-app-surface-alt" />
  <div className="mt-2 h-3 w-40 rounded bg-app-surface-alt" />
</div>

{/* Inline skeleton (inside loaded card) */}
<div className="mx-auto mt-1 h-4 w-8 animate-pulse rounded bg-white/20" /> {/* on gradient */}
<div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" /> {/* MetricPill */}
<div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-app-surface-alt" /> {/* stat value */}
```

**Rule:** Skeleton elements on white backgrounds use `bg-app-surface-alt`. Skeleton elements on gradient backgrounds use `bg-white/20`.

### 9.17 Bottom Sheet

```tsx
{/* Backdrop */}
<div
  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
  onClick={onClose}
  aria-hidden
  style={{ animation: "fadeIn 0.2s ease" }}
/>

{/* Sheet */}
<div
  className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
  style={{
    maxWidth: "var(--app-max-width)",
    animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
  }}
>
  {/* Drag handle */}
  <div className="flex justify-center pt-3">
    <div className="h-1 w-10 rounded-full" style={{ background: "var(--color-input-border)" }} />
  </div>

  <div className="px-5 pb-8 pt-3">
    {/* Sheet header */}
    <div className="mb-5 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-extrabold text-app-title">Sheet Title</h2>
        <p className="text-xs text-app-body-muted mt-0.5">Supporting description</p>
      </div>
      <button className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90">
        <XMarkIcon className="h-5 w-5 text-app-body-muted" />
      </button>
    </div>

    {/* Content (form, list, etc.) */}
  </div>
</div>
```

### 9.18 Dialog / Confirmation Modal

```tsx
{/* Backdrop — same as sheet */}
<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" style={{ animation: "fadeIn 0.2s ease" }} />

{/* Dialog */}
<div
  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2.5rem)] rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
  style={{
    maxWidth: "360px",
    animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
  }}
  role="dialog"
  aria-modal="true"
>
  {/* Icon (destructive) */}
  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
    <TrashIcon className="h-7 w-7 text-red-600" />
  </div>

  {/* Body — center-aligned */}
  <h3 className="text-center text-base font-extrabold text-app-title">Title</h3>
  <p className="mt-2 text-center text-sm text-app-body-muted leading-relaxed">Description</p>

  {/* Warning note (conditional) */}
  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
    <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
    <p className="text-xs font-semibold text-amber-700">Warning message</p>
  </div>

  {/* Action row */}
  <div className="mt-5 flex gap-2">
    <button
      onClick={onClose}
      className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
      style={{ background: "var(--color-surface-alt)" }}
    >
      Batal
    </button>
    <button
      onClick={onConfirm}
      className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
      style={{ background: "#dc2626" }}
    >
      Ya, Hapus
    </button>
  </div>
</div>
```

### 9.19 Toast Notification

```tsx
<div
  className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-2xl px-4 py-3.5 shadow-xl text-sm font-semibold text-white w-[calc(100%-2rem)]"
  style={{
    maxWidth: "calc(var(--app-max-width) - 2rem)",
    background: type === "success" ? "var(--color-primary)" : type === "warning" ? "#d97706" : "#dc2626",
    animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
  }}
>
  <Icon className="h-5 w-5 shrink-0" />
  <span className="flex-1 leading-snug">{message}</span>
  <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
    <XMarkIcon className="h-4 w-4" />
  </button>
</div>
```

Auto-dismiss after 3500ms. `z-[100]` is the highest layer in the app.

### 9.20 Form Fields

#### Label
```tsx
<label className="block text-[11px] font-bold uppercase tracking-widest text-app-body-muted mb-2">
  Field Name <span className="normal-case font-normal text-app-body-muted/70">(opsional)</span>
</label>
```

#### Input / Textarea
```tsx
<input
  className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none bg-white transition-all"
  style={{ borderColor: "var(--color-input-border)" }}
  onFocus={(e) => {
    e.currentTarget.style.borderColor = "var(--color-primary)";
    e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
  }}
  onBlur={(e) => {
    e.currentTarget.style.borderColor = "var(--color-input-border)";
    e.currentTarget.style.boxShadow = "none";
  }}
/>
```

Focus state: border becomes primary, soft glow ring using `color-mix`. This is theme-aware — the glow color updates with the active theme.

### 9.21 Status / Scope Badge

```tsx
<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-app-primary-muted text-app-primary">
  <Icon className="h-2.5 w-2.5" />
  Label
</span>
```

---

## 10. Interaction & Animation

### 10.1 Global Transition

Set globally in `globals.css`:
```css
a, button {
  transition-property: color, background-color, border-color, box-shadow, opacity, transform;
  transition-duration: 180ms;
  transition-timing-function: ease;
}
```

Use `transition` or `transition-all` in Tailwind to activate this. Do not set explicit durations in components unless overriding (e.g. icon rotation in accordions uses `duration-200`).

### 10.2 Scale Interactions

| Element type | Active scale |
|---|---|
| Content cards (interactive) | `active:scale-[0.97]` |
| NavCards, list items | `active:scale-[0.97]` |
| Standard buttons (32–40px) | `active:scale-90` |
| Filter pills, small buttons | `active:scale-95` |
| Primary CTA, FAB | `active:translate-y-0` (lift reversal, no scale) |
| Inline icon buttons (8×8 size) | `active:scale-90` |

### 10.3 Hover States

| Element | Hover |
|---------|-------|
| Primary CTA | `hover:-translate-y-[1px]` |
| FAB | `hover:-translate-y-0.5` |
| Cards with shadow | `hover:shadow-[elevated version]` |
| Top bar utility buttons | `hover:bg-app-primary-muted` |
| Ghost / text links | `hover:opacity-70` |
| Icon action buttons | `hover:bg-[var(--color-primary-muted)]` (edit) / `hover:bg-red-50` (delete) |

### 10.4 Animation Keyframes

All keyframes live locally in `<style>` blocks within the component that uses them, or in `globals.css`. Do not use a shared CSS file for component-specific animations.

```css
/* Sheet entry (bottom-up) */
@keyframes sheetUp {
  from { transform: translate(-50%, 100%); }
  to   { transform: translate(-50%, 0); }
}
/* Timing: 0.3s cubic-bezier(0.34, 1.4, 0.64, 1) — slight overshoot */

/* Dialog entry (scale-up from center) */
@keyframes dialogIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
/* Timing: 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) — more bounce */

/* Backdrop + fade-in overlays */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* Timing: 0.2s ease */

/* Toast entry */
@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, -12px) scale(0.95); }
  to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
/* Timing: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) */

/* Page-level subtle enter */
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
```

### 10.5 Loading Spinner

The `ArrowPathIcon` with `animate-spin` is the standard loading indicator for inline buttons and refresh actions. The `PageLoader` component uses a custom multi-ring CSS animation and is reserved for full-page auth/access checks only.

---

## 11. Z-Index Layers

| Layer | z-index | Usage |
|-------|---------|-------|
| Content | 0 (default) | Cards, lists, sections |
| Sticky elements | `z-10` | Sticky search/filter bars |
| FAB | `z-30` | Floating action button |
| Backdrop | `z-40` | Sheet / dialog backdrop |
| Sheet / Dialog | `z-50` | Bottom sheets, modals |
| Toast | `z-[100]` | Notification toasts (always on top) |

---

## 12. Icon Usage

Source: `@heroicons/react/24/outline` (default) and `@heroicons/react/24/solid` (active/filled states only).

### 12.1 Size Reference

| Context | Size class |
|---------|------------|
| Top bar brand icon | `h-[18px] w-[18px]` |
| NavCard icon | `h-[18px] w-[18px]` |
| Hero back/utility buttons | `h-4 w-4` (refresh) or `h-5 w-5` (navigation) |
| Top bar utility buttons | `h-4 w-4` |
| Inline card action buttons | `h-4 w-4` |
| Member row icons | `h-3.5 w-3.5` |
| Filter pill icons | `h-3.5 w-3.5` |
| Scope badge icons | `h-2.5 w-2.5` |
| Card detail row icons | `h-4 w-4` |
| Empty state icon | `h-7 w-7` (small), `h-10 w-10` (large), `h-8 w-8` (medium) |
| Toast icon | `h-5 w-5` |
| Dialog icon | `h-7 w-7` |
| Section action chevron | `h-3 w-3` |
| Expand/collapse chevron | `h-3 w-3` with `transition-transform duration-200 rotate-180` when open |

### 12.2 Solid vs Outline

Use `solid` only for:
- Active nav/tab indicators
- Shield in top bar and hero identity (admin brand icon)
- Role pill icon inside hero

Use `outline` for everything else.

---

## 13. Accessibility

| Pattern | Implementation |
|---------|----------------|
| Page load states | `<PageLoader>` with `aria-busy="true" aria-live="polite"` |
| Icon-only buttons | Always include `aria-label="..."` |
| Decorative elements | `aria-hidden` on all blobs, decorative divs, and icon wrappers |
| Dialogs | `role="dialog" aria-modal="true" aria-labelledby="..."` |
| Current nav item | `aria-current="page"` on BottomNav active link |
| Section regions | Named with `aria-label="..."` on `<section>` elements |
| Focus ring | Global `:focus-visible` with `outline: 2px solid color-mix(in srgb, var(--color-primary) 65%, white 35%)` |
| Interactive list items | Use `<Link>` (not `<button>`) for navigation, `<button>` for actions |
| Form fields | Every `<input>` / `<textarea>` has a corresponding `<label>` via `htmlFor` or `block` label wrapping |
| Disabled states | `disabled:opacity-40` or `disabled:opacity-50` — never `disabled:hidden` |

---

## 14. What NOT to Do

| Violation | Correct approach |
|-----------|-----------------|
| `color: "#43a047"` in JSX style | `style={{ color: "var(--color-primary)" }}` |
| `bg-green-500` in Tailwind | `bg-app-primary` |
| Hardcoded `pt-12` gap before hero content | Hero top padding is always `pt-5` |
| Two sections on the same screen showing the same number | One source of truth — choose hero strip OR section card, not both |
| `grid-cols-4` with 5 items | Plan the grid count to match the item count exactly |
| `href` to a non-existent route | Render `<div>` with `opacity-40` instead of `<Link>` |
| `<button>` for page navigation | Use Next.js `<Link>` for all navigational elements |
| `animate-spin` on a full page spinner | Use `<PageLoader>` component |
| Custom `z-index` values outside the layer table | Use only the defined z-index layers above |
| Sheet or dialog without a backdrop | Always pair overlay elements with a `z-40 bg-black/50 backdrop-blur-sm` backdrop |
| `overflow-hidden` on the scrollable content container | Use on hero sections only, never on the scroll container |
| Hard-wrapping metric pills | Use `grid grid-cols-3` not `flex flex-wrap` to guarantee even distribution |