import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Colors, Spacing, Typography } from '../theme/tokens';
import { api } from '../services/api';

export default function DashboardScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'cinemas' | 'tickets' | 'account'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'discover' && <DiscoverView />}
          {activeTab === 'cinemas' && <CinemasView />}
          {activeTab === 'tickets' && <TicketsView />}
          {activeTab === 'account' && <AccountView user={user} onLogout={onLogout} />}
        </View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'discover' && styles.activeNavItem]}
            onPress={() => setActiveTab('discover')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'discover' && styles.activeNavIcon]}>🎬</Text>
            <Text style={[styles.navLabel, activeTab === 'discover' && styles.activeNavLabel]}>
              Discover
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'cinemas' && styles.activeNavItem]}
            onPress={() => setActiveTab('cinemas')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'cinemas' && styles.activeNavIcon]}>🏢</Text>
            <Text style={[styles.navLabel, activeTab === 'cinemas' && styles.activeNavLabel]}>
              Cinemas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'tickets' && styles.activeNavItem]}
            onPress={() => setActiveTab('tickets')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'tickets' && styles.activeNavIcon]}>🎟️</Text>
            <Text style={[styles.navLabel, activeTab === 'tickets' && styles.activeNavLabel]}>
              My Tickets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'account' && styles.activeNavItem]}
            onPress={() => setActiveTab('account')}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, activeTab === 'account' && styles.activeNavIcon]}>👤</Text>
            <Text style={[styles.navLabel, activeTab === 'account' && styles.activeNavLabel]}>
              Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-Views ───────────────────────────────────────────────────────────────

function DiscoverView() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMovies() {
      try {
        setError('');
        const data = await api.getNowPlaying(1);
        if (isMounted && data?.movies) {
          setMovies(data.movies);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Unable to fetch movies.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMovies();
    return () => { isMounted = false; };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>MATINEE MOVIES</Text>
        <Text style={styles.pageTitle}>Now Showing</Text>
      </View>

      <View style={styles.searchBarPlaceholder}>
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholderText}>Search films, genres, or cinemas...</Text>
      </View>

      {/* Featured Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>TMDB Powered</Text>
        </View>
        <Text style={styles.bannerTitle}>Experience Cinema in High Definition</Text>
        <Text style={styles.bannerDesc}>
          Browse upcoming schedules, select your favorite seats, and reserve tickets with zero hassle.
        </Text>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>In Theatres Today</Text>
        <Text style={styles.movieCountText}>{movies.length} Films</Text>
      </View>

      {/* Movie Grid / List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching latest releases...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.movieGrid}>
          {movies.map(movie => (
            <TouchableOpacity
              key={movie.id}
              style={styles.movieCard}
              onPress={() => setSelectedMovie(movie)}
              activeOpacity={0.8}
            >
              {movie.posterUrl ? (
                <Image
                  source={{ uri: movie.posterUrl }}
                  style={styles.moviePoster}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.moviePosterPlaceholder}>
                  <Text style={styles.posterEmoji}>🎬</Text>
                </View>
              )}
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>★ {movie.rating}</Text>
              </View>
              <Text style={styles.movieCardTitle} numberOfLines={2}>
                {movie.title}
              </Text>
              <Text style={styles.movieCardDate}>
                {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'Now Showing'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* TMDB Attribution Banner (Required by TMDB API Terms) */}
      <View style={styles.tmdbAttributionBox}>
        <Text style={styles.tmdbLogoText}>THE MOVIE DATABASE</Text>
        <Text style={styles.tmdbDisclaimerText}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
      </View>

      {/* Movie Details Modal */}
      <Modal
        visible={Boolean(selectedMovie)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMovie(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMovie?.backdropUrl ? (
              <Image
                source={{ uri: selectedMovie.backdropUrl }}
                style={styles.modalBackdrop}
                resizeMode="cover"
              />
            ) : null}

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{selectedMovie?.title}</Text>
                <TouchableOpacity onPress={() => setSelectedMovie(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalRating}>★ {selectedMovie?.rating} / 10</Text>
                <Text style={styles.modalReleaseDate}>Released: {selectedMovie?.releaseDate}</Text>
              </View>

              <Text style={styles.modalSectionTitle}>Synopsis</Text>
              <Text style={styles.modalSynopsis}>{selectedMovie?.synopsis}</Text>

              <TouchableOpacity
                style={styles.selectSeatsBtn}
                onPress={() => setSelectedMovie(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectSeatsBtnText}>Select Showtime & Seats</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const NIGERIAN_CINEMAS = [
  {
    id: '1',
    name: 'Filmhouse Cinemas IMAX',
    city: 'Lekki',
    state: 'Lagos',
    address: 'Bisola Durosinmi Etti Drive, Lekki Phase 1',
    screens: 5,
    formats: ['IMAX', '3D', 'VIP']
  },
  {
    id: '2',
    name: 'Silverbird Galleria',
    city: 'Victoria Island',
    state: 'Lagos',
    address: '133 Ahmadu Bello Way, Victoria Island',
    screens: 5,
    formats: ['Standard', 'VIP']
  },
  {
    id: '3',
    name: 'Genesis Deluxe Cinemas',
    city: 'Lekki',
    state: 'Lagos',
    address: 'The Palms Shopping Mall, Bisway Street',
    screens: 6,
    formats: ['3D', 'VIP']
  },
  {
    id: '4',
    name: 'EbonyLife Cinemas',
    city: 'Victoria Island',
    state: 'Lagos',
    address: 'EbonyLife Place, 1637 Adetokunbo Ademola St',
    screens: 5,
    formats: ['VIP Dining', 'Dolby Atmos']
  },
  {
    id: '5',
    name: 'Ozone Cinemas',
    city: 'Yaba',
    state: 'Lagos',
    address: 'E-Center, 1-11 Commercial Avenue',
    screens: 4,
    formats: ['2D', '3D']
  },
  {
    id: '6',
    name: 'Silverbird Entertainment Centre',
    city: 'CBD',
    state: 'Abuja',
    address: 'Plot 1161, Memorial Drive, Central Business District',
    screens: 12,
    formats: ['3D', 'VIP Lounge']
  },
  {
    id: '7',
    name: 'Genesis Cinemas (Ceddi Plaza)',
    city: 'Central Area',
    state: 'Abuja',
    address: 'Ceddi Plaza, 264 Tafawa Balewa Way',
    screens: 3,
    formats: ['Standard', 'VIP']
  },
  {
    id: '8',
    name: 'Viva Cinemas',
    city: 'Enugu',
    state: 'Enugu',
    address: 'Polo Park Mall, Abakaliki Road',
    screens: 4,
    formats: ['Digital Sound', '3D']
  },
  {
    id: '9',
    name: 'Filmhouse Cinema (Dugbe)',
    city: 'Ibadan',
    state: 'Oyo',
    address: 'Heritage Mall, Dugbe',
    screens: 5,
    formats: ['Standard', '3D']
  },
  {
    id: '10',
    name: 'Genesis Cinemas',
    city: 'Port Harcourt',
    state: 'Rivers',
    address: 'Genesis Center, 52 Tombia Street, GRA Phase 2',
    screens: 4,
    formats: ['3D', 'VIP']
  }
];

function CinemasView() {
  const [selectedState, setSelectedState] = useState('All');
  const states = ['All', 'Lagos', 'Abuja', 'Enugu', 'Oyo', 'Rivers'];

  const filteredCinemas = selectedState === 'All'
    ? NIGERIAN_CINEMAS
    : NIGERIAN_CINEMAS.filter(c => c.state === selectedState);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>MATINEE NIGERIA</Text>
        <Text style={styles.pageTitle}>Participating Cinemas</Text>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {states.map(st => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, selectedState === st && styles.activeFilterChip]}
            onPress={() => setSelectedState(st)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, selectedState === st && styles.activeFilterChipText]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cinema Cards */}
      <View style={styles.cinemaList}>
        {filteredCinemas.map(cinema => (
          <View key={cinema.id} style={styles.cinemaItem}>
            <View style={styles.cinemaIconBox}>
              <Text style={styles.cinemaItemIcon}>🏛️</Text>
            </View>
            <View style={styles.cinemaDetails}>
              <View style={styles.cinemaHeaderRow}>
                <Text style={styles.cinemaName}>{cinema.name}</Text>
                <View style={styles.screenCountBadge}>
                  <Text style={styles.screenCountText}>{cinema.screens} Screens</Text>
                </View>
              </View>
              <Text style={styles.cinemaAddress}>
                {cinema.address} • {cinema.city}, {cinema.state}
              </Text>
              <View style={styles.formatRow}>
                {cinema.formats.map((fmt, idx) => (
                  <View key={idx} style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>{fmt}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function TicketsView() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>MATINEE</Text>
        <Text style={styles.pageTitle}>My Bookings</Text>
      </View>

      <View style={styles.emptyStateBox}>
        <Text style={styles.emptyStateEmoji}>🎟️</Text>
        <Text style={styles.emptyStateTitle}>No Active Tickets</Text>
        <Text style={styles.emptyStateSubtitle}>
          When you book tickets, your confirmed bookings and gate QR codes will appear right here.
        </Text>
      </View>
    </ScrollView>
  );
}

function AccountView({ user, onLogout }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>MATINEE</Text>
        <Text style={styles.pageTitle}>Account Profile</Text>
      </View>

      {/* User Card */}
      <View style={styles.accountCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.accountHeaderMeta}>
          <Text style={styles.accountName}>{user?.name || 'Customer'}</Text>
          <Text style={styles.accountEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Membership & Security */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>Membership & Access</Text>
        <View style={styles.accountRow}>
          <Text style={styles.rowLabel}>Account Type</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user?.role || 'CUSTOMER'}</Text>
          </View>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.rowLabel}>Account Status</Text>
          <Text style={[styles.rowValue, { color: Colors.success, fontWeight: '700' }]}>Active</Text>
        </View>
      </View>

      {/* Logout Action */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.85}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface
  },
  container: {
    flex: 1,
    backgroundColor: Colors.surface
  },
  contentArea: {
    flex: 1
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl
  },
  topHeader: {
    marginBottom: Spacing.md
  },
  brandSubtitle: {
    ...Typography.labelSmall,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700'
  },
  pageTitle: {
    ...Typography.headlineLarge,
    color: Colors.onSurface,
    marginTop: Spacing.xxs
  },
  searchBarPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md
  },
  searchIcon: {
    marginRight: Spacing.xs,
    fontSize: 16
  },
  searchPlaceholderText: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.5
  },
  bannerCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    marginBottom: Spacing.xs
  },
  bannerBadgeText: {
    ...Typography.labelSmall,
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  bannerTitle: {
    ...Typography.headlineSmall,
    color: Colors.onPrimaryContainer,
    marginBottom: Spacing.xxs
  },
  bannerDesc: {
    ...Typography.bodyMedium,
    color: Colors.onPrimaryContainer,
    opacity: 0.85,
    lineHeight: 20
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  sectionHeader: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700'
  },
  movieCountText: {
    ...Typography.labelSmall,
    color: Colors.primary,
    fontWeight: '700'
  },
  loadingBox: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.7,
    marginTop: Spacing.xs
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between'
  },
  movieCard: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
    position: 'relative'
  },
  moviePoster: {
    width: '100%',
    height: 190,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer
  },
  moviePosterPlaceholder: {
    width: '100%',
    height: 190,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center'
  },
  posterEmoji: {
    fontSize: 40
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  ratingBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700'
  },
  movieCardTitle: {
    ...Typography.labelMedium,
    color: Colors.onSurface,
    marginTop: Spacing.xs,
    fontWeight: '700',
    lineHeight: 18
  },
  movieCardDate: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.6,
    marginTop: 2
  },
  tmdbAttributionBox: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 10,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center'
  },
  tmdbLogoText: {
    ...Typography.labelSmall,
    color: Colors.primary,
    letterSpacing: 1.5,
    fontWeight: '800'
  },
  tmdbDisclaimerText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden'
  },
  modalBackdrop: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surfaceContainer
  },
  modalScroll: {
    padding: Spacing.lg
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs
  },
  modalTitle: {
    ...Typography.headlineMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.sm
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: {
    fontSize: 16,
    color: Colors.onSurface,
    fontWeight: '700'
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md
  },
  modalRating: {
    ...Typography.labelMedium,
    color: Colors.primary,
    fontWeight: '700'
  },
  modalReleaseDate: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.6
  },
  modalSectionTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xs
  },
  modalSynopsis: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: Spacing.lg
  },
  selectSeatsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  selectSeatsBtnText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.md
  },
  cardHeader: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  cardBody: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.7,
    lineHeight: 20
  },
  cinemaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.sm
  },
  cinemaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm
  },
  cinemaItemIcon: {
    fontSize: 20
  },
  cinemaDetails: {
    flex: 1
  },
  cinemaName: {
    ...Typography.labelLarge,
    color: Colors.onSurface
  },
  cinemaAddress: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.6,
    marginTop: 2
  },
  chipScroll: {
    marginBottom: Spacing.md
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainer,
    marginRight: Spacing.xs
  },
  activeFilterChip: {
    backgroundColor: Colors.primary
  },
  filterChipText: {
    ...Typography.labelMedium,
    color: Colors.onSurface
  },
  activeFilterChipText: {
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  cinemaList: {
    gap: Spacing.sm
  },
  cinemaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  screenCountBadge: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 6,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2
  },
  screenCountText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    fontSize: 11
  },
  formatRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    gap: Spacing.xxs
  },
  formatBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2
  },
  formatBadgeText: {
    ...Typography.labelSmall,
    color: Colors.onPrimaryContainer,
    fontSize: 10,
    fontWeight: '700'
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.lg
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm
  },
  emptyStateTitle: {
    ...Typography.headlineMedium,
    color: Colors.onSurface,
    marginBottom: Spacing.xxs
  },
  emptyStateSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onPrimaryContainer
  },
  accountHeaderMeta: {
    flex: 1
  },
  accountName: {
    ...Typography.titleLarge,
    color: Colors.onSurface,
    fontWeight: '700'
  },
  accountEmail: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.7
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  sectionCardTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.sm
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainer
  },
  rowLabel: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.7
  },
  rowValue: {
    ...Typography.bodyMedium,
    color: Colors.onSurface
  },
  badge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs
  },
  badgeText: {
    ...Typography.labelSmall,
    color: Colors.onPrimaryContainer,
    fontWeight: '700'
  },
  logoutButton: {
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutButtonText: {
    ...Typography.labelLarge,
    color: Colors.onErrorContainer,
    fontWeight: '700'
  },

  // Bottom Navigation Bar
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
    paddingVertical: Spacing.xxs,
    borderRadius: 8
  },
  activeNavItem: {
    backgroundColor: Colors.surfaceContainer
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2
  },
  activeNavIcon: {
    transform: [{ scale: 1.1 }]
  },
  navLabel: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.6
  },
  activeNavLabel: {
    color: Colors.primary,
    fontWeight: '700',
    opacity: 1
  }
});
