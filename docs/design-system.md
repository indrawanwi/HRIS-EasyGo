# HRIS EasyGo — Design System & Visual Specification

> Extracted verbatim from CSS CORE of `HRIS-EasyGo-Mockup-v6.3.html`.

## 1. Color Palette & CSS Variables

```css
:root {
  /* Brand / Primary */
  --or: #f97316;          /* EasyGo Orange */
  --or-h: #ea580c;        /* Orange Hover */
  --or-bg: #fff7ed;       /* Light Orange Tint */
  --or-bd: #fdba74;       /* Orange Border */

  /* Neutrals */
  --ink: #1e293b;         /* Primary Dark Typography (slate-800) */
  --ink-2: #475569;       /* Secondary Typography (slate-600) */
  --muted: #64748b;       /* Muted / Placeholder (slate-500) */
  --bg: #f8fafc;          /* Canvas Background (slate-50) */
  --card: #ffffff;        /* Surface / Card Background */
  --bd: #e2e8f0;          /* Subtle Border (slate-200) */
  --bd-focus: #cbd5e1;    /* Focused Border */

  /* Semantics */
  --ok: #16a34a;          /* Success Green */
  --ok-bg: #f0fdf4;
  --ok-bd: #bbf7d0;

  --warn: #ca8a04;        /* Warning Amber */
  --warn-bg: #fefce8;
  --warn-bd: #fef08a;

  --danger: #dc2626;      /* Danger Red */
  --danger-bg: #fef2f2;
  --danger-bd: #fecaca;

  --info: #2563eb;        /* Information Blue */
  --info-bg: #eff6ff;
  --info-bd: #bfdbfe;

  --proc: #7c3aed;        /* Process Purple */
  --proc-bg: #f5f3ff;
  --proc-bd: #ddd6fe;

  /* Geometry */
  --r-sm: 6px;
  --r-md: 9px;
  --r-lg: 14px;
  --r-pill: 9999px;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
```

## 2. Layout Specifications

- **Desktop Sidebar**:
  - Expanded width: `254px`
  - Compact width: `76px`
  - Active section behavior: Accordion (only active group open at any time)
- **Header**:
  - Height: `60px`, sticky top with backdrop blur
  - Shows real-time Jakarta clock (`WIB / Asia/Jakarta`)
  - User avatar with badge and persona switcher
- **Data Tables**:
  - Cell padding: `8px 12px` (dense: `6px 8px`)
  - Numeric columns: Right-aligned (`text-align: right`)
  - Status column: Rounded chip pill
- **Mobile Simulator**:
  - Viewport container: `390px x 844px` (iPhone 14 frame)
  - Floating bottom navigation pill:
    - 4 primary tabs: Home, Kehadiran, Timesheet, Account
    - Centered `+` quick action trigger
