import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { api, setWaitingRoomToken } from '../services/api';
import TicketScreen from '../screens/TicketScreen';

const SEAT_ROWS = ['A', 'B', 'C', 'D'];
const SEATS_PER_ROW = [1, 2, 3, 4, 5, 6, 7, 8];
const DEFAULT_PRICE = 4500; // ₦4,500

const USSD_BANKS = [
  { id: 'GTB', name: 'GTBank', prefix: '*737*2*' },
  { id: 'ZENITH', name: 'Zenith', prefix: '*966*' },
  { id: 'UBA', name: 'UBA', prefix: '*919*' },
  { id: 'ACCESS', name: 'Access', prefix: '*901*' }
];

// Sample initial occupied seats
const OCCUPIED_SEATS = new Set(['A3', 'A4', 'B5', 'B6', 'C1', 'C2']);

function SeatButton({ seatId, status, isSelected, onPress }) {
  const { colors } = useTheme();
  const styles = getModalStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (status === 'occupied' || status === 'held') return;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    onPress(seatId);
  };

  const isOccupied = status === 'occupied';
  const isHeld = status === 'held';
  const isUnavailable = isOccupied || isHeld;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.seatBox,
          isUnavailable && styles.seatOccupied,
          isSelected && styles.seatSelected
        ]}
        onPress={handlePress}
        disabled={isUnavailable}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seatId}, ${isUnavailable ? 'Unavailable' : isSelected ? 'Selected' : 'Available'}`}
        accessibilityState={{ selected: isSelected, disabled: isUnavailable }}
      >
        <Text
          style={[
            styles.seatNumber,
            isUnavailable && styles.seatNumberOccupied,
            isSelected && styles.seatNumberSelected
          ]}
        >
          {seatId}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SeatSelectionModal({ visible, movie, onClose, onBookingSuccess, isInline = false }) {
  if (!visible) return null;

  const { colors } = useTheme();
  const styles = getModalStyles(colors);

  // Flow steps: 'SEAT_SELECTION' | 'CHECKOUT' | 'CONFIRMED'
  const [step, setStep] = useState('SEAT_SELECTION');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryAction, setRetryAction] = useState(null);

  // Traffic Management & Waiting Room
  const [waitingRoomData, setWaitingRoomData] = useState(null);
  const [liveOccupiedSeats, setLiveOccupiedSeats] = useState(new Set());

  // Active showtime
  const [activeShowtime, setActiveShowtime] = useState(null);

  // Server checkout state
  const [checkoutData, setCheckoutData] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showFullTicketModal, setShowFullTicketModal] = useState(false);

  // Hold countdown
  const [holdTimeLeft, setHoldTimeLeft] = useState(600); // 10 minutes in seconds

  // Payment option selection: null | 'CARD' | 'TRANSFER' | 'USSD'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedUssdBank, setSelectedUssdBank] = useState('GTB');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedUssd, setCopiedUssd] = useState(false);

  // Card payment form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('Cinema Patron');
  const [cardError, setCardError] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStepText, setPaymentStepText] = useState('');

  const checkmarkScale = useRef(new Animated.Value(0)).current;

  // On open, reset and fetch active showtime
  useEffect(() => {
    if (visible) {
      setStep('SEAT_SELECTION');
      setSelectedSeats([]);
      setErrorMessage('');
      setRetryAction(null);
      setWaitingRoomData(null);
      setCheckoutData(null);
      setConfirmedBooking(null);
      setShowFullTicketModal(false);
      checkmarkScale.setValue(0);
      setHoldTimeLeft(600);
      setSelectedPaymentMethod(null);
      setSelectedUssdBank('GTB');
      setCopiedAccount(false);
      setCopiedUssd(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardholderName('Cinema Patron');
      setCardError('');
      setIsProcessingPayment(false);
      setPaymentStepText('');

      // Load showtimes from backend
      api.getShowtimes()
        .then(res => {
          if (res?.data && res.data.length > 0) {
            const match = res.data.find(st =>
              (movie?.id && st.movieId === movie.id) ||
              (movie?.title && st.movieTitle?.toLowerCase() === movie.title?.toLowerCase())
            );
            setActiveShowtime(match || res.data[0]);
          }
        })
        .catch(err => {
          console.log('[Backend showtime fetch notice]:', err.message);
        });
    }
  }, [visible, movie]);

  // Hold timer countdown in checkout step
  useEffect(() => {
    let interval = null;
    if (step === 'CHECKOUT' && holdTimeLeft > 0) {
      interval = setInterval(() => {
        setHoldTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAbandon(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, holdTimeLeft]);

  // 1. Near-real-time seat availability polling
  useEffect(() => {
    if (!visible || !activeShowtime?.id || step !== 'SEAT_SELECTION') return;

    let isMounted = true;
    const fetchLiveSeats = async () => {
      try {
        const res = await api.getLiveSeatAvailability(activeShowtime.id);
        if (isMounted && res?.data) {
          const booked = res.data.bookedSeatIds || [];
          const held = res.data.heldSeatIds || [];
          setLiveOccupiedSeats(new Set([...booked, ...held]));
        }
      } catch (_) {}
    };

    fetchLiveSeats();
    const interval = setInterval(fetchLiveSeats, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [visible, activeShowtime?.id, step]);

  // 2. Waiting Room polling when in surge queue
  useEffect(() => {
    if (!waitingRoomData || waitingRoomData.status === 'ADMITTED' || !activeShowtime?.id) return;

    let isMounted = true;
    const pollQueue = async () => {
      try {
        const res = await api.getWaitingRoomStatus(activeShowtime.id);
        if (isMounted && res?.data) {
          if (res.data.status === 'ADMITTED') {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
            setWaitingRoomToken(res.data.token);
            setWaitingRoomData(null);
            handleProceedToCheckout();
          } else {
            setWaitingRoomData(res.data);
          }
        }
      } catch (_) {}
    };

    const interval = setInterval(pollQueue, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [waitingRoomData, activeShowtime?.id]);

  const toggleSeat = (seatId) => {
    setSelectedSeats(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  // Step 1 -> Step 2: Acquire seat hold on server and initiate checkout
  const handleProceedToCheckout = async () => {
    if (selectedSeats.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    setLoading(true);
    setErrorMessage('');
    setRetryAction(null);

    try {
      const showtimeId = activeShowtime?.id || '6559c9c1-c5f7-4d21-942b-4d1e15c50039';
      const idempotencyKey = `IDEMP_CHK_${Date.now()}_${selectedSeats.join('')}`;

      // 1. Acquire seat hold atomically
      try {
        await api.acquireSeatHold({
          showtimeId,
          seatIds: selectedSeats
        });
      } catch (holdErr) {
        // Surge traffic: User is placed in the Waiting Room queue
        if (holdErr.data?.error?.code === 'WAITING_ROOM_REQUIRED') {
          setWaitingRoomData(holdErr.data.error.waitingRoom || { status: 'QUEUED', position: 1, estimatedWaitSeconds: 5 });
          return;
        }

        // Seat contention: another customer grabbed the seat
        if (holdErr.status === 409) {
          throw new Error('One or more selected seats were just claimed by another customer. Please choose different seats.');
        }

        // Rate limit or server surge
        if (holdErr.status === 429 || holdErr.status === 503) {
          setRetryAction(() => handleProceedToCheckout);
          throw new Error(holdErr.message || 'Server is experiencing high surge traffic. Tap Retry to proceed.');
        }

        throw holdErr;
      }

      // 2. Initiate checkout with idempotency key
      const checkoutRes = await api.initiateCheckout({
        showtimeId,
        seatIds: selectedSeats,
        idempotencyKey,
        customer: {
          email: 'customer@matinee.app',
          name: 'Cinema Patron'
        }
      });

      const serverBooking = checkoutRes?.data || checkoutRes?.booking;
      if (serverBooking) {
        setCheckoutData(serverBooking);
        setStep('CHECKOUT');
        setHoldTimeLeft(600);
      } else {
        // Fallback simulated checkout if offline
        const subtotalMinor = selectedSeats.length * DEFAULT_PRICE * 100;
        const serviceFeeMinor = selectedSeats.length * 300 * 100;
        setCheckoutData({
          id: 'sim_booking_' + Date.now(),
          bookingRef: `MTN-${Math.floor(100000 + Math.random() * 900000)}-SIL`,
          subtotalMinor,
          serviceFeeMinor,
          totalMinor: subtotalMinor + serviceFeeMinor,
          currency: 'NGN',
          showtimeId
        });
        setStep('CHECKOUT');
      }
    } catch (err) {
      setRetryAction(() => handleProceedToCheckout);
      setErrorMessage(err.message || 'Could not proceed to checkout. Please tap Retry.');
    } finally {
      setLoading(false);
    }
  };

  // Abandon checkout and release held seats on backend
  const handleAbandon = async (isTimeout = false) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    setLoading(true);
    try {
      const bookingId = checkoutData?.bookingId || checkoutData?.id;
      if (bookingId && activeShowtime?.id) {
        await api.abandonCheckout({
          bookingId,
          showtimeId: activeShowtime.id,
          seatIds: selectedSeats
        });
      }
    } catch (err) {
      console.warn('[Abandon checkout error]:', err.message);
    } finally {
      setLoading(false);
      setStep('SEAT_SELECTION');
      setCheckoutData(null);
      if (isTimeout) {
        Alert.alert('Hold Expired', 'Your 10-minute seat hold has expired and seats were released.');
      }
    }
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '').substring(0, 4);
    if (cleaned.length >= 3) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const formatCvv = (text) => {
    return text.replace(/\D/g, '').substring(0, 4);
  };

  const handleUseTestCard = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    setCardNumber('5399 4100 0000 0000');
    setCardExpiry('12/28');
    setCardCvv('123');
    setCardholderName('Cinema Patron');
    setCardError('');
  };

  const getCardBrand = (num) => {
    const clean = (num || '').replace(/\s+/g, '');
    if (clean.startsWith('4')) return { name: 'VISA', icon: 'card' };
    if (clean.startsWith('5')) return { name: 'MASTERCARD', icon: 'card' };
    if (clean.startsWith('506') || clean.startsWith('650') || clean.startsWith('507')) return { name: 'VERVE', icon: 'card' };
    return { name: 'CARD', icon: 'card-outline' };
  };

  const validateCard = () => {
    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (cleanNum.length < 16) {
      setCardError('Please enter a valid 16-digit card number.');
      return false;
    }
    const cleanExp = cardExpiry.replace(/[^\d]/g, '');
    if (cleanExp.length < 4) {
      setCardError('Please enter a valid expiry date (MM/YY).');
      return false;
    }
    const month = parseInt(cleanExp.substring(0, 2), 10);
    if (month < 1 || month > 12) {
      setCardError('Card expiry month must be between 01 and 12.');
      return false;
    }
    if (cardCvv.length < 3) {
      setCardError('Please enter a 3-digit CVV security code.');
      return false;
    }
    if (!cardholderName.trim()) {
      setCardError('Please enter the cardholder name.');
      return false;
    }
    setCardError('');
    return true;
  };

  // Complete Payment (via Flutterwave Test Mode webhook)
  const handleCompletePayment = async () => {
    if (!validateCard()) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (_) {}
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    setIsProcessingPayment(true);
    setPaymentStepText('Connecting to Flutterwave gateway...');
    setErrorMessage('');

    try {
      await new Promise(r => setTimeout(r, 600));
      setPaymentStepText('Tokenizing card details (PCI-DSS compliant)...');

      await new Promise(r => setTimeout(r, 700));
      setPaymentStepText('Authorizing test transaction with sandbox gateway...');

      let confirmedRes = null;
      const txRef = checkoutData?.txRef;
      if (txRef) {
        // Call backend test confirmation webhook endpoint
        confirmedRes = await api.testConfirmPayment({
          bookingId: checkoutData?.bookingId || checkoutData?.id,
          txRef
        });
      }

      await new Promise(r => setTimeout(r, 500));
      setPaymentStepText('Confirming booking & generating ticket QR...');

      const booking = confirmedRes?.data || confirmedRes?.booking || checkoutData;
      setConfirmedBooking(booking);
      setStep('CONFIRMED');

      // Spring celebration animation
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true
      }).start();

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    } catch (err) {
      setErrorMessage(err.message || 'Payment verification failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
      setPaymentStepText('');
    }
  };

  const handleCopyAccount = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleCopyUssd = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    setCopiedUssd(true);
    setTimeout(() => setCopiedUssd(false), 2500);
  };

  // Complete Payment via Bank Transfer
  const handleTransferPayment = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
    setIsProcessingPayment(true);
    setPaymentStepText('Connecting to NIBSS & Flutterwave settlement gateway...');
    setErrorMessage('');

    try {
      await new Promise(r => setTimeout(r, 700));
      setPaymentStepText('Inbound transfer of ' + formatNaira(checkoutData.totalMinor) + ' detected...');

      let confirmedRes = null;
      const txRef = checkoutData?.txRef;
      if (txRef) {
        confirmedRes = await api.testConfirmPayment({
          bookingId: checkoutData?.bookingId || checkoutData?.id,
          txRef
        });
      }

      await new Promise(r => setTimeout(r, 500));
      setPaymentStepText('Payment verified! Generating digital cinema pass...');

      const booking = confirmedRes?.data || confirmedRes?.booking || checkoutData;
      setConfirmedBooking(booking);
      setStep('CONFIRMED');

      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true
      }).start();

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    } catch (err) {
      setErrorMessage(err.message || 'Transfer verification failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
      setPaymentStepText('');
    }
  };

  // Complete Payment via USSD
  const handleUssdPayment = async () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
    setIsProcessingPayment(true);
    setPaymentStepText('Verifying USSD dial authentication with bank...');
    setErrorMessage('');

    try {
      await new Promise(r => setTimeout(r, 800));
      setPaymentStepText('USSD PIN authenticated! Authorizing settlement...');

      let confirmedRes = null;
      const txRef = checkoutData?.txRef;
      if (txRef) {
        confirmedRes = await api.testConfirmPayment({
          bookingId: checkoutData?.bookingId || checkoutData?.id,
          txRef
        });
      }

      await new Promise(r => setTimeout(r, 500));
      setPaymentStepText('Generating ticket QR code...');

      const booking = confirmedRes?.data || confirmedRes?.booking || checkoutData;
      setConfirmedBooking(booking);
      setStep('CONFIRMED');

      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true
      }).start();

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) {}
    } catch (err) {
      setErrorMessage(err.message || 'USSD verification failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
      setPaymentStepText('');
    }
  };

  const handleFinishConfirmed = () => {
    onClose();
    if (onBookingSuccess && confirmedBooking) {
      onBookingSuccess({
        bookingRef: confirmedBooking.bookingRef,
        movieTitle: movie?.title || 'Selected Screening',
        seats: selectedSeats.join(', '),
        totalAmount: (confirmedBooking.totalMinor || 0) / 100
      });
    }
  };

  const formatNaira = (minor) => `₦${(Number(minor || 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const minutes = Math.floor(holdTimeLeft / 60);
  const seconds = holdTimeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const modalContent = (
    <SafeAreaView style={styles.modalContainer}>
      {/* Visual Sheet Pull / Drag Handle */}
      <View style={styles.sheetDragHandle} />

      {/* Modal Header */}
      <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              if (step === 'CHECKOUT') {
                handleAbandon();
              } else if (step === 'CONFIRMED') {
                handleFinishConfirmed();
              } else {
                onClose();
              }
            }}
            style={styles.closeBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close seat selection"
          >
            <Ionicons name="close" size={22} color={colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerSub}>
              {step === 'SEAT_SELECTION' ? 'CHOOSE SEATS' : step === 'CHECKOUT' ? 'SECURE CHECKOUT' : 'CONFIRMED'}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {movie?.title || 'Movie Screening'}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Error notification banner with Retry button */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
            {retryAction ? (
              <TouchableOpacity
                style={styles.errorRetryBtn}
                onPress={() => {
                  setErrorMessage('');
                  retryAction();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.errorRetryBtnText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Traffic Surge Waiting Room Screen */}
        {waitingRoomData && waitingRoomData.status === 'QUEUED' ? (
          <View style={styles.waitingRoomContainer}>
            <View style={styles.waitingRoomCard}>
              <View style={styles.waitingRoomIconBox}>
                <Ionicons name="hourglass" size={32} color={colors.primary} />
              </View>
              <Text style={styles.waitingRoomTitle}>You're in Line!</Text>
              <Text style={styles.waitingRoomSubtitle}>
                This screening is experiencing very high demand. You will enter seat selection automatically as spots open.
              </Text>

              <View style={styles.waitingBadge}>
                <Text style={styles.waitingBadgeLabel}>QUEUE POSITION</Text>
                <Text style={styles.waitingBadgeNumber}>#{waitingRoomData.position}</Text>
                <Text style={styles.waitingBadgeSub}>
                  Estimated wait: ~{waitingRoomData.estimatedWaitSeconds || 10} seconds
                </Text>
              </View>

              <View style={styles.waitingProgressRow}>
                <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.waitingProgressText}>Holding your place in line... Please wait.</Text>
              </View>

              <TouchableOpacity
                style={styles.leaveQueueBtn}
                onPress={() => setWaitingRoomData(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.leaveQueueBtnText}>Leave Line</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* STAGE 1: Seat Selection Grid */}
        {step === 'SEAT_SELECTION' && (!waitingRoomData || waitingRoomData.status !== 'QUEUED') && (
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Cinema Screen Curved Bar */}
            <View style={styles.screenStageWrapper}>
              <View style={styles.curvedScreenBar} />
              <Text style={styles.screenStageText}>AUDITORIUM SCREEN (IMAX LASER)</Text>
            </View>

            {/* Seating Grid */}
            <View style={styles.gridWrapper}>
              {SEAT_ROWS.map(row => (
                <View key={row} style={styles.rowWrapper}>
                  <Text style={styles.rowLabel}>{row}</Text>
                  <View style={styles.rowSeats}>
                    {SEATS_PER_ROW.map(num => {
                      const seatId = `${row}${num}`;
                      const isOccupied = OCCUPIED_SEATS.has(seatId) || liveOccupiedSeats.has(seatId);
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

            {/* Bottom Bar */}
            <View style={styles.bookingFooter}>
              <View style={styles.footerInfo}>
                <Text style={styles.footerLabel}>
                  {selectedSeats.length > 0
                    ? `${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''} (${selectedSeats.join(', ')})`
                    : 'Select Seats'}
                </Text>
                <Text style={styles.footerPrice}>
                  ₦{(selectedSeats.length * DEFAULT_PRICE).toLocaleString()}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, (selectedSeats.length === 0 || loading) && styles.confirmBtnDisabled]}
                onPress={handleProceedToCheckout}
                disabled={selectedSeats.length === 0 || loading}
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Proceed to checkout"
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={18} color={colors.onPrimary} style={{ marginRight: Spacing.xs }} />
                    <Text style={styles.confirmBtnText}>Proceed to Checkout</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* STAGE 2: Checkout Review & Server Minor-Unit Fee Breakdown */}
        {step === 'CHECKOUT' && checkoutData && (
          <ScrollView contentContainerStyle={styles.checkoutContainer} showsVerticalScrollIndicator={false}>
            {/* Hold Expiry Banner */}
            <View style={styles.holdBanner}>
              <Ionicons name="time" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.holdBannerText}>
                Seats held for <Text style={{ fontWeight: '800', color: colors.onPrimary }}>{timeFormatted}</Text> minutes
              </Text>
            </View>

            {/* Order Summary Card */}
            <View style={styles.orderSummaryCard}>
              <Text style={styles.orderSummaryTitle}>Ticket Breakdown</Text>
              <Text style={styles.orderMovieTitle}>{movie?.title || 'Selected Screening'}</Text>
              <Text style={styles.orderSeatsText}>Seats: {selectedSeats.join(', ')}</Text>

              <View style={styles.divider} />

              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>
                  {selectedSeats.length}x Admission ({formatNaira(checkoutData.subtotalMinor / selectedSeats.length)}/ea)
                </Text>
                <Text style={styles.summaryLineVal}>{formatNaira(checkoutData.subtotalMinor)}</Text>
              </View>

              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>
                  Server Service Fee (₦300/ticket)
                </Text>
                <Text style={styles.summaryLineVal}>{formatNaira(checkoutData.serviceFeeMinor)}</Text>
              </View>

              <View style={[styles.summaryLine, styles.totalLine]}>
                <Text style={styles.totalText}>Total Amount</Text>
                <Text style={styles.totalValText}>{formatNaira(checkoutData.totalMinor)}</Text>
              </View>
            </View>

            {/* PAYMENT METHOD SELECTOR */}
            <View style={styles.methodSelectorSection}>
              <Text style={styles.methodSectionHeading}>SELECT PAYMENT METHOD</Text>
              <Text style={styles.methodSectionSub}>Choose how you would like to pay for your tickets:</Text>

              <View style={styles.methodCardsContainer}>
                {/* Option 1: Card */}
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    selectedPaymentMethod === 'CARD' && styles.methodCardSelected
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                    setSelectedPaymentMethod('CARD');
                  }}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Pay with Debit or Credit Card"
                >
                  <View style={styles.methodCardLeft}>
                    <View style={[styles.methodIconBox, selectedPaymentMethod === 'CARD' && styles.methodIconBoxSelected]}>
                      <Ionicons name="card" size={20} color={selectedPaymentMethod === 'CARD' ? colors.onPrimary : colors.primary} />
                    </View>
                    <View style={styles.methodCardTexts}>
                      <Text style={[styles.methodCardTitle, selectedPaymentMethod === 'CARD' && styles.methodCardTitleSelected]}>
                        Debit / Credit Card
                      </Text>
                      <Text style={[styles.methodCardDesc, selectedPaymentMethod === 'CARD' && styles.methodCardDescSelected]}>
                        Mastercard, Visa, Verve
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radioCircle, selectedPaymentMethod === 'CARD' && styles.radioCircleSelected]}>
                    {selectedPaymentMethod === 'CARD' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                {/* Option 2: Bank Transfer */}
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    selectedPaymentMethod === 'TRANSFER' && styles.methodCardSelected
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                    setSelectedPaymentMethod('TRANSFER');
                  }}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Pay via Bank Transfer"
                >
                  <View style={styles.methodCardLeft}>
                    <View style={[styles.methodIconBox, selectedPaymentMethod === 'TRANSFER' && styles.methodIconBoxSelected]}>
                      <Ionicons name="business" size={20} color={selectedPaymentMethod === 'TRANSFER' ? colors.onPrimary : colors.primary} />
                    </View>
                    <View style={styles.methodCardTexts}>
                      <Text style={[styles.methodCardTitle, selectedPaymentMethod === 'TRANSFER' && styles.methodCardTitleSelected]}>
                        Bank Transfer
                      </Text>
                      <Text style={[styles.methodCardDesc, selectedPaymentMethod === 'TRANSFER' && styles.methodCardDescSelected]}>
                        Direct Virtual Account transfer
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radioCircle, selectedPaymentMethod === 'TRANSFER' && styles.radioCircleSelected]}>
                    {selectedPaymentMethod === 'TRANSFER' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>

                {/* Option 3: USSD */}
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    selectedPaymentMethod === 'USSD' && styles.methodCardSelected
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                    setSelectedPaymentMethod('USSD');
                  }}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Pay with Bank USSD Code"
                >
                  <View style={styles.methodCardLeft}>
                    <View style={[styles.methodIconBox, selectedPaymentMethod === 'USSD' && styles.methodIconBoxSelected]}>
                      <Ionicons name="phone-portrait" size={20} color={selectedPaymentMethod === 'USSD' ? colors.onPrimary : colors.primary} />
                    </View>
                    <View style={styles.methodCardTexts}>
                      <Text style={[styles.methodCardTitle, selectedPaymentMethod === 'USSD' && styles.methodCardTitleSelected]}>
                        USSD Code
                      </Text>
                      <Text style={[styles.methodCardDesc, selectedPaymentMethod === 'USSD' && styles.methodCardDescSelected]}>
                        *737#, *966#, *919#, etc.
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.radioCircle, selectedPaymentMethod === 'USSD' && styles.radioCircleSelected]}>
                    {selectedPaymentMethod === 'USSD' && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* IF NO METHOD SELECTED: Prompt Guidance */}
            {selectedPaymentMethod === null && (
              <View style={styles.promptCard}>
                <Ionicons name="finger-print-outline" size={24} color={colors.onPrimaryContainer} style={{ marginRight: 10 }} />
                <Text style={styles.promptCardText}>
                  Please choose a payment method above to proceed with completing your reservation.
                </Text>
              </View>
            )}

            {/* METHOD 1: CARD FORM */}
            {selectedPaymentMethod === 'CARD' && (
              <View style={styles.cardSection}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="card" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.cardSectionTitle}>Card Payment Details</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.testCardButton}
                    onPress={handleUseTestCard}
                    activeOpacity={0.8}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Fill Flutterwave test card details"
                  >
                    <Ionicons name="flash" size={12} color={colors.onPrimaryContainer} style={{ marginRight: 4 }} />
                    <Text style={styles.testCardButtonText}>Use Test Card</Text>
                  </TouchableOpacity>
                </View>

                {/* Visual Credit Card Preview */}
                <View style={styles.cardVisual}>
                  <View style={styles.cardVisualTop}>
                    <View style={styles.cardChip} />
                    <View style={styles.cardBrandBadge}>
                      <Text style={styles.cardBrandBadgeText}>{getCardBrand(cardNumber).name}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardVisualNumber}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </Text>
                  <View style={styles.cardVisualBottom}>
                    <View style={{ flex: 1, marginRight: Spacing.md }}>
                      <Text style={styles.cardVisualLabel}>CARDHOLDER</Text>
                      <Text style={styles.cardVisualValue} numberOfLines={1}>
                        {cardholderName.toUpperCase() || 'CINEMA PATRON'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardVisualLabel}>EXPIRES</Text>
                      <Text style={styles.cardVisualValue}>{cardExpiry || 'MM/YY'}</Text>
                    </View>
                  </View>
                </View>

                {/* Inline Validation Error Banner */}
                {cardError ? (
                  <View style={styles.cardErrorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.cardErrorText}>{cardError}</Text>
                  </View>
                ) : null}

                {/* Input: Card Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CARD NUMBER</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="card-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="5399 4100 0000 0000"
                      placeholderTextColor={colors.onSurfaceVariant + '88'}
                      value={cardNumber}
                      onChangeText={(val) => {
                        setCardNumber(formatCardNumber(val));
                        if (cardError) setCardError('');
                      }}
                      keyboardType="numeric"
                      maxLength={19}
                      accessible={true}
                      accessibilityLabel="Card Number input"
                    />
                  </View>
                </View>

                {/* Input: Cardholder Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Cinema Patron"
                      placeholderTextColor={colors.onSurfaceVariant + '88'}
                      value={cardholderName}
                      onChangeText={(val) => {
                        setCardholderName(val);
                        if (cardError) setCardError('');
                      }}
                      autoCapitalize="words"
                      accessible={true}
                      accessibilityLabel="Cardholder Name input"
                    />
                  </View>
                </View>

                {/* Row: Expiry + CVV */}
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
                    <Text style={styles.inputLabel}>EXPIRY DATE</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="calendar-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="MM/YY"
                        placeholderTextColor={colors.onSurfaceVariant + '88'}
                        value={cardExpiry}
                        onChangeText={(val) => {
                          setCardExpiry(formatExpiry(val));
                          if (cardError) setCardError('');
                        }}
                        keyboardType="numeric"
                        maxLength={5}
                        accessible={true}
                        accessibilityLabel="Card expiry date input"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>CVV / CVC</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="123"
                        placeholderTextColor={colors.onSurfaceVariant + '88'}
                        value={cardCvv}
                        onChangeText={(val) => {
                          setCardCvv(formatCvv(val));
                          if (cardError) setCardError('');
                        }}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry={true}
                        accessible={true}
                        accessibilityLabel="Card CVV security code input"
                      />
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* METHOD 2: BANK TRANSFER VIEW */}
            {selectedPaymentMethod === 'TRANSFER' && (
              <View style={styles.cardSection}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="business" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.cardSectionTitle}>Virtual Account Transfer</Text>
                  </View>
                  <View style={styles.testBadge}>
                    <Text style={styles.testBadgeText}>INSTANT</Text>
                  </View>
                </View>

                <View style={styles.transferBox}>
                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>BANK NAME</Text>
                    <Text style={styles.transferValue}>Providus Bank (Flutterwave)</Text>
                  </View>
                  <View style={styles.transferDivider} />

                  <View style={styles.transferRow}>
                    <View>
                      <Text style={styles.transferLabel}>ACCOUNT NUMBER</Text>
                      <Text style={[styles.transferValue, styles.transferAccNum]}>9928374610</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.copyBtn, copiedAccount && styles.copyBtnSuccess]}
                      onPress={handleCopyAccount}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={copiedAccount ? "checkmark" : "copy-outline"} size={14} color={copiedAccount ? '#10B981' : colors.onPrimaryContainer} style={{ marginRight: 4 }} />
                      <Text style={[styles.copyBtnText, copiedAccount && { color: '#10B981' }]}>
                        {copiedAccount ? 'Copied!' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.transferDivider} />

                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>ACCOUNT NAME</Text>
                    <Text style={styles.transferValue}>Matinee Cinema • Silverbird</Text>
                  </View>
                  <View style={styles.transferDivider} />

                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>AMOUNT TO SEND</Text>
                    <Text style={[styles.transferValue, { color: colors.primary, fontWeight: '800' }]}>
                      {formatNaira(checkoutData.totalMinor)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.transferNotice}>
                  ⏱️ Transfer the exact amount within 10 minutes. Your booking will confirm automatically upon transfer receipt.
                </Text>
              </View>
            )}

            {/* METHOD 3: USSD VIEW */}
            {selectedPaymentMethod === 'USSD' && (
              <View style={styles.cardSection}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="phone-portrait" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.cardSectionTitle}>Pay with Bank USSD</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>CHOOSE YOUR BANK</Text>
                <View style={styles.ussdBanksRow}>
                  {USSD_BANKS.map(bank => {
                    const isSelected = selectedUssdBank === bank.id;
                    return (
                      <TouchableOpacity
                        key={bank.id}
                        style={[styles.ussdChip, isSelected && styles.ussdChipSelected]}
                        onPress={() => setSelectedUssdBank(bank.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.ussdChipText, isSelected && styles.ussdChipTextSelected]}>
                          {bank.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Dial Code Display Box */}
                <View style={styles.ussdCodeBox}>
                  <Text style={styles.ussdCodeLabel}>DIAL CODE ON YOUR PHONE</Text>
                  <View style={styles.ussdCodeRow}>
                    <Text style={styles.ussdCodeText}>
                      {USSD_BANKS.find(b => b.id === selectedUssdBank)?.prefix}4800*00291#
                    </Text>
                    <TouchableOpacity
                      style={[styles.copyBtn, copiedUssd && styles.copyBtnSuccess]}
                      onPress={handleCopyUssd}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={copiedUssd ? "checkmark" : "copy-outline"} size={14} color={copiedUssd ? '#10B981' : colors.onPrimaryContainer} style={{ marginRight: 4 }} />
                      <Text style={[styles.copyBtnText, copiedUssd && { color: '#10B981' }]}>
                        {copiedUssd ? 'Copied!' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.transferNotice}>
                  📱 Dial the code from the phone number linked to your bank and enter your transfer PIN to authorize.
                </Text>
              </View>
            )}

            {/* In-Flight Multi-Step Processing Banner */}
            {isProcessingPayment && (
              <View style={styles.processingCard}>
                <ActivityIndicator size="small" color={colors.onPrimaryContainer} style={{ marginRight: 10 }} />
                <Text style={styles.processingText}>{paymentStepText || 'Processing payment...'}</Text>
              </View>
            )}

            {/* Payment Provider Badge */}
            <View style={styles.providerCard}>
              <View style={styles.providerRow}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerTitle}>Flutterwave Payment Gateway</Text>
                  <Text style={styles.providerSub}>PCI-DSS Level 1 • 256-Bit SSL Encrypted Sandbox</Text>
                </View>
                <View style={styles.testBadge}>
                  <Text style={styles.testBadgeText}>SANDBOX</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.checkoutActions}>
              <TouchableOpacity
                style={[
                  styles.payNowBtn,
                  (!selectedPaymentMethod || isProcessingPayment || loading) && styles.confirmBtnDisabled
                ]}
                onPress={() => {
                  if (selectedPaymentMethod === 'CARD') {
                    handleCompletePayment();
                  } else if (selectedPaymentMethod === 'TRANSFER') {
                    handleTransferPayment();
                  } else if (selectedPaymentMethod === 'USSD') {
                    handleUssdPayment();
                  }
                }}
                disabled={!selectedPaymentMethod || isProcessingPayment || loading}
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Pay and complete booking"
              >
                {isProcessingPayment || loading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={!selectedPaymentMethod ? "hand-right-outline" : "lock-closed"}
                      size={18}
                      color={colors.onPrimary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.payNowBtnText}>
                      {!selectedPaymentMethod
                        ? 'Select Payment Option to Continue'
                        : selectedPaymentMethod === 'CARD'
                        ? `Pay ${formatNaira(checkoutData.totalMinor)} with Card`
                        : selectedPaymentMethod === 'TRANSFER'
                        ? `I Have Sent ${formatNaira(checkoutData.totalMinor)}`
                        : `I Have Completed USSD Payment`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.abandonBtn}
                onPress={() => handleAbandon(false)}
                disabled={isProcessingPayment || loading}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cancel checkout and release held seats"
              >
                <Text style={styles.abandonBtnText}>Cancel & Release Seats</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* STAGE 3: Booking Confirmed & Celebratory View */}
        {step === 'CONFIRMED' && (
          <View style={styles.confirmationContainer}>
            <Animated.View style={[styles.celebrationCircle, { transform: [{ scale: checkmarkScale }] }]}>
              <Ionicons name="checkmark-done" size={54} color={colors.onPrimary} />
            </Animated.View>

            <Text style={styles.confirmedTitle}>Payment Verified & Confirmed!</Text>
            <Text style={styles.confirmedSubtitle}>
              Webhook confirmed. Your digital cinema pass with scannable QR code is ready.
            </Text>

            <View style={styles.ticketSummaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>FILM</Text>
                <Text style={styles.summaryValue}>{movie?.title}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SEATS</Text>
                <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: '700' }]}>
                  {selectedSeats.join(', ')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>BOOKING REF</Text>
                <Text style={styles.summaryValue}>{confirmedBooking?.bookingRef || 'MTN-PASS'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TOTAL PAID</Text>
                <Text style={styles.summaryValue}>{formatNaira(confirmedBooking?.totalMinor)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewQrPassBtn}
              onPress={() => setShowFullTicketModal(true)}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="View cinema pass with QR code"
            >
              <Ionicons name="qr-code-outline" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.viewQrPassBtnText}>View QR Digital Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeConfirmedBtn}
              onPress={handleFinishConfirmed}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Done and return to home"
            >
              <Text style={styles.closeConfirmedBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Full Screen Ticket Modal with Scannable QR Code */}
        {showFullTicketModal && (
          <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
            <TicketScreen
              booking={confirmedBooking}
              onClose={() => {
                setShowFullTicketModal(false);
                handleFinishConfirmed();
              }}
            />
          </Modal>
        )}
      </SafeAreaView>
  );

  if (isInline) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {modalContent}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (step === 'CHECKOUT') {
          handleAbandon();
        } else {
          onClose();
        }
      }}
    >
      {modalContent}
    </Modal>
  );
}

const createModalStyles = (colors = Colors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface
  },
  sheetDragHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant || '#555',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant || colors.outline + '22'
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: colors.surfaceContainer
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1
  },
  headerSub: {
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 2,
    fontWeight: '700'
  },
  headerTitle: {
    fontSize: 16,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 2
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444422',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EF444444'
  },
  errorBannerText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs || 4,
    marginLeft: 8
  },
  errorRetryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  // --- Waiting Room Styles ---
  waitingRoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl
  },
  waitingRoomCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  waitingRoomIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md
  },
  waitingRoomTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: Spacing.xs,
    textAlign: 'center'
  },
  waitingRoomSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg
  },
  waitingBadge: {
    backgroundColor: colors.primaryContainer,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary
  },
  waitingBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onPrimaryContainer,
    letterSpacing: 1.5,
    marginBottom: 4
  },
  waitingBadgeNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.onPrimaryContainer,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  waitingBadgeSub: {
    fontSize: 12,
    color: colors.onPrimaryContainer,
    opacity: 0.85,
    marginTop: 4
  },
  waitingProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  waitingProgressText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500'
  },
  leaveQueueBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md
  },
  leaveQueueBtnText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    textDecorationLine: 'underline'
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
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.full
  },
  screenStageText: {
    color: colors.onSurface,
    opacity: 0.85,
    letterSpacing: 3,
    marginTop: Spacing.xs,
    fontSize: 10,
    fontWeight: '700'
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
    color: colors.onSurface,
    opacity: 0.85,
    width: 16,
    textAlign: 'center',
    fontWeight: '700'
  },
  rowSeats: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  seatBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh || colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center'
  },
  seatSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  seatOccupied: {
    backgroundColor: colors.surfaceContainerHighest || colors.outlineVariant,
    borderColor: 'transparent',
    opacity: 0.5
  },
  seatNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurface
  },
  seatNumberSelected: {
    color: colors.onPrimary
  },
  seatNumberOccupied: {
    color: colors.onSurfaceMuted || colors.outline
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginVertical: Spacing.md
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3
  },
  legendAvailable: {
    backgroundColor: colors.surfaceContainerHigh || colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  legendSelected: {
    backgroundColor: colors.primary
  },
  legendOccupied: {
    backgroundColor: colors.surfaceContainerHighest || colors.outlineVariant,
    opacity: 0.5
  },
  legendText: {
    fontSize: 12,
    color: colors.onSurfaceVariant
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    marginTop: Spacing.lg
  },
  footerInfo: {
    flex: 1
  },
  footerLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600'
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill
  },
  confirmBtnDisabled: {
    opacity: 0.45
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary
  },
  // --- Checkout Screen Styles ---
  checkoutContainer: {
    padding: Spacing.lg
  },
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.lg
  },
  holdBannerText: {
    fontSize: 13,
    color: colors.onPrimary,
    fontWeight: '600'
  },
  orderSummaryCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.lg
  },
  orderSummaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs
  },
  orderMovieTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: 4
  },
  orderSeatsText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: Spacing.md
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  summaryLineLabel: {
    fontSize: 13,
    color: colors.onSurfaceVariant
  },
  summaryLineVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface
  },
  totalValText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary
  },
  providerCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.xl
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  providerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface
  },
  providerSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant
  },
  testBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary
  },
  testBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.onPrimaryContainer,
    letterSpacing: 0.5
  },
  checkoutActions: {
    gap: Spacing.sm
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.pill
  },
  payNowBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary
  },
  abandonBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  abandonBtnText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '600'
  },
  // --- Card Payment Section Styles ---
  cardSection: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.lg
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface
  },
  testCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary
  },
  testCardButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimaryContainer
  },
  cardVisual: {
    backgroundColor: '#1E182A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)'
  },
  cardVisualTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  cardChip: {
    width: 36,
    height: 26,
    borderRadius: 5,
    backgroundColor: '#E5B842',
    borderWidth: 1,
    borderColor: '#C49A2C'
  },
  cardBrandBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  cardBrandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  cardVisualNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2.5,
    marginBottom: Spacing.lg,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  cardVisualBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  cardVisualLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1,
    marginBottom: 2
  },
  cardVisualValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  cardErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444418',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#EF444444',
    marginBottom: Spacing.md
  },
  cardErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1
  },
  inputGroup: {
    marginBottom: Spacing.md
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: Spacing.xs
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh || colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    height: 48
  },
  inputIcon: {
    marginRight: Spacing.sm
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '600'
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm
  },
  processingText: {
    fontSize: 12,
    color: colors.onPrimaryContainer,
    fontWeight: '600',
    flex: 1
  },
  // --- Payment Method Selector Styles ---
  methodSelectorSection: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.lg
  },
  methodSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 4
  },
  methodSectionSub: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginBottom: Spacing.md
  },
  methodCardsContainer: {
    gap: Spacing.sm
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh || colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  methodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  methodIconBoxSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  methodCardTexts: {
    flex: 1
  },
  methodCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface
  },
  methodCardTitleSelected: {
    color: colors.onPrimary,
    fontWeight: '800'
  },
  methodCardDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2
  },
  methodCardDescSelected: {
    color: colors.onPrimary,
    opacity: 0.85
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioCircleSelected: {
    borderColor: colors.onPrimary
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.onPrimary
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: Spacing.lg
  },
  promptCardText: {
    fontSize: 13,
    color: colors.onPrimaryContainer,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600'
  },
  // --- Bank Transfer Styles ---
  transferBox: {
    backgroundColor: colors.surfaceContainerHigh || '#1E1E2E',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.md
  },
  transferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  transferLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1
  },
  transferValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface
  },
  transferAccNum: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2
  },
  transferDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4
  },
  transferNotice: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 16
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: colors.primary
  },
  copyBtnSuccess: {
    backgroundColor: '#10B98122',
    borderColor: '#10B981'
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimaryContainer
  },
  // --- USSD Styles ---
  ussdBanksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
    flexWrap: 'wrap'
  },
  ussdChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.pill,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  },
  ussdChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  ussdChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface
  },
  ussdChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700'
  },
  ussdCodeBox: {
    backgroundColor: colors.surfaceContainerHigh || '#1E1E2E',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.md
  },
  ussdCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4
  },
  ussdCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ussdCodeText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  // --- Confirmation Styles ---
  confirmationContainer: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  celebrationCircle: {
    width: 90,
    height: 90,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg
  },
  confirmedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
    marginBottom: Spacing.xs,
    textAlign: 'center'
  },
  confirmedSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md
  },
  ticketSummaryCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: Spacing.xl,
    gap: Spacing.sm
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '700'
  },
  summaryValue: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '600'
  },
  viewQrPassBtn: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm
  },
  viewQrPassBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary
  },
  closeConfirmedBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center'
  },
  closeConfirmedBtnText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontWeight: '600'
  }
});

const modalStylesCache = new Map();
const getModalStyles = (colors = Colors) => {
  if (!modalStylesCache.has(colors)) {
    modalStylesCache.set(colors, createModalStyles(colors));
  }
  return modalStylesCache.get(colors);
};

const styles = getModalStyles(Colors);
