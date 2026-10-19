import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme/tokens';

const SEAT_ROWS = ['A', 'B', 'C', 'D'];
const SEATS_PER_ROW = [1, 2, 3, 4, 5, 6, 7, 8];
const TICKET_PRICE = 4500; // ₦4,500 per seat

// Initial occupied seats for realistic realism
const OCCUPIED_SEATS = new Set(['A3', 'A4', 'B5', 'B6', 'C1', 'C2']);

function SeatButton({ seatId, status, isSelected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (status === 'occupied') return;

    // Trigger spring bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();

    // Haptic light tap
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    onPress(seatId);
  };

  const isOccupied = status === 'occupied';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.seatBox,
          isOccupied && styles.seatOccupied,
          isSelected && styles.seatSelected
        ]}
        onPress={handlePress}
        disabled={isOccupied}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seatId}, ${isOccupied ? 'Occupied' : isSelected ? 'Selected' : 'Available, ₦4,500'}`}
        accessibilityState={{ selected: isSelected, disabled: isOccupied }}
      >
        <Text
          style={[
            styles.seatNumber,
            isOccupied && styles.seatNumberOccupied,
            isSelected && styles.seatNumberSelected
          ]}
        >
          {seatId}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SeatSelectionModal({ visible, movie, onClose, onBookingSuccess }) {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedSeats([]);
      setConfirmed(false);
      checkmarkScale.setValue(0);
    }
  }, [visible]);

  const toggleSeat = (seatId) => {
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    const ref = `MTN-${Math.floor(1000 + Math.random() * 9000)}-LKK`;
    setBookingRef(ref);
    setConfirmed(true);

    // Spring celebration animation
    Animated.spring(checkmarkScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true
    }).start();

    // Success notification haptic
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    if (onBookingSuccess) {
      onBookingSuccess({
        bookingRef: ref,
        movieTitle: movie?.title || 'Selected Screening',
        seats: selectedSeats.join(', '),
        totalAmount: selectedSeats.length * TICKET_PRICE
      });
    }
  };

  const totalAmount = selectedSeats.length * TICKET_PRICE;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close seat selection"
          >
            <Ionicons name="close" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerSub}>CHOOSE SEATS</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {movie?.title || 'Movie Screening'}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {!confirmed ? (
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Cinema Screen Curved Bar */}
            <View style={styles.screenStageWrapper}>
              <View style={styles.curvedScreenBar} />
              <Text style={styles.screenStageText}>AUDITORIUM SCREEN</Text>
            </View>

            {/* Seating Grid */}
            <View style={styles.gridWrapper}>
              {SEAT_ROWS.map(row => (
                <View key={row} style={styles.rowWrapper}>
                  <Text style={styles.rowLabel}>{row}</Text>
                  <View style={styles.rowSeats}>
                    {SEATS_PER_ROW.map(num => {
                      const seatId = `${row}${num}`;
                      const isOccupied = OCCUPIED_SEATS.has(seatId);
                      const isSelected = selectedSeats.includes(seatId);
                      return (
                        <SeatButton
                          key={seatId}
                          seatId={seatId}
                          status={isOccupied ? 'occupied' : 'available'}
                          isSelected={isSelected}
                          onPress={toggleSeat}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.rowLabel}>{row}</Text>
                </View>
              ))}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendAvailable]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendSelected]} />
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendOccupied]} />
                <Text style={styles.legendText}>Occupied</Text>
              </View>
            </View>

            {/* Pricing & Selection Bottom Bar */}
            <View style={styles.bookingFooter}>
              <View style={styles.footerInfo}>
                <Text style={styles.footerLabel}>
                  {selectedSeats.length > 0
                    ? `${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''} (${selectedSeats.join(', ')})`
                    : 'No Seats Selected'}
                </Text>
                <Text style={styles.footerPrice}>
                  ₦{totalAmount.toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, selectedSeats.length === 0 && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={selectedSeats.length === 0}
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={
                  selectedSeats.length > 0
                    ? `Confirm Booking for ${selectedSeats.length} seats, total ₦${totalAmount.toLocaleString()}`
                    : 'Confirm Booking (select seats first)'
                }
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.onPrimary} style={{ marginRight: Spacing.xs }} />
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Celebratory Confirmation Screen */
          <View style={styles.confirmationContainer}>
            <Animated.View style={[styles.celebrationCircle, { transform: [{ scale: checkmarkScale }] }]}>
              <Ionicons name="checkmark-done" size={54} color={Colors.onPrimary} />
            </Animated.View>

            <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
            <Text style={styles.confirmedSubtitle}>
              Your seats have been securely reserved at Filmhouse Cinemas Lekki.
            </Text>

            <View style={styles.ticketSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>FILM</Text>
                <Text style={styles.summaryValue}>{movie?.title}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SEATS</Text>
                <Text style={[styles.summaryValue, { color: Colors.primary, fontWeight: '700' }]}>
                  {selectedSeats.join(', ')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>BOOKING REF</Text>
                <Text style={styles.summaryValue}>{bookingRef}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TOTAL PAID</Text>
                <Text style={styles.summaryValue}>₦{totalAmount.toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="View digital pass and close"
            >
              <Text style={styles.doneBtnText}>View My Digital Pass</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1
  },
  headerSub: {
    ...Typography.labelSmall,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700'
  },
  headerTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginTop: 2
  },
  scrollBody: {
    padding: Spacing.lg,
    alignItems: 'center'
  },
  screenStageWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm
  },
  curvedScreenBar: {
    width: '85%',
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    ...Shadows.medium
  },
  screenStageText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85,
    letterSpacing: 3,
    marginTop: Spacing.xs,
    fontSize: 10
  },
  gridWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  rowLabel: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85,
    width: 16,
    textAlign: 'center',
    fontWeight: '700'
  },
  rowSeats: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xs
  },
  seatBox: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center'
  },
  seatSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  seatOccupied: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderColor: 'transparent',
    opacity: 0.4
  },
  seatNumber: {
    fontSize: 9,
    color: Colors.onSurface,
    fontWeight: '700'
  },
  seatNumberSelected: {
    color: Colors.onPrimary
  },
  seatNumberOccupied: {
    color: Colors.outline
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.xs
  },
  legendAvailable: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant
  },
  legendSelected: {
    backgroundColor: Colors.primary
  },
  legendOccupied: {
    backgroundColor: Colors.surfaceContainerHigh,
    opacity: 0.4
  },
  legendText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  bookingFooter: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.soft
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  footerLabel: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    fontWeight: '600'
  },
  footerPrice: {
    ...Typography.titleLarge,
    color: Colors.primary,
    fontWeight: '700'
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48
  },
  confirmBtnDisabled: {
    opacity: 0.5
  },
  confirmBtnText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
    fontWeight: '700'
  },

  // Confirmation View Styles
  confirmationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl
  },
  celebrationCircle: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.hard
  },
  confirmedTitle: {
    ...Typography.headlineMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center'
  },
  confirmedSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl
  },
  ticketSummaryCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.xl,
    gap: Spacing.sm
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryLabel: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  summaryValue: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    fontWeight: '600'
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  doneBtnText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
    fontWeight: '700'
  }
});
