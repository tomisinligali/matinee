# @matinee/react-native-cinema-seatmap

A high-performance, accessible, and lightweight cinema & auditorium seat map component for React Native.

Built to render **300+ seats** at a fluid 60 FPS with sub-millisecond selection response, memoized virtual rendering, tactile haptic feedback, and comprehensive ADA accessibility.

---

## Features

- 🚀 **Scalable Performance**: Easily handles 300+ seat auditoriums without frame drops or memory bloat using fine-grained `React.memo` seat items.
- ♿ **ADA Accessibility**: Built-in support for wheelchair-accessible seating with the International Symbol of Access (ISA).
- 🎨 **5 Seat States**:
  - `available`: Open for booking.
  - `selected`: Chosen by the current user with spring bounce animation.
  - `held`: Reserved in a concurrent transaction with live hold timer.
  - `sold`: Permanently booked.
  - `wheelchair`: ADA-designated priority space.
- 📳 **Tactile Haptic Feedback**: Integrated light impacts on selection and warning vibration on unavailable seat taps.
- 📐 **Cinema Screen Simulation**: Curved overhead projection screen representation with stage acoustics line.
- 🌓 **Theme Agnostic**: Works out of the box with custom dark and light themes.

---

## Installation

```bash
npm install @matinee/react-native-cinema-seatmap
# or
yarn add @matinee/react-native-cinema-seatmap
```

### Peer Dependencies
Ensure you have `@expo/vector-icons` and `expo-haptics` installed in your project:

```bash
npx expo install @expo/vector-icons expo-haptics
```

---

## Quick Start

```jsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CinemaSeatMap, generateAuditoriumSeats } from '@matinee/react-native-cinema-seatmap';

export default function BookingScreen() {
  const [selectedSeatIds, setSelectedSeatIds] = useState(['C10', 'C11']);

  const handleSeatToggle = (seatId) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId]
    );
  };

  return (
    <View style={styles.container}>
      <CinemaSeatMap
        selectedSeatIds={selectedSeatIds}
        onSeatToggle={handleSeatToggle}
        maxSelectable={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
    justifyContent: 'center',
    padding: 16
  }
});
```

---

## API Reference

### Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `seats` | `SeatData[]` | `300 seats (15x20)` | Custom seat inventory array. If omitted, generates a 300-seat layout. |
| `selectedSeatIds` | `string[]` | `[]` | Array of currently selected seat IDs (e.g. `['A1', 'C14']`). |
| `onSeatToggle` | `(seatId: string) => void` | **required** | Callback when a seat is clicked. |
| `maxSelectable` | `number` | `8` | Maximum allowable concurrent selections. |
| `showScreen` | `boolean` | `true` | Toggles the overhead curved cinema screen indicator. |
| `showLegend` | `boolean` | `true` | Toggles the bottom state legend. |
| `theme` | `Object` | `Matinee Dark` | Custom semantic color palette. |
| `style` | `ViewStyle` | `undefined` | Container styling. |

### `SeatData` Object Structure

```typescript
interface SeatData {
  id: string; // e.g. 'A1'
  row: string; // e.g. 'A'
  col: number; // e.g. 1
  status: 'available' | 'selected' | 'held' | 'sold' | 'wheelchair';
  price?: number;
}
```

---

## License

MIT © Matinee Engineering
