import React, { useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Typography, Shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

/**
 * @typedef {'available' | 'selected' | 'held' | 'sold' | 'wheelchair'} SeatStatus
 *
 * @typedef {Object} SeatData
 * @param {string} id Unique seat ID (e.g. 'A1', 'C14')
 * @param {string} row Row identifier ('A' through 'O')
 * @param {number} col Column number (1 through 20)
 * @param {SeatStatus} status Current allocation state
 * @param {number} [price=4500] Seat price in Naira
 */

const SCREEN_WIDTH = Dimensions.get('window').width;

// Memoized Individual Seat Button for 300+ Seat Scalability
const SeatItem = React.memo(
  function SeatItem({
    seat,
    isSelected,
    onPress,
    colors
  }) {
    const isSold = seat.status === 'sold';
    const isHeld = seat.status === 'held';
    const isWheelchair = seat.status === 'wheelchair';
    const isAvailable = seat.status === 'available' || isWheelchair;

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

    // Determine visual styling by state
    let backgroundColor = colors.surfaceContainerLowest;
    let borderColor = colors.outlineVariant;
    let textColor = colors.onSurface;

    if (isSelected) {
      backgroundColor = colors.primary;
      borderColor = colors.primary;
      textColor = colors.onPrimary;
    } else if (isSold) {
      backgroundColor = colors.surfaceContainerHigh;
      borderColor = 'transparent';
      textColor = colors.outline;
    } else if (isHeld) {
      backgroundColor = colors.warningContainer;
      borderColor = colors.warning;
      textColor = colors.onWarningContainer;
    } else if (isWheelchair) {
      backgroundColor = colors.infoContainer;
      borderColor = colors.info;
      textColor = colors.onInfoContainer;
    }

    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isSold || isHeld}
        activeOpacity={0.7}
        hitSlop={{ top: 4, bottom: 4, left: 3, right: 3 }} // Guarantees accessible touch area
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
        accessibilityLabel={`Seat ${seat.id}, ${isSold ? 'Sold' : isHeld ? 'Held by another buyer' : isSelected ? 'Selected' : isWheelchair ? 'Wheelchair accessible available' : 'Available'}`}
        accessibilityState={{
          selected: isSelected,
          disabled: isSold || isHeld
        }}
      >
        {isWheelchair && !isSelected ? (
          <Ionicons name="accessibility" size={13} color={textColor} />
        ) : (
          <Text
            variant="labelSmall"
            style={[styles.seatText, { color: textColor }]}
          >
            {seat.col}
          </Text>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.seat.status === next.seat.status &&
    prev.colors === next.colors
);

/**
 * Helper to generate a realistic 300-seat auditorium layout
 * 15 Rows (A to O) x 20 Seats per row = 300 Seats
 */
export function generateAuditoriumSeats(rowCount = 15, seatsPerRow = 20) {
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
  const seats = [];

  for (let r = 0; r < rowCount; r++) {
    const rowChar = rowLetters[r] || `R${r + 1}`;
    for (let c = 1; c <= seatsPerRow; c++) {
      const id = `${rowChar}${c}`;

      let status = 'available';

      // Designate wheelchair accessible seats in front row corners
      if (r === 0 && (c <= 3 || c >= 18)) {
        status = 'wheelchair';
      }
      // Designate some sold seats
      else if ((r === 4 && c >= 6 && c <= 14) || (r === 7 && c >= 8 && c <= 12) || (r === 10 && c >= 10 && c <= 16)) {
        status = 'sold';
      }
      // Designate some currently held seats
      else if ((r === 5 && c === 4) || (r === 8 && c === 15) || (r === 11 && c === 5)) {
        status = 'held';
      }

      seats.push({
        id,
        row: rowChar,
        col: c,
        status,
        price: r >= 10 ? 6000 : 4500 // Premium back rows
      });
    }
  }

  return seats;
}

/**
 * Matinee Scalable SeatMap Component
 *
 * Smoothly renders 300+ seats in an auditorium layout with:
 * - available
 * - selected
 * - held
 * - sold
 * - wheelchair-accessible states
 *
 * @param {Object} props
 * @param {SeatData[]} [props.seats] Array of seat records (defaults to 300 generated seats)
 * @param {string[]} [props.selectedSeatIds=[]] Array of selected seat IDs
 * @param {Function} props.onSeatToggle Callback when a seat is tapped: (seatId) => void
 * @param {number} [props.maxSelectable=8] Max seats a user can select simultaneously
 * @param {boolean} [props.showScreen=true] Shows/hides curved cinema screen banner
 * @param {boolean} [props.showLegend=true] Shows/hides seat state legend
 * @param {Object} [props.style] Additional wrapper styles
 */
export function SeatMap({
  seats,
  selectedSeatIds = [],
  onSeatToggle,
  maxSelectable = 8,
  showScreen = true,
  showLegend = true,
  style
}) {
  const { colors } = useTheme();

  // If no seats provided, fallback to the 300-seat auditorium layout
  const seatList = useMemo(() => {
    return seats && seats.length > 0 ? seats : generateAuditoriumSeats(15, 20);
  }, [seats]);

  // Group seats by row
  const rows = useMemo(() => {
    const rowMap = new Map();
    for (const seat of seatList) {
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, []);
      }
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
      if (onSeatToggle) {
        onSeatToggle(seatId);
      }
    },
    [selectedSet, selectedSeatIds.length, maxSelectable, onSeatToggle]
  );

  return (
    <View style={[styles.container, style]}>
      {/* Curved Screen Indicator */}
      {showScreen && (
        <View style={styles.screenStageWrapper}>
          <View
            style={[
              styles.curvedScreenBar,
              { backgroundColor: colors.primary }
            ]}
          />
          <Text
            variant="labelSmall"
            style={[styles.screenStageText, { color: colors.onSurfaceMuted }]}
          >
            CINEMA SCREEN / STAGE
          </Text>
        </View>
      )}

      {/* Seat Count Stats Header */}
      <View style={styles.statsHeader}>
        <Text variant="labelSmall" color="onSurfaceVariant">
          Capacity: <Text variant="labelSmall" style={{ fontWeight: '700' }}>{seatList.length} Seats</Text>
        </Text>
        <Text variant="labelSmall" color="primary">
          Selected: {selectedSeatIds.length} / {maxSelectable} max
        </Text>
      </View>

      {/* Horizontally and Vertically Scrollable Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollGridContent}
      >
        <View style={styles.gridInner}>
          {rows.map(([rowName, rowSeats]) => (
            <View key={rowName} style={styles.rowWrapper}>
              {/* Row Left Label */}
              <Text
                variant="labelSmall"
                style={[styles.rowLabel, { color: colors.onSurfaceMuted }]}
              >
                {rowName}
              </Text>

              {/* Row Seats */}
              <View style={styles.seatsRow}>
                {rowSeats.map((seat) => (
                  <SeatItem
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSet.has(seat.id)}
                    onPress={handleSeatPress}
                    colors={colors}
                  />
                ))}
              </View>

              {/* Row Right Label */}
              <Text
                variant="labelSmall"
                style={[styles.rowLabel, { color: colors.onSurfaceMuted }]}
              >
                {rowName}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend Footer */}
      {showLegend && (
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: colors.surfaceContainerLowest,
                  borderColor: colors.outlineVariant
                }
              ]}
            />
            <Text variant="labelSmall" color="onSurfaceVariant">
              Available
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
            />
            <Text variant="labelSmall" color="onSurfaceVariant">
              Selected
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: colors.warningContainer,
                  borderColor: colors.warning
                }
              ]}
            />
            <Text variant="labelSmall" color="onSurfaceVariant">
              Held
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: 'transparent',
                  opacity: 0.4
                }
              ]}
            />
            <Text variant="labelSmall" color="onSurfaceVariant">
              Sold
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                {
                  backgroundColor: colors.infoContainer,
                  borderColor: colors.info
                }
              ]}
            >
              <Ionicons name="accessibility" size={10} color={colors.onInfoContainer} />
            </View>
            <Text variant="labelSmall" color="onSurfaceVariant">
              Accessible
            </Text>
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
    marginBottom: Spacing.md
  },
  curvedScreenBar: {
    width: '80%',
    height: 4,
    borderRadius: BorderRadius.full,
    ...Shadows.medium
  },
  screenStageText: {
    letterSpacing: 3,
    marginTop: Spacing.xxs,
    fontSize: 9,
    fontWeight: '700'
  },
  statsHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm
  },
  scrollGridContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
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
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default SeatMap;
