import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Colors, Spacing, Typography } from '../theme/tokens';

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
          >
            <Text style={[styles.navIcon, activeTab === 'screens' && styles.activeNavIcon]}>🖥️</Text>
            <Text style={[styles.navLabel, activeTab === 'screens' && styles.activeNavLabel]}>Screens</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'showtimes' && styles.activeNavItem]}
            onPress={() => setActiveTab('showtimes')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'showtimes' && styles.activeNavIcon]}>🕒</Text>
            <Text style={[styles.navLabel, activeTab === 'showtimes' && styles.activeNavLabel]}>Showtimes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'scanner' && styles.activeNavItem]}
            onPress={() => setActiveTab('scanner')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'scanner' && styles.activeNavIcon]}>📷</Text>
            <Text style={[styles.navLabel, activeTab === 'scanner' && styles.activeNavLabel]}>Scan Gate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'account' && styles.activeNavItem]}
            onPress={() => setActiveTab('account')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'account' && styles.activeNavIcon]}>👤</Text>
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
        {screens.map(scr => (
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
              <TouchableOpacity style={styles.manageBtn} activeOpacity={0.7}>
                <Text style={styles.manageBtnText}>Layout Grid</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
        {showtimes.map(st => (
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
        ))}
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

        <TouchableOpacity style={styles.scannerButton} activeOpacity={0.8}>
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

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.85}>
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
  pageDescription: { ...Typography.bodyMedium, color: Colors.onSurface, opacity: 0.7, marginTop: 2 },
  venueBanner: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  venueTitle: { ...Typography.titleMedium, color: Colors.onPrimaryContainer, fontWeight: '700' },
  venueSubtitle: { ...Typography.bodySmall, color: Colors.onPrimaryContainer, opacity: 0.8, marginTop: 2 },
  cardList: { gap: Spacing.md },
  screenCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  screenCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenCardTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  screenType: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.6, marginTop: 2 },
  screenMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  screenMetaText: { ...Typography.bodyMedium, color: Colors.onSurface },
  manageBtn: { backgroundColor: Colors.surfaceContainer, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  manageBtnText: { ...Typography.labelSmall, color: Colors.onSurface },
  activeBadge: { backgroundColor: Colors.successContainer, paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { ...Typography.labelSmall, color: Colors.onSuccessContainer, fontWeight: '700' },
  showtimeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  showtimeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filmTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  showtimePrice: { ...Typography.titleMedium, color: Colors.primary, fontWeight: '700' },
  showtimeScreen: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.6, marginTop: 2 },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  occupancyLabel: { ...Typography.bodySmall, color: Colors.onSurface },
  statusPill: { backgroundColor: Colors.primaryContainer, borderRadius: 6, paddingHorizontal: Spacing.xs, paddingVertical: 2 },
  statusPillText: { ...Typography.labelSmall, color: Colors.onPrimaryContainer, fontWeight: '700' },
  scannerBox: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.xl,
    alignItems: 'center'
  },
  scannerTarget: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg
  },
  cameraEmoji: { fontSize: 44, marginBottom: Spacing.xs },
  scannerTargetText: { ...Typography.headlineSmall, color: Colors.onSurface },
  scannerInstruction: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.6, marginTop: 4 },
  scannerButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: 'center'
  },
  scannerButtonText: { ...Typography.labelLarge, color: Colors.onPrimary },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  avatarText: { fontSize: 24 },
  profileMeta: { flex: 1 },
  profileName: { ...Typography.titleLarge, color: Colors.onSurface, fontWeight: '700' },
  profileEmail: { ...Typography.bodyMedium, color: Colors.onSurface, opacity: 0.7 },
  operatorRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4
  },
  operatorRoleBadgeText: { ...Typography.labelSmall, color: Colors.onPrimaryContainer, fontWeight: '700' },
  membershipCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
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
  membershipLabel: { ...Typography.bodyMedium, color: Colors.onSurface, opacity: 0.7 },
  membershipValue: { ...Typography.bodyMedium, color: Colors.onSurface },
  logoutButton: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center'
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
  navItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xxs, borderRadius: 8 },
  activeNavItem: { backgroundColor: Colors.surfaceContainer },
  navIcon: { fontSize: 20, marginBottom: 2 },
  activeNavIcon: { transform: [{ scale: 1.1 }] },
  navLabel: { ...Typography.labelSmall, color: Colors.onSurface, opacity: 0.6 },
  activeNavLabel: { color: Colors.primary, fontWeight: '700', opacity: 1 }
});
