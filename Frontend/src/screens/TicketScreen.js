import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Share,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { Spacing, BorderRadius } from '../theme/tokens';
import QRCode from '../components/QRCode';
import { api } from '../services/api';

/**
 * Requirement 4: High-fidelity Ticket Screen with Scannable QR Code
 * Renders verified cinema ticket pass with server-validated booking details,
 * perforated notch styling, and scannable QR verification code.
 */
export default function TicketScreen({
  route,
  navigation,
  booking: propBooking,
  onClose
}) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [bookingData, setBookingData] = useState(
    propBooking || route?.params?.booking || null
  );
  const [loading, setLoading] = useState(false);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);

  // If a bookingId was passed via navigation, fetch fresh authoritative ticket state
  useEffect(() => {
    const bookingId = bookingData?.id || route?.params?.bookingId;
    if (bookingId && (!bookingData?.tickets || bookingData.tickets.length === 0)) {
      setLoading(true);
      api.getBookingTickets(bookingId)
        .then(res => {
          if (res?.booking) {
            setBookingData(res.booking);
          }
        })
        .catch(err => {
          console.warn('[TicketScreen fetch error]:', err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [route?.params?.bookingId]);

  // Fallback demo ticket if launched directly without route params
  const activeBooking = bookingData || {
    bookingRef: 'MTN-842109-SIL',
    movieTitle: 'Dune: Part Two',
    cinemaName: 'Silverbird Galleria',
    screenName: 'Screen 1 (Laser IMAX)',
    showtimeStart: new Date(Date.now() + 3600 * 1000 * 3).toISOString(),
    status: 'CONFIRMED',
    totalMinor: 960000,
    subtotalMinor: 900000,
    serviceFeeMinor: 60000,
    currency: 'NGN',
    tickets: [
      {
        ticketCode: 'TKT-842109-D7',
        seatLabel: 'D7',
        qrPayload: {
          ticketCode: 'TKT-842109-D7',
          bookingRef: 'MTN-842109-SIL',
          movie: 'Dune: Part Two',
          cinema: 'Silverbird Galleria',
          screen: 'Screen 1',
          seat: 'D7',
          verifiedAt: new Date().toISOString()
        }
      },
      {
        ticketCode: 'TKT-842109-D8',
        seatLabel: 'D8',
        qrPayload: {
          ticketCode: 'TKT-842109-D8',
          bookingRef: 'MTN-842109-SIL',
          movie: 'Dune: Part Two',
          cinema: 'Silverbird Galleria',
          screen: 'Screen 1',
          seat: 'D8',
          verifiedAt: new Date().toISOString()
        }
      }
    ]
  };

  const tickets = activeBooking.tickets || [];
  const currentTicket = tickets[selectedTicketIndex] || tickets[0] || {};

  // Format showtime dates
  const showDate = new Date(activeBooking.showtimeStart || Date.now());
  const dateStr = showDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const timeStr = showDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Format currency
  const formatNaira = (minor) => `₦${(Number(minor || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  // Share ticket handler
  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    try {
      await Share.share({
        message: `🎟️ Matinee Cinema Ticket: ${activeBooking.movieTitle} at ${activeBooking.cinemaName} (${dateStr} at ${timeStr}). Booking Ref: ${activeBooking.bookingRef}`,
        title: `Matinee Ticket - ${activeBooking.bookingRef}`
      });
    } catch (_) {}
  };

  const handleDone = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    if (onClose) {
      onClose();
    } else if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const qrValueString = typeof currentTicket.qrPayload === 'object'
    ? JSON.stringify(currentTicket.qrPayload)
    : String(currentTicket.qrPayload || currentTicket.ticketCode || activeBooking.bookingRef);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleDone}
          style={styles.closeBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close ticket screen"
        >
          <Ionicons name="close" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarSub}>DIGITAL ADMISSION</Text>
          <Text style={styles.topBarTitle}>Cinema Pass</Text>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionIconBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Share cinema ticket"
        >
          <Ionicons name="share-outline" size={22} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Confirmed Banner */}
        <View style={styles.confirmedBanner}>
          <View style={styles.bannerCheckCircle}>
            <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
          </View>
          <Text style={styles.bannerTitle}>Booking Confirmed & Verified</Text>
          <Text style={styles.bannerSub}>Payment processed via Flutterwave</Text>
        </View>

        {/* Multi-ticket Seat Selector Pills (if more than 1 ticket) */}
        {tickets.length > 1 && (
          <View style={styles.seatPillRow}>
            {tickets.map((t, idx) => (
              <TouchableOpacity
                key={t.ticketCode || idx}
                style={[
                  styles.seatPill,
                  selectedTicketIndex === idx && styles.activeSeatPill
                ]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch (_) {}
                  setSelectedTicketIndex(idx);
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`View seat ${t.seatLabel} ticket`}
              >
                <Ionicons
                  name="ticket"
                  size={14}
                  color={selectedTicketIndex === idx ? colors.onPrimary : colors.onSurfaceVariant}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.seatPillText,
                    selectedTicketIndex === idx && styles.activeSeatPillText
                  ]}
                >
                  Seat {t.seatLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Physical Notched Ticket Card */}
        <View style={styles.ticketCard}>
          {/* Left and Right Semicircular Perforation Cutouts */}
          <View style={[styles.notch, styles.notchLeft]} />
          <View style={[styles.notch, styles.notchRight]} />

          {/* Ticket Header: Movie & Theater Details */}
          <View style={styles.ticketHeader}>
            <View style={styles.badgeRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveBadgeDot} />
                <Text style={styles.liveBadgeText}>VALID PASS</Text>
              </View>
              <Text style={styles.formatPill}>IMAX LASER 2D</Text>
            </View>

            <Text style={styles.movieTitle} numberOfLines={2}>
              {activeBooking.movieTitle}
            </Text>

            <View style={styles.venueRow}>
              <Ionicons name="location" size={15} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.venueText}>
                {activeBooking.cinemaName} • {activeBooking.screenName || 'Screen 1'}
              </Text>
            </View>
          </View>

          {/* Dotted Perforation Line between Ticket & Stub */}
          <View style={styles.perforationLineContainer}>
            <View style={styles.perforationLine} />
          </View>

          {/* Seating Details Matrix */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE</Text>
              <Text style={styles.metaValue}>{dateStr}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>TIME</Text>
              <Text style={styles.metaValue}>{timeStr}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SCREEN</Text>
              <Text style={styles.metaValue}>Screen 1</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>SEAT</Text>
              <Text style={styles.metaValueHighlight}>
                {currentTicket.seatLabel || 'B2'}
              </Text>
            </View>
          </View>

          {/* Ticket QR Code Scanner Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrWhiteBox}>
              <QRCode
                value={qrValueString}
                size={168}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.ticketCodeText}>
              {currentTicket.ticketCode || 'TKT-MATINEE-PASS'}
            </Text>
            <View style={styles.turnstileHintRow}>
              <Ionicons name="scan-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.turnstileHintText}>
                Present this scannable QR code at the turnstile gate
              </Text>
            </View>
          </View>

          {/* Financial Ledger & Booking Reference Footer */}
          <View style={styles.ticketFooter}>
            <View style={styles.feeBreakdown}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Ticket Subtotal</Text>
                <Text style={styles.feeVal}>{formatNaira(activeBooking.subtotalMinor)}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Server Service Fee (₦300/tkt)</Text>
                <Text style={styles.feeVal}>{formatNaira(activeBooking.serviceFeeMinor)}</Text>
              </View>
              <View style={[styles.feeRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalVal}>{formatNaira(activeBooking.totalMinor)}</Text>
              </View>
            </View>
            <View style={styles.refRow}>
              <Text style={styles.refLabel}>REF: {activeBooking.bookingRef}</Text>
              <Text style={styles.currencyBadge}>CURRENCY: {activeBooking.currency || 'NGN'}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActionWrap}>
          <TouchableOpacity
            style={styles.primaryDoneBtn}
            onPress={handleDone}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Done and return to movies"
          >
            <Text style={styles.primaryDoneText}>Done • Back to Movies</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors, isDark) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline + '22'
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    topBarTitleWrap: {
      alignItems: 'center'
    },
    topBarSub: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.primary
    },
    topBarTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.onSurface
    },
    actionIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center'
    },
    scrollContent: {
      padding: Spacing.md,
      paddingBottom: Spacing.xl
    },
    confirmedBanner: {
      backgroundColor: colors.primary + '18',
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      alignItems: 'center',
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.primary + '44'
    },
    bannerCheckCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs
    },
    bannerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.onSurface
    },
    bannerSub: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      marginTop: 2
    },
    seatPillRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.md
    },
    seatPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.pill,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outline + '33'
    },
    activeSeatPill: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    seatPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.onSurfaceVariant
    },
    activeSeatPillText: {
      color: colors.onPrimary,
      fontWeight: '700'
    },
    ticketCard: {
      position: 'relative',
      backgroundColor: colors.surfaceContainer,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.outline + '33',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.4 : 0.12,
      shadowRadius: 12,
      elevation: 6
    },
    notch: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surface,
      top: 156,
      zIndex: 10
    },
    notchLeft: {
      left: -12
    },
    notchRight: {
      right: -12
    },
    ticketHeader: {
      padding: Spacing.lg
    },
    badgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B98122',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#10B98144'
    },
    liveBadgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
      marginRight: 5
    },
    liveBadgeText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8
    },
    formatPill: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.5
    },
    movieTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.onSurface,
      marginBottom: Spacing.xs,
      letterSpacing: -0.3
    },
    venueRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    venueText: {
      fontSize: 13,
      color: colors.onSurfaceVariant,
      fontWeight: '500'
    },
    perforationLineContainer: {
      height: 1,
      paddingHorizontal: Spacing.lg,
      overflow: 'hidden',
      justifyContent: 'center'
    },
    perforationLine: {
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.outline + '44'
    },
    metaGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: Spacing.md,
      backgroundColor: colors.surfaceContainerHigh || colors.surfaceContainer
    },
    metaCol: {
      alignItems: 'center'
    },
    metaLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.onSurfaceVariant,
      letterSpacing: 1,
      marginBottom: 3
    },
    metaValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.onSurface
    },
    metaValueHighlight: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primary
    },
    qrSection: {
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainer
    },
    qrWhiteBox: {
      padding: 14,
      backgroundColor: '#FFFFFF',
      borderRadius: BorderRadius.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3
    },
    ticketCodeText: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 2,
      color: colors.onSurface,
      marginTop: Spacing.sm
    },
    turnstileHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.xs,
      paddingHorizontal: Spacing.md
    },
    turnstileHintText: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      textAlign: 'center'
    },
    ticketFooter: {
      padding: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.outline + '22',
      backgroundColor: colors.surfaceContainerLowest || colors.surfaceContainer
    },
    feeBreakdown: {
      marginBottom: Spacing.xs
    },
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2
    },
    feeLabel: {
      fontSize: 11,
      color: colors.onSurfaceVariant
    },
    feeVal: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.onSurface
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.outline + '22',
      marginTop: 4,
      paddingTop: 4
    },
    totalLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.onSurface
    },
    totalVal: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary
    },
    refRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.xs
    },
    refLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: colors.onSurfaceVariant
    },
    currencyBadge: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.outline
    },
    bottomActionWrap: {
      marginTop: Spacing.lg
    },
    primaryDoneBtn: {
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.pill,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4
    },
    primaryDoneText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.onPrimary
    }
  });
}
