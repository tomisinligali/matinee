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
import { Colors, Spacing, Typography } from '../theme/tokens';

export default function PlatformAdminScreen({ user, onLogout }) {
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
          >
            <Ionicons
              name={activeTab === 'cinemas' ? 'business' : 'business-outline'}
              size={22}
              color={activeTab === 'cinemas' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'cinemas' ? 1 : 0.6, marginBottom: 2 }}
            />
            <Text style={[styles.navLabel, activeTab === 'cinemas' && styles.activeNavLabel]}>Network</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'operators' && styles.activeNavItem]}
            onPress={() => setActiveTab('operators')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'operators' ? 'people' : 'people-outline'}
              size={22}
              color={activeTab === 'operators' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'operators' ? 1 : 0.6, marginBottom: 2 }}
            />
            <Text style={[styles.navLabel, activeTab === 'operators' && styles.activeNavLabel]}>Staff</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'audit' && styles.activeNavItem]}
            onPress={() => setActiveTab('audit')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'audit' ? 'document-text' : 'document-text-outline'}
              size={22}
              color={activeTab === 'audit' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'audit' ? 1 : 0.6, marginBottom: 2 }}
            />
            <Text style={[styles.navLabel, activeTab === 'audit' && styles.activeNavLabel]}>Audit Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'account' && styles.activeNavItem]}
            onPress={() => setActiveTab('account')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'account' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={22}
              color={activeTab === 'account' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'account' ? 1 : 0.6, marginBottom: 2 }}
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
        {cinemas.map(c => (
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
              >
                <Text style={[styles.toggleBtnText, c.status === 'ACTIVE' ? styles.suspendBtnText : styles.activateBtnText]}>
                  {c.status === 'ACTIVE' ? 'Suspend Cinema' : 'Reinstate Cinema'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function OperatorMembershipsView() {
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
        {staff.map(s => (
          <View key={s.id} style={styles.staffCard}>
            <View style={styles.staffMeta}>
              <Text style={styles.staffName}>{s.name}</Text>
              <Text style={styles.staffEmail}>{s.email}</Text>
              <Text style={styles.staffVenue}>Assigned to: {s.venue}</Text>
            </View>
            <TouchableOpacity style={styles.revokeBtn} activeOpacity={0.7}>
              <Text style={styles.revokeBtnText}>Revoke</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function AuditTrailView() {
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
        {auditLogs.map(log => (
          <View key={log.id} style={styles.auditCard}>
            <View style={styles.auditHeaderRow}>
              <Text style={styles.auditAction}>{log.action}</Text>
              <Text style={styles.auditTime}>{log.time}</Text>
            </View>
            <Text style={styles.auditActor}>Actor: {log.actor}</Text>
            <Text style={styles.auditTarget}>Target: {log.target}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function AdminAccountView({ user, onLogout }) {
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

      <View style={styles.securityBox}>
        <Text style={styles.securityTitle}>Privileged Access Active</Text>
        <Text style={styles.securityDesc}>
          Your account holds unrestricted authorization to inspect platform financial transactions, audit system logs, and modify cinema operational statuses.
        </Text>
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
  networkStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.sm,
    alignItems: 'center'
  },
  statNum: { ...Typography.headlineMedium, color: Colors.primary, fontWeight: '700' },
  statLabel: { ...Typography.labelSmall, color: Colors.onSurface, opacity: 0.7, marginTop: 2 },
  cardList: { gap: Spacing.sm },
  networkCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  networkCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  networkName: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  networkLoc: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.6, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: 6 },
  statusActive: { backgroundColor: Colors.successContainer },
  statusActiveText: { ...Typography.labelSmall, color: Colors.onSuccessContainer, fontWeight: '700' },
  statusSuspended: { backgroundColor: Colors.errorContainer },
  statusSuspendedText: { ...Typography.labelSmall, color: Colors.onErrorContainer, fontWeight: '700' },
  actionRow: { marginTop: Spacing.sm, alignItems: 'flex-end' },
  toggleBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: 6 },
  suspendBtn: { backgroundColor: Colors.errorContainer },
  suspendBtnText: { ...Typography.labelSmall, color: Colors.onErrorContainer, fontWeight: '700' },
  activateBtn: { backgroundColor: Colors.successContainer },
  activateBtnText: { ...Typography.labelSmall, color: Colors.onSuccessContainer, fontWeight: '700' },
  staffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  staffMeta: { flex: 1 },
  staffName: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  staffEmail: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.7, marginTop: 1 },
  staffVenue: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  revokeBtn: { backgroundColor: Colors.surfaceContainerHigh, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  revokeBtnText: { ...Typography.labelSmall, color: Colors.error, fontWeight: '700' },
  auditCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md
  },
  auditHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAction: { ...Typography.labelMedium, color: Colors.primary, fontWeight: '700' },
  auditTime: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.5 },
  auditActor: { ...Typography.bodySmall, color: Colors.onSurface, marginTop: 4 },
  auditTarget: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.7, marginTop: 1 },
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
  adminRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4
  },
  adminRoleBadgeText: { ...Typography.labelSmall, color: Colors.onPrimaryContainer, fontWeight: '700' },
  securityBox: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  securityTitle: { ...Typography.titleMedium, color: Colors.onSurface, fontWeight: '700', marginBottom: 4 },
  securityDesc: { ...Typography.bodySmall, color: Colors.onSurface, opacity: 0.8, lineHeight: 18 },
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
