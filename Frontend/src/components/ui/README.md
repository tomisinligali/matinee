# Matinee UI Component Library

A high-performance, accessible, and token-driven React Native component library built specifically for the Matinee cinema platform.

Every component uses the semantic design tokens defined in `src/theme/tokens.js` and adapts dynamically to **Cinematic Dark** and **Daylight Light** themes through `useTheme()`.

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
| `onPress` | `Function` | required | Press callback |

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
| `movie` | `Object` | required | Movie metadata (`title`, `poster_path`, `vote_average`, `genre`, `duration`) |
| `onPress` | `Function` | `undefined` | Card tap callback |
| `onBookmark`| `Function` | `undefined` | Watchlist toggle callback |
| `isBookmarked`| `boolean` | `false` | Bookmark active status |
| `showBookmark`| `boolean` | `true` | Show/hide bookmark action |

---

## 5. Input

Accessible text input field with focused borders, leading/trailing icons, error indicators, helper text, and clear/password visibility buttons.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | `undefined` | Label above the field |
| `value` | `string` | required | Text value |
| `onChangeText` | `Function` | required | Value update callback |
| `placeholder` | `string` | `undefined` | Input placeholder |
| `error` | `string` | `undefined` | Error feedback message |
| `helperText` | `string` | `undefined` | Secondary guidance text |
| `clearable` | `boolean` | `false` | Shows clear button when text is present |
| `secureTextEntry` | `boolean` | `false` | Password toggle eye button |
| `disabled` | `boolean` | `false` | Read-only disabled state |

---

## 6. Chip

Selectable filter pill with min-height of 40pt (satisfying product requirements), rounded pill borders, leading icons, and haptic feedback.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | required | Chip label text |
| `selected` | `boolean` | `false` | Selected highlight state |
| `disabled` | `boolean` | `false` | Disabled state |
| `icon` | `ReactNode` | `undefined` | Leading icon |
| `onPress` | `Function` | `undefined` | Click callback |

---

## 7. Badge

Micro-tag for displaying operational status, ticket tiers, or notifications with optional dot indicator.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'primary' \| 'success' \| 'warning' \| 'error' \| 'neutral'` | `'primary'` | Semantic tone |
| `size` | `'sm' \| 'md'` | `'md'` | Badge scale |
| `dot` | `boolean` | `false` | Shows status indicator dot |
| `label` | `string` | `undefined` | Badge title |

---

## 8. BottomSheet

Spring-animated slide-up sheet modal with a darkened backdrop, drag handle indicator, header, and scrollable body.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `visible` | `boolean` | required | Modal visibility |
| `title` | `string` | `undefined` | Header title |
| `onClose` | `Function` | required | Dismiss callback |
| `maxHeight` | `number` | `0.85` | Fraction of device height |

---

## 9. Skeleton

Animated looping shimmer pulse loader matching container surface tokens for loading placeholders without layout shift.

### Sub-components
- `Skeleton.Box`: Configurable width, height, and border radius.
- `Skeleton.Circle`: Circular avatar and icon placeholder.
- `Skeleton.Text`: Text line skeleton.
- `Skeleton.Card`: Composite card skeleton.

---

## 10. Toast

Floating banner alert sliding down from the screen top with automatic timeout, dismiss button, and haptic alerts.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `visible` | `boolean` | required | Toast visibility |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | Alert status type |
| `title` | `string` | `undefined` | Optional title |
| `message` | `string` | required | Body message |
| `duration` | `number` | `3500` | Auto-dismiss ms (0 to disable) |
| `onDismiss` | `Function` | required | Dismiss callback |

---

## 11. EmptyState

Graceful error and empty condition container featuring thematic artwork/icons, prominent title, explanatory copy, and primary/secondary CTA actions.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `icon` | `string \| ReactNode` | `'film-outline'` | Ionicons name or custom element |
| `title` | `string` | required | Primary headline |
| `description`| `string` | required | Guidance copy |
| `actionLabel`| `string` | `undefined` | Primary button text |
| `onAction` | `Function` | `undefined` | Primary button callback |
| `secondaryActionLabel` | `string` | `undefined` | Secondary button text |
| `onSecondaryAction` | `Function` | `undefined` | Secondary button callback |

---

## 12. SeatMap

High-performance auditorium seating engine capable of smoothly rendering **300+ seats** with sub-millisecond selection response, memoized `SeatItem` components, cinema screen curvature, and comprehensive status representations.

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `seats` | `SeatData[]` | `300 generated seats` | Array of seat records (`id`, `row`, `col`, `status`, `price`) |
| `selectedSeatIds` | `string[]` | `[]` | Currently selected seat IDs |
| `onSeatToggle` | `Function` | required | Callback when a seat is tapped: `(seatId) => void` |
| `maxSelectable` | `number` | `8` | Maximum allowable seats selected |
| `showScreen` | `boolean` | `true` | Shows cinema screen/stage bar |
| `showLegend` | `boolean` | `true` | Shows visual state legend |

### Supported Seat States
- **Available**: Standard purchasable seat.
- **Selected**: User's chosen seat in brand violet.
- **Held**: Temporarily reserved by another concurrent transaction (amber outline, non-selectable).
- **Sold**: Permanently booked seat (dimmed, non-selectable).
- **Wheelchair Accessible (♿)**: Designated ADA-compliant seating with international symbol of access.
