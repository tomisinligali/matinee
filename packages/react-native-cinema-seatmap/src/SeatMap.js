import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const DEFAULT_THEME = {
  primary: '#8E44EB',
  onPrimary: '#FFFFFF',
  surface: '#0D0D12',
  surfaceContainer: '#1A1A24',
  surfaceContainerHigh: '#22222E',
  surfaceContainerLowest: '#16161E',
  onSurface: '#F4F4F8',
  onSurfaceMuted: '#ACACBE',
  outline: '#6E6E82',
  outlineVariant: '#30303E',
  warning: '#FBBF24',
  warningContainer: '#4B2D0A',
  onWarningContainer: '#FDE68A',
  info: '#60A5FA',
  infoContainer: '#193264',
  onInfoContainer: '#BFDBFE'
};

const SeatItem = React.memo(
  function SeatItem({ seat, isSelected, onPress, theme }) {
    const isSold = seat.status === 'sold';
    const isHeld = seat.status === 'held';
    const isWheelchair = seat.status === 'wheelchair';

    const handlePress = () => {
      if (isSold || isHeld) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (_) {}
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}

      onPress(seat.id);
    };

    let backgroundColor = theme.surfaceContainerLowest;
    let borderColor = theme.outlineVariant;
    let textColor = theme.onSurface;

    if (isSelected) {
      backgroundColor = theme.primary;
      borderColor = theme.primary;
      textColor = theme.onPrimary;
    } else if (isSold) {
      backgroundColor = theme.surfaceContainerHigh;
      borderColor = 'transparent';
      textColor = theme.outline;
    } else if (isHeld) {
      backgroundColor = theme.warningContainer;
      borderColor = theme.warning;
      textColor = theme.onWarningContainer;
    } else if (isWheelchair) {
      backgroundColor = theme.infoContainer;
      borderColor = theme.info;
      textColor = theme.onInfoContainer;
    }

    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isSold || isHeld}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4, left: 3, right: 3 }}
        style={[
          styles.seatBox,
          {
            backgroundColor,
            borderColor,
            opacity: isSold ? 0.35 : isHeld ? 0.85 : 1
          }
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seat.id}, ${isSold ? 'Sold' : isHeld ? 'Held' : isSelected ? 'Selected' : isWheelchair ? 'Wheelchair accessible' : 'Available'}`}
        accessibilityState={{ selected: isSelected, disabled: isSold || isHeld }}
      >
        {isWheelchair && !isSelected ? (
          <Ionicons name="accessibility" size={13} color={textColor} />
        ) : (
          <Text style={[styles.seatText, { color: textColor }]}>
            {seat.col}
          </Text>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.seat.status === next.seat.status &&
    prev.theme === next.theme
);

export function generateAuditoriumSeats(rowCount = 15, seatsPerRow = 20) {
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
  const seats = [];

  for (let r = 0; r < rowCount; r++) {
    const rowChar = rowLetters[r] || `R${r + 1}`;
    for (let c = 1; c <= seatsPerRow; c++) {
      const id = `${rowChar}${c}`;
      let status = 'available';

      if (r === 0 && (c <= 3 || c >= 18)) {
        status = 'wheelchair';
      } else if ((r === 4 && c >= 6 && c <= 14) || (r === 7 && c >= 8 && c <= 12)) {
        status = 'sold';
      } else if ((r === 5 && c === 4) || (r === 8 && c === 15)) {
        status = 'held';
      }

      seats.push({
        id,
        row: rowChar,
        col: c,
        status,
        price: r >= 10 ? 6000 : 4500
      });
    }
  }

  return seats;
}

export function CinemaSeatMap({
  seats,
  selectedSeatIds = [],
  onSeatToggle,
  maxSelectable = 8,
  showScreen = true,
  showLegend = true,
  theme = DEFAULT_THEME,
  style
}) {
  const seatList = useMemo(() => {
    return seats && seats.length > 0 ? seats : generateAuditoriumSeats(15, 20);
  }, [seats]);

  const rows = useMemo(() => {
    const rowMap = new Map();
    for (const seat of seatList) {
      if (!rowMap.has(seat.row)) rowMap.set(seat.row, []);
      rowMap.get(seat.row).push(seat);
    }
    return Array.from(rowMap.entries());
  }, [seatList]);

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const handleSeatPress = useCallback(
    (seatId) => {
      if (!selectedSet.has(seatId) && selectedSeatIds.length >= maxSelectable) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (_) {}
        return;
      }
      if (onSeatToggle) onSeatToggle(seatId);
    },
    [selectedSet, selectedSeatIds.length, maxSelectable, onSeatToggle]
  );

  return (
    <View style={[styles.container, style]}>
      {showScreen && (
        <View style={styles.screenStageWrapper}>
          <View style={[styles.curvedScreenBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.screenStageText, { color: theme.onSurfaceMuted }]}>
            CINEMA SCREEN / STAGE
          </Text>
        </View>
      )}

      <View style={styles.statsHeader}>
        <Text style={[styles.statsText, { color: theme.onSurfaceMuted }]}>
          Capacity: <Text style={{ fontWeight: '700', color: theme.onSurface }}>{seatList.length} Seats</Text>
        </Text>
        <Text style={[styles.statsText, { color: theme.primary, fontWeight: '600' }]}>
          Selected: {selectedSeatIds.length} / {maxSelectable} max
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.scrollGridContent}>
        <View style={styles.gridInner}>
          {rows.map(([rowName, rowSeats]) => (
            <View key={rowName} style={styles.rowWrapper}>
              <Text style={[styles.rowLabel, { color: theme.onSurfaceMuted }]}>{rowName}</Text>
              <View style={styles.seatsRow}>
                {rowSeats.map((seat) => (
                  <SeatItem
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSet.has(seat.id)}
                    onPress={handleSeatPress}
                    theme={theme}
                  />
                ))}
              </View>
              <Text style={[styles.rowLabel, { color: theme.onSurfaceMuted }]}>{rowName}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {showLegend && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant }]} />
            <Text style={[styles.legendText, { color: theme.onSurfaceMuted }]}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.primary, borderColor: theme.primary }]} />
            <Text style={[styles.legendText, { color: theme.onSurfaceMuted }]}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.warningContainer, borderColor: theme.warning }]} />
            <Text style={[styles.legendText, { color: theme.onSurfaceMuted }]}>Held</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.surfaceContainerHigh, borderColor: 'transparent', opacity: 0.4 }]} />
            <Text style={[styles.legendText, { color: theme.onSurfaceMuted }]}>Sold</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: theme.infoContainer, borderColor: theme.info }]}>
              <Ionicons name="accessibility" size={10} color={theme.onInfoContainer} />
            </View>
            <Text style={[styles.legendText, { color: theme.onSurfaceMuted }]}>Accessible</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center'
  },
  screenStageWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12
  },
  curvedScreenBar: {
    width: '80%',
    height: 4,
    borderRadius: 9999
  },
  screenStageText: {
    letterSpacing: 3,
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700'
  },
  statsHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8
  },
  statsText: {
    fontSize: 11
  },
  scrollGridContent: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  gridInner: {
    gap: 6
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  rowLabel: {
    width: 14,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 10
  },
  seatsRow: {
    flexDirection: 'row',
    gap: 5
  },
  seatBox: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  seatText: {
    fontSize: 9,
    fontWeight: '700'
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingHorizontal: 8
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  legendText: {
    fontSize: 10
  }
});

export default CinemaSeatMap;
