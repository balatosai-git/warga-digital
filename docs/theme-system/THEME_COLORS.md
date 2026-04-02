# Theme Color Palette Documentation

## Overview

This app now includes **15 distinct theme colors** covering the full color spectrum. Users can customize their app appearance by selecting their preferred color theme in the **Profile Settings** (`Profil > Tema Warna`).

## Complete Theme List

### Original Themes (7)

| Theme ID | Name (Indonesian) | Primary Color | Use Case |
|----------|-------------------|---------------|----------|
| `green` | Hijau | #43a047 | Default theme - Natural, eco-friendly |
| `blue` | Biru | #1976d2 | Professional, trustworthy |
| `purple` | Ungu | #7b1fa2 | Creative, sophisticated |
| `orange` | Oranye | #e65100 | Energetic, warm |
| `teal` | Teal | #00897b | Calming, modern |
| `rose` | Merah Muda | #c2185b | Soft, gentle |
| `hitam` | Hitam | #1c1c1e | Dark, minimalist |

### New Expanded Themes (8)

| Theme ID | Name (Indonesian) | Primary Color | Use Case |
|----------|-------------------|---------------|----------|
| `red` | Merah | #d32f2f | Bold, urgent, attention-grabbing |
| `amber` | Kuning Emas | #f57f17 | Warm, optimistic, highlighting |
| `cyan` | Sian | #0097a7 | Cool, technical, modern |
| `indigo` | Indigo | #303f9f | Deep, professional, enterprise |
| `lime` | Jeruk Lemon | #9ccc65 | Fresh, vibrant, youthful |
| `brown` | Coklat | #6d4c41 | Earthy, grounded, natural |
| `deep-green` | Hijau Gelap | #1b5e20 | Forest, secure, premium |
| `coral` | Karang | #ff6f60 | Warm, inviting, friendly |

## Color Spectrum Coverage

The themes now cover the complete color spectrum:

```
RED SPECTRUM:
  🔴 Red (#d32f2f)
  🔴 Coral (#ff6f60)
  🩷 Rose/Pink (#c2185b)

WARM SPECTRUM:
  🟠 Orange (#e65100)
  🟨 Amber/Yellow (#f57f17)
  🟤 Brown (#6d4c41)

GREEN SPECTRUM:
  🟢 Green (#43a047) [DEFAULT]
  🟢 Lime (#9ccc65)
  🟢 Deep Green (#1b5e20)

COOL SPECTRUM:
  🔵 Blue (#1976d2)
  🔵 Cyan (#0097a7)
  🔵 Indigo (#303f9f)

TEAL/COOL SPECTRUM:
  🟦 Teal (#00897b)

NEUTRAL SPECTRUM:
  ⬛ Black (#1c1c1e)

PURPLE/COOL SPECTRUM:
  🟣 Purple (#7b1fa2)
```

## Theme Structure

Each theme includes the following CSS variables that are applied dynamically:

### Core Colors
- **primary**: Main brand color (CTAs, links, active states)
- **primaryHover**: Darker shade for hover states
- **primaryMuted**: Light shade for backgrounds/badges

### Surface Colors
- **surface**: Main white/light background
- **surfaceAlt**: Alternate light background
- **surfaceGradientStart, Mid, End**: Gradient variants
- **bgGradientStart, End**: Page background gradient

### Text Colors
- **title**: Heading text color (dark)
- **body**: Body text color
- **bodyMuted**: Secondary text color

### Interactive States
- **indicatorActive**: Active progress/indicator color
- **indicatorInactive**: Inactive progress/indicator color
- **inputBorder**: Input field border color
- **primaryShadow**: Button shadow with theme color

## Implementation Details

### File Location
```
src/lib/themes.ts
```

### Usage

**Switch themes programmatically:**
```typescript
import { useAppearanceStore } from "@/stores/appearance-store";

const { setThemeId } = useAppearanceStore();
setThemeId("blue"); // Switch to blue theme
```

**Access current theme:**
```typescript
const { theme, themeId } = useAppearanceStore();
console.log(theme.colors.primary); // Current primary color
```

**Get theme by ID:**
```typescript
import { getTheme, THEMES } from "@/lib/themes";

const blueTheme = getTheme("blue");
const allThemes = THEMES; // Array of all 15 themes
```

### Theme Selection UI

Users can change themes via the **Profile page**:
1. Navigate to **Profil** (Profile)
2. Tap the **Swatch icon** (Tema Warna / Color Theme)
3. Select from 15 color options
4. Theme auto-saves and applies instantly

The UI displays a 3-column grid of theme color swatches with the current selection highlighted.

## Design System Variables

All themes follow the same color structure to ensure consistency:

- **Accessibility**: All text colors meet WCAG AA contrast requirements
- **Consistency**: Each color has coordinated hover, muted, and gradient variants
- **Flexibility**: Gradient backgrounds adapt to the primary color
- **Responsiveness**: Shadow and border colors scale with the theme

## Adding New Themes

To add a new theme:

1. Create a new `const newTheme: Theme` object in `src/lib/themes.ts`
2. Include all required `ThemeColors` properties
3. Add to the `THEMES` array export
4. The theme picker UI will automatically display it

Example:
```typescript
const myTheme: Theme = {
  id: "mytheme",
  name: "Mi Tema",
  nameId: "Mi Tema",
  colors: {
    primary: "#your-color",
    primaryHover: "#darker-shade",
    primaryMuted: "#light-shade",
    // ... all other required colors
  },
};
```

## Default Theme

The default theme is **Green** (`GREEN`), applied on first load. Users' selection is persisted to localStorage via Zustand.

---

**Last Updated:** Theme expansion completed with 8 new color variants for full spectrum coverage.