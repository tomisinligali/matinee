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
import { useTheme } from '../theme/ThemeContext';

export default function PlatformAdminScreen({ user, onLogout }) {
  const { colors } = useTheme();
  const styles = getAdminStyles(colors);
  const [activeTab, setActiveTab] = useState('cinemas'); // 'cinemas' | 'operators' | 'audit' | 'account'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'cinemas' && <CinemasNetworkView />}
          {activeTab === 'operators' && <OperatorMembershipsView />}
          {activeTab === 'audit' && <AuditTrailView />}
          {activeTab === 'account' && <AdminAccountView user={user} onLogout={onLogout} />}
        </View>

        {/* Admin Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'cinemas' && styles.activeNavItem]}
            onPress={() => setActiveTab('cinemas')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Network Cinemas Tab"
            accessibilityState={{ selected: activeTab === 'cinemas' }}
          >
            <Ionicons
              name={activeTab === 'cinemas' ? 'business' : 'business-outline'}
              size={22}
              color={activeTab === 'cinemas' ? colors.primary : colors.onSurface}
              style={{ opacity: activeTab === 'cinemas' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'cinemas' && styles.activeNavLabel]}>Network</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'operators' && styles.activeNavItem]}
            onPress={() => setActiveTab('operators')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Staff Operators Tab"
            accessibilityState={{ selected: activeTab === 'operators' }}
          >
            <Ionicons
              name={activeTab === 'operators' ? 'people' : 'people-outline'}
              size={22}
              color={activeTab === 'operators' ? colors.primary : colors.onSurface}
              style={{ opacity: activeTab === 'operators' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'operators' && styles.activeNavLabel]}>Staff</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'audit' && styles.activeNavItem]}
            onPress={() => setActiveTab('audit')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Audit Log Tab"
            accessibilityState={{ selected: activeTab === 'audit' }}
          >
            <Ionicons
              name={activeTab === 'audit' ? 'document-text' : 'document-text-outline'}
              size={22}
              color={activeTab === 'audit' ? colors.primary : colors.onSurface}
              style={{ opacity: activeTab === 'audit' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'audit' && styles.activeNavLabel]}>Audit Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'account' && styles.activeNavItem]}
            onPress={() => setActiveTab('account')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Admin Profile Tab"
            accessibilityState={{ selected: activeTab === 'account' }}
          >
            <Ionicons
              name={activeTab === 'account' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={22}
              color={activeTab === 'account' ? colors.primary : colors.onSurface}
              style={{ opacity: activeTab === 'account' ? 1 : 0.8, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'account' && styles.activeNavLabel]}>Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-Views ───────────────────────────────────────────────────────────────

function CinemasNetworkView() {
  const { colors } = useTheme();
  const styles = getAdminStyles(colors);
  const [cinemas, setCinemas] = useState([
    { id: '1', name: 'Filmhouse Cinemas IMAX', location: 'Lekki, Lagos', status: 'ACTIVE', screens: 5 },
    { id: '2', name: 'Silverbird Galleria', location: 'Victoria Island, Lagos', status: 'ACTIVE', screens: 5 },
    { id: '3', name: 'Genesis Deluxe Cinemas', location: 'Palms Mall, Lagos', status: 'ACTIVE', screens: 6 },
    { id: '4', name: 'Ozone Cinemas', location: 'Yaba, Lagos', status: 'SUSPENDED', screens: 4 }
  ]);

  const toggleStatus = (id) => {
    setCinemas(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' };
      }
      return c;
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>PLATFORM OPERATIONS</Text>
        <Text style={styles.pageTitle}>Cinema Network</Text>
        <Text style={styles.pageDescription}>Manage participating partner cinemas and emergency operational suspensions.</Text>
      </View>

      <View style={styles.networkStatsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>10</Text>
          <Text style={styles.statLabel}>Partner Venues</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>48</Text>
          <Text style={styles.statLabel}>Auditoriums</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>1</Text>
          <Text style={[styles.statLabel, { color: Colors.error }]}>Suspended</Text>
        </View>
      </View>

      <View style={styles.cardList}>
        {cinemas.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyStateIconCircle}>
              <Ionicons name="business-outline" size={40} color={colors.outline} />
            </View>
            <Text style={styles.emptyStateTitle}>No Partner Cinemas</Text>
            <Text style={styles.emptyStateSubtitle}>
              Cinema venues enrolled in the Matinee network will appear here for operational management.
            </Text>
          </View>
        ) : (
          cinemas.map(c => (
            <View key={c.id} style={styles.networkCard}>
              <View style={styles.networkCardHeader}>
                <View>
                  <Text style={styles.networkName}>{c.name}</Text>
                  <Text style={styles.networkLoc}>{c.location} • {c.screens} Screens</Text>
                </View>
                <View style={[styles.statusBadge, c.status === 'ACTIVE' ? styles.statusActive : styles.statusSuspended]}>
                  <Text style={[styles.statusBadgeText, c.status === 'ACTIVE' ? styles.statusActiveText : styles.statusSuspendedText]}>
                    {c.status}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, c.status === 'ACTIVE' ? styles.suspendBtn : styles.activateBtn]}
                  onPress={() => toggleStatus(c.id)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.status === 'ACTIVE' ? 'Suspend' : 'Reinstate'} cinema ${c.name}`}
                >
                  <Text style={[styles.toggleBtnText, c.status === 'ACTIVE' ? styles.suspendBtnText : styles.activateBtnText]}>
                    {c.status === 'ACTIVE' ? 'Suspend Cinema' : 'Reinstate Cinema'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function OperatorMembershipsView() {
  const { colors } = useTheme();
  const styles = getAdminStyles(colors);
  const staff = [
    { id: '1', name: 'John Doe', email: 'john@silverbird.com', venue: 'Silverbird Galleria', role: 'CINEMA_OPERATOR' },
    { id: '2', name: 'Amina Bello', email: 'amina@filmhouse.ng', venue: 'Filmhouse IMAX', role: 'CINEMA_OPERATOR' },
    { id: '3', name: 'Chidi Okafor', email: 'chidi@genesis.com', venue: 'Genesis Deluxe', role: 'CINEMA_OPERATOR' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>PLATFORM OPERATIONS</Text>
        <Text style={styles.pageTitle}>Operator Memberships</Text>
        <Text style={styles.pageDescription}>Authorize and audit cinema staff memberships and access permissions.</Text>
      </View>

      <View style={styles.cardList}>
        {staff.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyStateIconCircle}>
              <Ionicons name="people-outline" size={40} color={colors.outline} />
            </View>
            <Text style={styles.emptyStateTitle}>No Cinema Staff Memberships</Text>
            <Text style={styles.emptyStateSubtitle}>
              Authorized operator accounts and assigned venues will be audited here.
            </Text>
          </View>
        ) : (
          staff.map(s => (
            <View key={s.id} style={styles.staffCard}>
              <View style={styles.staffMeta}>
                <Text style={styles.staffName}>{s.name}</Text>
                <Text style={styles.staffEmail}>{s.email}</Text>
                <Text style={styles.staffVenue}>Assigned to: {s.venue}</Text>
              </View>
              <TouchableOpacity
                style={styles.revokeBtn}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Revoke access for staff member ${s.name}`}
              >
                <Text style={styles.revokeBtnText}>Revoke</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function AuditTrailView() {
  const { colors } = useTheme();
  const styles = getAdminStyles(colors);
  const auditLogs = [
    { id: '1', actor: 'tomiligali@gmail.com', action: 'CINEMA_SUSPENSION_TOGGLE', target: 'Ozone Cinemas', time: '10 mins ago' },
    { id: '2', actor: 'sarah.connor@matinee.com', action: 'USER_REGISTRATION', target: 'User #ff237284', time: '1 hour ago' },
    { id: '3', actor: 'SYSTEM_DAEMON', action: 'DATABASE_MIGRATION_APPLY', target: 'init_users', time: '2 hours ago' },
    { id: '4', actor: 'SYSTEM_WORKER', action: 'HOLD_EXPIRY_RECLAMATION', target: 'Showtime #102', time: '3 hours ago' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>PLATFORM OPERATIONS</Text>
        <Text style={styles.pageTitle}>Immutable Audit Trail</Text>
        <Text style={styles.pageDescription}>Security-audited ledger of all platform administrative and financial events (PRD FR-16).</Text>
      </View>

      <View style={styles.cardList}>
        {auditLogs.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyStateIconCircle}>
              <Ionicons name="shield-checkmark-outline" size={40} color={colors.outline} />
            </View>
            <Text style={styles.emptyStateTitle}>No Audit Events Logged</Text>
            <Text style={styles.emptyStateSubtitle}>
              Administrative actions, membership revocations, and status changes are permanently recorded here.
            </Text>
          </View>
        ) : (
          auditLogs.map(log => (
            <View key={log.id} style={styles.auditCard}>
              <View style={styles.auditHeaderRow}>
                <Text style={styles.auditAction}>{log.action}</Text>
                <Text style={styles.auditTime}>{log.time}</Text>
              </View>
              <Text style={styles.auditActor}>Actor: {log.actor}</Text>
              <Text style={styles.auditTarget}>Target: {log.target}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function AdminAccountView({ user, onLogout }) {
  const { colors, isDark, setTheme } = useTheme();
  const styles = getAdminStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>PLATFORM OPERATIONS</Text>
        <Text style={styles.pageTitle}>Admin Credentials</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>🛡️</Text>
        </View>
        <View style={styles.profileMeta}>
          <Text style={styles.profileName}>{user?.name || 'Platform Administrator'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.adminRoleBadge}>
            <Text style={styles.adminRoleBadgeText}>PLATFORM ADMIN</Text>
          </View>
        </View>
      </View>

      {/* Appearance & Theme Mode */}
      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>Appearance</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
            <Text style={{ ...Typography.bodyMedium, color: colors.onSurface, fontWeight: '600' }}>Theme Mode:</Text>
          </View>
          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              style={[styles.themeChoiceBtn, isDark && styles.themeChoiceBtnActive]}
              onPress={() => setTheme('dark')}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ selected: isDark }}
              accessibilityLabel="Select Dark Theme"
            >
              <Ionicons name="moon" size={13} color={isDark ? colors.onPrimary : colors.onSurface} style={{ marginRight: 4 }} />
              <Text style={[styles.themeChoiceText, isDark && styles.themeChoiceTextActive]}>Dark</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeChoiceBtn, !isDark && styles.themeChoiceBtnActive]}
              onPress={() => setTheme('light')}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="radio"
              accessibilityState={{ selected: !isDark }}
              accessibilityLabel="Select Light Theme"
            >
              <Ionicons name="sunny" size={13} color={!isDark ? colors.onPrimary : colors.onSurface} style={{ marginRight: 4 }} />
              <Text style={[styles.themeChoiceText, !isDark && styles.themeChoiceTextActive]}>Light</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>Privileged Access Active</Text>
        <Text style={styles.securityDesc}>
          Your account holds unrestricted authorization to inspect platform financial transactions, audit system logs, and modify cinema operational statuses.
        </Text>
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

const createAdminStyles = (colors = Colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, backgroundColor: colors.surface },
  contentArea: { flex: 1 },
  scrollContainer: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  topHeader: { marginBottom: Spacing.md },
  brandSubtitle: { ...Typography.labelSmall, color: colors.primary, letterSpacing: 1.5, fontWeight: '700' },
  pageTitle: { ...Typography.headlineLarge, color: colors.onSurface, marginTop: Spacing.xxs },
  pageDescription: { ...Typography.bodyMedium, color: colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  networkStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: Spacing.sm,
    alignItems: 'center'
  },
  statNum: { ...Typography.headlineMedium, color: colors.primary, fontWeight: '700' },
  statLabel: { ...Typography.labelSmall, color: colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  cardList: { gap: Spacing.sm },
  networkCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: Spacing.md
  },
  networkCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  networkName: { ...Typography.titleMedium, color: colors.onSurface, fontWeight: '700' },
  networkLoc: { ...Typography.bodySmall, color: colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  statusBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: BorderRadius.sm },
  statusActive: { backgroundColor: colors.successContainer },
  statusActiveText: { ...Typography.labelSmall, color: colors.onSuccessContainer, fontWeight: '700' },
  statusSuspended: { backgroundColor: colors.errorContainer },
  statusSuspendedText: { ...Typography.labelSmall, color: colors.onErrorContainer, fontWeight: '700' },
  actionRow: { marginTop: Spacing.sm, alignItems: 'flex-end' },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minHeight: 44,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center'
  },
  suspendBtn: { backgroundColor: colors.errorContainer },
  suspendBtnText: { ...Typography.labelSmall, color: colors.onErrorContainer, fontWeight: '700' },
  activateBtn: { backgroundColor: colors.successContainer },
  activateBtnText: { ...Typography.labelSmall, color: colors.onSuccessContainer, fontWeight: '700' },
  staffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: Spacing.md
  },
  staffMeta: { flex: 1 },
  staffName: { ...Typography.titleMedium, color: colors.onSurface, fontWeight: '700' },
  staffEmail: { ...Typography.bodySmall, color: colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  staffVenue: { ...Typography.bodySmall, color: colors.primary, fontWeight: '600', marginTop: Spacing.xxs },
  revokeBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 44,
    minWidth: 70,
    justifyContent: 'center',
    alignItems: 'center'
  },
  revokeBtnText: { ...Typography.labelSmall, color: colors.error, fontWeight: '700' },
  auditCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: Spacing.md
  },
  auditHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAction: { ...Typography.labelMedium, color: colors.primary, fontWeight: '700' },
  auditTime: { ...Typography.bodySmall, color: colors.onSurface, opacity: 0.8 },
  auditActor: { ...Typography.bodySmall, color: colors.onSurface, marginTop: Spacing.xxs },
  auditTarget: { ...Typography.bodySmall, color: colors.onSurface, opacity: 0.85, marginTop: Spacing.xxs },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  avatarText: { fontSize: 24 },
  profileMeta: { flex: 1 },
  profileName: { ...Typography.titleLarge, color: colors.onSurface, fontWeight: '700' },
  profileEmail: { ...Typography.bodyMedium, color: colors.onSurface, opacity: 0.85 },
  adminRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xxs
  },
  adminRoleBadgeText: { ...Typography.labelSmall, color: colors.onPrimaryContainer, fontWeight: '700' },
  securityBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  securityTitle: { ...Typography.titleMedium, color: colors.onSurface, fontWeight: '700', marginBottom: Spacing.xxs },
  securityDesc: { ...Typography.bodySmall, color: colors.onSurface, opacity: 0.85, lineHeight: 18 },
  logoutButton: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutButtonText: { ...Typography.labelLarge, color: colors.onErrorContainer, fontWeight: '700' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
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
  activeNavItem: { backgroundColor: colors.surfaceContainer },
  navIcon: { fontSize: 20, marginBottom: Spacing.xxs },
  activeNavIcon: { transform: [{ scale: 1.1 }] },
  navLabel: { ...Typography.labelSmall, color: colors.onSurface, opacity: 0.8 },
  activeNavLabel: { color: colors.primary, fontWeight: '700', opacity: 1 },
  emptyStateBox: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md
  },
  emptyStateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm
  },
  emptyStateTitle: {
    ...Typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  emptyStateSubtitle: {
    ...Typography.bodyMedium,
    color: colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 20
  }
,
  themeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: 3
  },
  themeChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minHeight: 36
  },
  themeChoiceBtnActive: {
    backgroundColor: colors.primary
  },
  themeChoiceText: {
    ...Typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '600'
  },
  themeChoiceTextActive: {
    color: colors.onPrimary,
    fontWeight: '700'
  }
});

const adminStylesCache = new Map();
const getAdminStyles = (colors = Colors) => {
  if (!adminStylesCache.has(colors)) {
    adminStylesCache.set(colors, createAdminStyles(colors));
  }
  return adminStylesCache.get(colors);
};

const styles = getAdminStyles(Colors);
