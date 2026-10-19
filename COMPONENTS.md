# Matinee UI Component Library (COMPONENTS.md)

A high-performance, accessible, and token-driven React Native component library built specifically for the Matinee cinema platform.

Every component uses the semantic design tokens defined in `design-tokens.tokens.json` / `src/theme/tokens.js` and adapts dynamically to **Cinematic Dark** and **Daylight Light** themes through `useTheme()`.

---

## Component Index

1. [`Button`](#1-button)
2. [`Text`](#2-text)
3. [`Card`](#3-card)
4. [`MovieCard`](#4-moviecard)
5. [`Input`](#5-input)
6. [`Chip`](#6-chip)
7. [`Badge`](#7-badge)
8. [`BottomSheet`](#8-bottomsheet)
9. [`Skeleton`](#9-skeleton)
10. [`Toast`](#10-toast)
11. [`EmptyState`](#11-emptystate)
12. [`SeatMap`](#12-seatmap)

---

## 1. Button

Interactive pressable component with haptic feedback, spinner loading state, accessible touch areas ($\ge 44 \times 44\text{pt}$), and 5 semantic variants.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | Visual style role |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button height (`36pt`, `44pt`, `52pt`) |
| `loading` | `boolean` | `false` | Shows activity spinner and disables clicks |
| `disabled` | `boolean` | `false` | Dimmed opacity and disabled interaction |
| `fullWidth` | `boolean` | `false` | Expands to fill parent container |
| `iconLeading`| `ReactNode` | `undefined` | Icon positioned before title |
| `iconTrailing`| `ReactNode` | `undefined` | Icon positioned after title |
| `onPress` | `Function` | required | Press callback with haptic feedback |

### Example

```jsx
import { Button } from './components/ui';

<Button
  variant="primary"
  size="lg"
  loading={isSubmitting}
  onPress={handleCheckout}
>
  Confirm & Pay ₦9,000
</Button>
```

---

## 2. Text

Typography component mapped strictly to the project's 15 design token styles and semantic color roles with dynamic contrast and font scaling.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `TypographyVariant` | `'bodyMedium'` | One of 15 typography tokens |
| `color` | `SemanticColorRole \| string` | `'onSurface'` | Semantic role (`'primary'`, `'onSurfaceVariant'`, `'error'`, etc.) |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment |
| `numberOfLines` | `number` | `undefined` | Truncation limit |

### Available Variants
- **Display (Lora)**: `displayLarge`, `displayMedium`, `displaySmall`
- **Headline (DM Sans)**: `headlineLarge`, `headlineMedium`, `headlineSmall`
- **Title (DM Sans)**: `titleLarge`, `titleMedium`, `titleSmall`
- **Body (DM Sans)**: `bodyLarge`, `bodyMedium`, `bodySmall`
- **Label (DM Sans)**: `labelLarge`, `labelMedium`, `labelSmall`

---

## 3. Card

Container element for grouping related cinema information with elevation, border, and pressable behaviors.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'elevated' \| 'outlined' \| 'filled'` | `'elevated'` | Background & shadow style |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Internal spacing token |
| `onPress` | `Function` | `undefined` | Makes card touchable with haptic feedback |

---

## 4. MovieCard

Optimized movie poster card featuring `expo-image` disk/memory caching, smooth 300ms transitions, IMDb/TMDB rating badge, and watchlist bookmark toggle.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | required | Movie title |
| `posterUrl` | `string` | required | Poster image URL |
| `genre` | `string` | `''` | Primary genre label |
| `rating` | `number` | `0` | TMDB rating (0.0 – 10.0) |
| `runtimeMinutes` | `number` | `undefined`| Runtime duration |
| `onPress` | `Function` | required | Click callback |

---

## 5. Input

Accessible text input field featuring floating labels, validation states, clear buttons, secure entry toggles, and high-contrast focus rings.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | required | Floating label text |
| `value` | `string` | required | Input value |
| `onChangeText` | `Function` | required | Text change handler |
| `placeholder` | `string` | `''` | Input placeholder |
| `error` | `string` | `undefined` | Error message (renders in error colors) |
| `helperText` | `string` | `undefined` | Supporting instructional text |
| `secureTextEntry`| `boolean` | `false` | Password masking with show/hide icon |

---

## 6. Chip

Pill-shaped interactive token for filtering movie genres, showtime dates, and cinema amenities.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | required | Chip text |
| `selected` | `boolean` | `false` | Highlights active selection |
| `onPress` | `Function` | required | Click handler |
| `iconLeading` | `ReactNode` | `undefined` | Leading icon |

---

## 7. Badge

Compact indicator for status tags, ticket counts, and promo callouts.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `content` | `string \| number`| required | Text or count |
| `variant` | `'primary' \| 'secondary' \| 'error' \| 'success' \| 'warning'` | `'primary'` | Semantic role |
| `size` | `'sm' \| 'md'` | `'md'` | Badge dimensions |

---

## 8. BottomSheet

Draggable sliding modal drawer for checkout confirmations, filter menus, and seat details.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `visible` | `boolean` | required | Presentation visibility |
| `onClose` | `Function` | required | Dismissal callback |
| `title` | `string` | `undefined` | Header title |
| `children` | `ReactNode` | required | Drawer body |

---

## 9. Skeleton

Animated shimmering placeholder component mimicking content shapes during data fetching.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `width` | `number \| string`| `'100%'` | Width |
| `height` | `number` | `16` | Height |
| `borderRadius` | `number` | `tokens.radius.sm` | Corner rounding |

---

## 10. Toast

Floating notification banner for asynchronous feedback (payment confirmation, network errors, hold countdown alerts).

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `visible` | `boolean` | required | Visibility toggle |
| `type` | `'success' \| 'error' \| 'info' \| 'warning'` | `'info'` | Alert role |
| `message` | `string` | required | Notification body |
| `duration` | `number` | `3000` | Auto-dismiss duration (ms) |

---

## 11. EmptyState

Graceful fallback screen when search results, bookings, or notifications are empty.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | required | Primary heading |
| `description` | `string` | required | Subtitle explanation |
| `actionLabel` | `string` | `undefined` | Button label |
| `onAction` | `Function` | `undefined` | Button press handler |

---

## 12. SeatMap (Supports 300+ Seats)

Cinema seat matrix handling standard, wheelchair-accessible, selected, held, and sold seats with smooth 60fps pan/zoom.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `seats` | `Seat[]` | required | Array of seat objects with row, col, type, status |
| `selectedSeatIds` | `string[]` | `[]` | Currently selected seat IDs |
| `onSeatToggle` | `Function` | required | Callback when seat is tapped |
| `maxSelectable` | `number` | `6` | Max allowable seats |

### States Handled
- `AVAILABLE`: Surface container low with primary outline on press.
- `SELECTED`: Filled primary with white icon and selection bounce animation.
- `HELD`: Warning container (10-minute hold by another user).
- `SOLD`: Surface container lowest, dimmed opacity (0.35), disabled.
- `WHEELCHAIR`: Dedicated wheelchair accessibility symbol.

---

## Component Gallery

A living style guide is available inside the application at:
`ComponentGalleryScreen` (accessible via development settings or operator navigation), showcasing all 12 components across all states and themes.
