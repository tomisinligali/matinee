import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../theme/tokens';

export default function CinemaOperatorScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('screens'); // 'screens' | 'showtimes' | 'scanner' | 'account'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'screens' && <ScreensManagementView />}
          {activeTab === 'showtimes' && <ShowtimesManagementView />}
          {activeTab === 'scanner' && <GateScannerView />}
          {activeTab === 'account' && <OperatorAccountView user={user} onLogout={onLogout} />}
        </View>

        {/* Operator Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'screens' && styles.activeNavItem]}
            onPress={() => setActiveTab('screens')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Screens Tab"
            accessibilityState={{ selected: activeTab === 'screens' }}
          >
            <Ionicons
              name={activeTab === 'screens' ? 'tv' : 'tv-outline'}
              size={22}
              color={activeTab === 'screens' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'screens' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'screens' && styles.activeNavLabel]}>Screens</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'showtimes' && styles.activeNavItem]}
            onPress={() => setActiveTab('showtimes')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Showtimes Tab"
            accessibilityState={{ selected: activeTab === 'showtimes' }}
          >
            <Ionicons
              name={activeTab === 'showtimes' ? 'time' : 'time-outline'}
              size={22}
              color={activeTab === 'showtimes' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'showtimes' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'showtimes' && styles.activeNavLabel]}>Showtimes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'scanner' && styles.activeNavItem]}
            onPress={() => setActiveTab('scanner')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Scan Gate Tab"
            accessibilityState={{ selected: activeTab === 'scanner' }}
          >
            <Ionicons
              name={activeTab === 'scanner' ? 'qr-code' : 'qr-code-outline'}
              size={22}
              color={activeTab === 'scanner' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'scanner' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'scanner' && styles.activeNavLabel]}>Scan Gate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'account' && styles.activeNavItem]}
            onPress={() => setActiveTab('account')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Account Tab"
            accessibilityState={{ selected: activeTab === 'account' }}
          >
            <Ionicons
              name={activeTab === 'account' ? 'person' : 'person-outline'}
              size={22}
              color={activeTab === 'account' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'account' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'account' && styles.activeNavLabel]}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-Views ───────────────────────────────────────────────────────────────

function ScreensManagementView() {
  const screens = [
    { id: '1', name: 'Screen 1 (Main Hall)', type: 'Standard Digital', capacity: 180, status: 'Active' },
    { id: '2', name: 'Screen 2 (IMAX Experience)', type: 'IMAX Laser 3D', capacity: 250, status: 'Active' },
    { id: '3', name: 'Screen 3 (VIP Suite)', type: 'Luxury Recliner', capacity: 48, status: 'Active' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>CINEMA OPERATOR PORTAL</Text>
        <Text style={styles.pageTitle}>Auditorium Screens</Text>
        <Text style={styles.pageDescription}>Manage physical screen layouts, seat capacities, and restrictions.</Text>
      </View>

      <View style={styles.venueBanner}>
        <Text style={styles.venueTitle}>Silverbird Galleria (Pilot)</Text>
        <Text style={styles.venueSubtitle}>Victoria Island, Lagos • 3 Configured Screens</Text>
      </View>

      <View style={styles.cardList}>
        {screens.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyStateIconCircle}>
              <Ionicons name="film-outline" size={40} color={Colors.outline} />
            </View>
            <Text style={styles.emptyStateTitle}>No Configured Screens</Text>
            <Text style={styles.emptyStateSubtitle}>
              Configure your cinema screens and seating grids to begin scheduling screenings.
            </Text>
          </View>
        ) : (
          screens.map(scr => (
            <View key={scr.id} style={styles.screenCard}>
              <View style={styles.screenCardHeader}>
                <Text style={styles.screenCardTitle}>{scr.name}</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{scr.status}</Text>
                </View>
              </View>
              <Text style={styles.screenType}>{scr.type}</Text>
              <View style={styles.screenMetaRow}>
                <Text style={styles.screenMetaText}>Total Capacity: {scr.capacity} Seats</Text>
                <TouchableOpacity
                  style={styles.manageBtn}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Manage layout grid for ${scr.name}`}
                >
                  <Text style={styles.manageBtnText}>Layout Grid</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ShowtimesManagementView() {
  const showtimes = [
    { id: '101', film: 'Interstellar Horizon', screen: 'Screen 2 (IMAX)', time: '02:30 PM', price: '₦6,500', booked: '42 / 250' },
    { id: '102', film: 'Shadows of Midnight', screen: 'Screen 1 (Main)', time: '05:15 PM', price: '₦4,000', booked: '88 / 180' },
    { id: '103', film: 'Lagos Express', screen: 'Screen 3 (VIP)', time: '08:00 PM', price: '₦10,000', booked: '35 / 48' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>CINEMA OPERATOR PORTAL</Text>
        <Text style={styles.pageTitle}>Screening Schedules</Text>
        <Text style={styles.pageDescription}>Active showtimes, ticket tiers, and occupancy rates.</Text>
      </View>

      <View style={styles.cardList}>
        {showtimes.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyStateIconCircle}>
              <Ionicons name="calendar-outline" size={40} color={Colors.outline} />
            </View>
            <Text style={styles.emptyStateTitle}>No Active Schedules</Text>
            <Text style={styles.emptyStateSubtitle}>
              Publish screening time slots for configured auditoriums to open ticket reservations.
            </Text>
          </View>
        ) : (
          showtimes.map(st => (
            <View key={st.id} style={styles.showtimeCard}>
              <View style={styles.showtimeHeader}>
                <Text style={styles.filmTitle}>{st.film}</Text>
                <Text style={styles.showtimePrice}>{st.price}</Text>
              </View>
              <Text style={styles.showtimeScreen}>{st.screen} • {st.time}</Text>
              <View style={styles.occupancyRow}>
                <Text style={styles.occupancyLabel}>Occupancy: {st.booked} seats sold</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>Booking Open</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function GateScannerView() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>CINEMA OPERATOR PORTAL</Text>
        <Text style={styles.pageTitle}>Ticket Gate Validator</Text>
        <Text style={styles.pageDescription}>Validate attendee QR codes at the auditorium entrance.</Text>
      </View>

      <View style={styles.scannerBox}>
        <View style={styles.scannerTarget}>
          <Text style={styles.cameraEmoji}>📷</Text>
          <Text style={styles.scannerTargetText}>Ready to Scan</Text>
          <Text style={styles.scannerInstruction}>Point camera at customer's booking QR code</Text>
        </View>

        <TouchableOpacity
          style={styles.scannerButton}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Launch Camera Scanner"
        >
          <Text style={styles.scannerButtonText}>Launch Camera Scanner</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function OperatorAccountView({ user, onLogout }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>CINEMA OPERATOR PORTAL</Text>
        <Text style={styles.pageTitle}>Operator Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>🏢</Text>
        </View>
        <View style={styles.profileMeta}>
          <Text style={styles.profileName}>{user?.name || 'Cinema Staff'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.operatorRoleBadge}>
            <Text style={styles.operatorRoleBadgeText}>CINEMA OPERATOR</Text>
          </View>
        </View>
      </View>

      <View style={styles.membershipCard}>
        <Text style={styles.membershipTitle}>Assigned Cinema Membership</Text>
        <View style={styles.membershipRow}>
          <Text style={styles.membershipLabel}>Venue:</Text>
          <Text style={styles.membershipValue}>Silverbird Galleria (Pilot)</Text>
        </View>
        <View style={styles.membershipRow}>
          <Text style={styles.membershipLabel}>Role Permissions:</Text>
          <Text style={styles.membershipValue}>Screen & Showtime Manager</Text>
        </View>
        <View style={styles.membershipRow}>
          <Text style={styles.membershipLabel}>Status:</Text>
          <Text style={[styles.membershipValue, { color: Colors.success, fontWeight: '700' }]}>Active Verified</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Log Out"
      >
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, backgroundColor: Colors.surface },
  contentArea: { flex: 1 },
  scrollContainer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  topHeader: { marginBottom: Spacing.md },
  brandSubtitle: { ...Typography.labelSmall, color: Colors.primary, letterSpacing: 1.5, fontWeight: '700' },
  pageTitle: { ...Typography.headlineLarge, color: Colors.onSurface, marginTop: Spacing.xxs },
  pageDescription: { ...Typography.bodyMedium, color: Colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  venueBanner: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  venueTitle: { ...Typography.titleMedium, color: Colors.onPrimaryContainer, fontWeight: '700' },
  venueSubtitle: { ...Typography.bodySmall, color: Colors.onPrimaryContainer, opacity: 0.9, marginTop: Spacing.xxs },
  cardList: { gap: Spacing.md },
  screenCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  screenCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenCardTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  screenType: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  screenMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  screenMetaText: { ...Typography.bodyMedium, color: Colors.onSurface },
  manageBtn: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 44,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center'
  },
  manageBtnText: { ...Typography.labelSmall, color: Colors.onSurface, fontWeight: '600' },
  activeBadge: { backgroundColor: Colors.successContainer, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: BorderRadius.sm },
  activeBadgeText: { ...Typography.labelSmall, color: Colors.onSuccessContainer, fontWeight: '700' },
  showtimeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  showtimeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filmTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  showtimePrice: { ...Typography.titleMedium, color: Colors.primary, fontWeight: '700' },
  showtimeScreen: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  occupancyLabel: { ...Typography.bodySmall, color: Colors.onSurface },
  statusPill: { backgroundColor: Colors.primaryContainer, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs },
  statusPillText: { ...Typography.labelSmall, color: Colors.onPrimaryContainer, fontWeight: '700' },
  scannerBox: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.xl,
    alignItems: 'center'
  },
  scannerTarget: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg
  },
  cameraEmoji: { fontSize: 44, marginBottom: Spacing.xs },
  scannerTargetText: { ...Typography.headlineSmall, color: Colors.onSurface },
  scannerInstruction: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  scannerButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: Spacing.md,
    minHeight: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scannerButtonText: { ...Typography.labelLarge, color: Colors.onPrimary, fontWeight: '700' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  avatarText: { fontSize: 24 },
  profileMeta: { flex: 1 },
  profileName: { ...Typography.titleLarge, color: Colors.onSurface, fontWeight: '700' },
  profileEmail: { ...Typography.bodyMedium, color: Colors.onSurface, opacity: 0.85 },
  operatorRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xxs
  },
  operatorRoleBadgeText: { ...Typography.labelSmall, color: Colors.onPrimaryContainer, fontWeight: '700' },
  membershipCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  membershipTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700', marginBottom: Spacing.sm },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer
  },
  membershipLabel: { ...Typography.bodyMedium, color: Colors.onSurface, opacity: 0.85 },
  membershipValue: { ...Typography.bodyMedium, color: Colors.onSurface },
  logoutButton: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutButtonText: { ...Typography.labelLarge, color: Colors.onErrorContainer, fontWeight: '700' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.md
  },
  activeNavItem: { backgroundColor: Colors.surfaceContainer },
  navIcon: { fontSize: 20, marginBottom: Spacing.xxs },
  activeNavIcon: { transform: [{ scale: 1.1 }] },
  navLabel: { ...Typography.labelSmall, color: Colors.onSurface, opacity: 0.8 },
  activeNavLabel: { color: Colors.primary, fontWeight: '700', opacity: 1 },
  emptyStateBox: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md
  },
  emptyStateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm
  },
  emptyStateTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  emptyStateSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 20
  }
});
