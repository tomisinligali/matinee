import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme/tokens';
import { api } from '../services/api';
import { MovieGridSkeleton } from '../components/SkeletonLoader';
import { SeatSelectionModal } from '../components/SeatSelectionModal';

export default function DashboardScreen({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'cinemas' | 'tickets' | 'account'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'discover' && <DiscoverView />}
          {activeTab === 'cinemas' && <CinemasView />}
          {activeTab === 'tickets' && <TicketsView onBrowse={() => setActiveTab('discover')} />}
          {activeTab === 'account' && <AccountView user={user} onLogout={onLogout} />}
        </View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'discover' && styles.activeNavItem]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setActiveTab('discover');
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Discover movies tab"
            accessibilityState={{ selected: activeTab === 'discover' }}
          >
            <Ionicons
              name={activeTab === 'discover' ? 'film' : 'film-outline'}
              size={22}
              color={activeTab === 'discover' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'discover' ? 1 : 0.85, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'discover' && styles.activeNavLabel]}>
              Discover
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'cinemas' && styles.activeNavItem]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setActiveTab('cinemas');
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Participating cinemas tab"
            accessibilityState={{ selected: activeTab === 'cinemas' }}
          >
            <Ionicons
              name={activeTab === 'cinemas' ? 'business' : 'business-outline'}
              size={22}
              color={activeTab === 'cinemas' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'cinemas' ? 1 : 0.85, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'cinemas' && styles.activeNavLabel]}>
              Cinemas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'tickets' && styles.activeNavItem]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setActiveTab('tickets');
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="My tickets tab"
            accessibilityState={{ selected: activeTab === 'tickets' }}
          >
            <Ionicons
              name={activeTab === 'tickets' ? 'ticket' : 'ticket-outline'}
              size={22}
              color={activeTab === 'tickets' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'tickets' ? 1 : 0.85, marginBottom: Spacing.xxs }}
            />
            <Text style={[styles.navLabel, activeTab === 'tickets' && styles.activeNavLabel]}>
              My Tickets
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'account' && styles.activeNavItem]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setActiveTab('account');
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Account and profile tab"
            accessibilityState={{ selected: activeTab === 'account' }}
          >
            <Ionicons
              name={activeTab === 'account' ? 'person' : 'person-outline'}
              size={22}
              color={activeTab === 'account' ? Colors.primary : Colors.onSurface}
              style={{ opacity: activeTab === 'account' ? 1 : 0.85, marginBottom: Spacing.xxs }}
            />
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Films');
  const [detailSubTab, setDetailSubTab] = useState('overview');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);

  const scrollRef = useRef(null);

  const CATEGORIES = ['All Films', 'Top Rated ★', 'Trending', 'Popular'];

  const SAMPLE_CAST = [
    { id: '1', name: "Lupita Nyong'o", role: 'Roz (Voice)', initials: 'LN' },
    { id: '2', name: 'Pedro Pascal', role: 'Fink (Voice)', initials: 'PP' },
    { id: '3', name: "Catherine O'Hara", role: 'Pinktail (Voice)', initials: 'CO' },
    { id: '4', name: 'Bill Nighy', role: 'Longneck (Voice)', initials: 'BN' },
    { id: '5', name: 'Kit Connor', role: 'Brightbill (Voice)', initials: 'KC' }
  ];

  async function loadMovies(pageToLoad = 1, append = false) {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }

      const data = await api.getNowPlaying(pageToLoad);
      if (data?.movies) {
        if (append) {
          setMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.movies.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMovies];
          });
        } else {
          setMovies(data.movies);
        }
        setPage(data.page || pageToLoad);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Unable to fetch movies.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadMovies(1, false);
  }, []);

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 300) {
      if (!showBackToTop) setShowBackToTop(true);
    } else {
      if (showBackToTop) setShowBackToTop(false);
    }

    if (offsetY > 30) {
      if (!isScrolled) setIsScrolled(true);
    } else {
      if (isScrolled) setIsScrolled(false);
    }
  };

  let filteredMovies = movies;
  if (searchQuery.trim()) {
    filteredMovies = filteredMovies.filter(m => m.title?.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  } else if (selectedCategory === 'Top Rated ★') {
    filteredMovies = [...filteredMovies].filter(m => (parseFloat(m.rating) || 0) >= 7.0);
  } else if (selectedCategory === 'Trending') {
    filteredMovies = [...filteredMovies].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
  } else if (selectedCategory === 'Popular') {
    filteredMovies = [...filteredMovies].filter(m => (parseFloat(m.rating) || 0) >= 6.5);
  }

  const renderMovieItem = ({ item: movie }) => (
    <TouchableOpacity
      key={movie.id}
      style={styles.movieCard}
      onPress={() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
        setSelectedMovie(movie);
        setDetailSubTab('overview');
      }}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${movie.title}, rated ${movie.rating} out of 10. ${movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'Now showing'}`}
    >
      {movie.posterUrl ? (
        <ExpoImage
          source={{ uri: movie.posterUrl }}
          style={styles.moviePoster}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
          accessible={true}
          accessibilityRole="image"
          accessibilityLabel={`Movie poster for ${movie.title}`}
        />
      ) : (
        <View style={styles.moviePosterPlaceholder}>
          <Ionicons name="film-outline" size={40} color={Colors.outline} />
        </View>
      )}
      <View style={styles.ratingBadge}>
        <Ionicons name="star" size={11} color="#FFD700" style={{ marginRight: Spacing.xxs }} />
        <Text style={styles.ratingBadgeText}>{movie.rating}</Text>
      </View>
      <Text style={styles.movieCardTitle} numberOfLines={2}>
        {movie.title}
      </Text>
      <Text style={styles.movieCardDate}>
        {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'Now Showing'}
      </Text>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View>
      {/* Index 0: Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>MATINEE MOVIES</Text>
        <Text style={styles.pageTitle}>Now Showing</Text>
      </View>

      {/* Index 1: Sticky Search Input */}
      <View style={[styles.stickySearchWrapper, isScrolled && styles.stickySearchWrapperScrolled]}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color={Colors.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search films by title..."
            placeholderTextColor={Colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessible={true}
            accessibilityLabel="Search films by title"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Clear search input"
            >
              <Ionicons name="close-circle" size={18} color={Colors.onSurface} style={{ opacity: 0.85 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Index 2: Category Filter Pills */}
      {!searchQuery.trim() && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPillsScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.activeCategoryPill]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                setSelectedCategory(cat);
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat}`}
              accessibilityState={{ selected: selectedCategory === cat }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={[styles.categoryPillText, selectedCategory === cat && styles.activeCategoryPillText]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Index 3: Featured Banner */}
      {!searchQuery.trim() && (
        <View style={styles.bannerCard}>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>PREMIERES & BLOCKBUSTERS</Text>
          </View>
          <Text style={styles.bannerTitle}>Experience Cinema in High Definition</Text>
          <Text style={styles.bannerDesc}>
            Browse upcoming schedules, select your favorite seats, and reserve tickets with zero hassle.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>
          {searchQuery.trim() ? `Search Results (${filteredMovies.length})` : 'In Theatres Today'}
        </Text>
        <Text style={styles.movieCountText}>{filteredMovies.length} Films</Text>
      </View>

      {/* Skeleton Loading State during fetch */}
      {loading && <MovieGridSkeleton count={6} />}

      {/* Designed Error State with Actionable Recovery CTA */}
      {Boolean(error) && (
        <View style={styles.errorCard}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="cloud-offline-outline" size={32} color={Colors.onErrorContainer} />
          </View>
          <Text style={styles.errorCardTitle}>Unable to Load Schedules</Text>
          <Text style={styles.errorCardSubtitle}>
            {error || 'Could not connect to cinema scheduling servers. Please check your connection.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              loadMovies(1);
            }}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Retry fetching movie schedules"
          >
            <Ionicons name="refresh" size={16} color={Colors.onPrimary} style={{ marginRight: Spacing.xs }} />
            <Text style={styles.retryButtonText}>Retry Screening Fetch</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderListEmpty = () => {
    if (loading || error) return null;
    return (
      <View style={styles.emptySearchBox}>
        <View style={styles.emptySearchIconCircle}>
          <Ionicons name="search-outline" size={32} color={Colors.outline} />
        </View>
        <Text style={styles.emptySearchTitle}>No Screening Matches Found</Text>
        <Text style={styles.emptySearchText}>
          We couldn't find any movie titled "{searchQuery}". Try searching by another keyword.
        </Text>
        <TouchableOpacity
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
            setSearchQuery('');
          }}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Reset search filter"
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={styles.clearSearchBtnText}>Reset Search Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderListFooter = () => (
    <View>
      {/* Pagination Controls */}
      {!searchQuery.trim() && page < totalPages && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => loadMovies(page + 1, true)}
          disabled={loadingMore}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Load more releases, page ${page + 1} of ${totalPages}`}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Text style={styles.loadMoreButtonText}>
              Load More Releases (Page {page} of {totalPages})
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Discreet Legal & Attribution Footer */}
      <View style={styles.footerAttribution}>
        <Text style={styles.footerAttributionText}>
          Film metadata provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.discoverContainer}>
      <FlatList
        ref={scrollRef}
        data={loading || error ? [] : filteredMovies}
        keyExtractor={item => String(item.id)}
        renderItem={renderMovieItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={renderListFooter}
      />

        {/* Full-Screen Movie Details Page (Funflix & Letterboxd inspired) */}
        <Modal
          visible={Boolean(selectedMovie)}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setSelectedMovie(null)}
        >
          <View style={styles.fullScreenContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.fullScreenScroll}>
              {/* Hero Backdrop with Top Scrim & Floating Bar */}
              <View style={styles.fullScreenBackdropWrapper}>
                {selectedMovie?.backdropUrl || selectedMovie?.posterUrl ? (
                  <ExpoImage
                    source={{ uri: selectedMovie.backdropUrl || selectedMovie.posterUrl }}
                    style={styles.fullScreenBackdrop}
                    contentFit="cover"
                    transition={350}
                    cachePolicy="memory-disk"
                    priority="high"
                    accessible={true}
                    accessibilityRole="image"
                    accessibilityLabel={`Backdrop for ${selectedMovie?.title}`}
                  />
                ) : (
                  <View style={styles.fullScreenBackdropPlaceholder}>
                    <Ionicons name="film-outline" size={60} color={Colors.outline} />
                  </View>
                )}
                {/* Dark gradient scrim */}
                <View style={styles.backdropScrim} />

                {/* Floating Top Controls */}
                <SafeAreaView style={styles.fullScreenTopNav}>
                  <TouchableOpacity
                    onPress={() => setSelectedMovie(null)}
                    style={styles.circleIconBtn}
                    activeOpacity={0.8}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Close movie details"
                  >
                    <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
                  </TouchableOpacity>

                  <View style={styles.topNavRightActions}>
                    <TouchableOpacity
                      onPress={() => {
                        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
                        setIsBookmarked(prev => !prev);
                      }}
                      style={styles.circleIconBtn}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={isBookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
                    >
                      <Ionicons
                        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={isBookmarked ? Colors.primary : Colors.onSurface}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.circleIconBtn}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Share movie details"
                    >
                      <Ionicons name="share-social-outline" size={20} color={Colors.onSurface} />
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </View>

              {/* Main Content Body */}
              <View style={styles.fullScreenBody}>
                {/* Title */}
                <Text style={styles.fullScreenTitle}>{selectedMovie?.title}</Text>

                {/* Metadata Pills */}
                <View style={styles.fullScreenMetaRow}>
                  <View style={styles.ratingPill}>
                    <Ionicons name="star" size={13} color="#FFD700" style={{ marginRight: Spacing.xxs }} />
                    <Text style={styles.ratingPillText}>{selectedMovie?.rating} / 10</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {selectedMovie?.releaseDate ? new Date(selectedMovie.releaseDate).getFullYear() : '2024'}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>PG-13</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>IMAX • 2D</Text>
                  </View>
                </View>

                {/* Primary Booking Call-To-Action */}
                <TouchableOpacity
                  style={styles.primaryBookButton}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (_) {}
                    setShowSeatModal(true);
                  }}
                  activeOpacity={0.85}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Select showtime and book seats"
                >
                  <Ionicons name="ticket" size={20} color={Colors.onPrimary} style={{ marginRight: Spacing.xs }} />
                  <Text style={styles.primaryBookButtonText}>Select Showtime & Book Seats</Text>
                </TouchableOpacity>

                {/* Sub Tabs: Overview | Cast & Crew | Showtimes */}
                <View style={styles.detailTabsRow}>
                  <TouchableOpacity
                    style={[styles.detailTabItem, detailSubTab === 'overview' && styles.activeDetailTabItem]}
                    onPress={() => setDetailSubTab('overview')}
                    accessible={true}
                    accessibilityRole="tab"
                    accessibilityLabel="Overview tab"
                    accessibilityState={{ selected: detailSubTab === 'overview' }}
                  >
                    <Text style={[styles.detailTabText, detailSubTab === 'overview' && styles.activeDetailTabText]}>
                      Overview
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailTabItem, detailSubTab === 'cast' && styles.activeDetailTabItem]}
                    onPress={() => setDetailSubTab('cast')}
                    accessible={true}
                    accessibilityRole="tab"
                    accessibilityLabel="Cast and crew tab"
                    accessibilityState={{ selected: detailSubTab === 'cast' }}
                  >
                    <Text style={[styles.detailTabText, detailSubTab === 'cast' && styles.activeDetailTabText]}>
                      Cast & Crew
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailTabItem, detailSubTab === 'showtimes' && styles.activeDetailTabItem]}
                    onPress={() => setDetailSubTab('showtimes')}
                    accessible={true}
                    accessibilityRole="tab"
                    accessibilityLabel="Showtimes tab"
                    accessibilityState={{ selected: detailSubTab === 'showtimes' }}
                  >
                    <Text style={[styles.detailTabText, detailSubTab === 'showtimes' && styles.activeDetailTabText]}>
                      Showtimes
                    </Text>
                  </TouchableOpacity>
                </View>

                {detailSubTab === 'overview' && (
                  <View style={styles.subTabContent}>
                    <Text style={styles.fullScreenSectionHeader}>Synopsis</Text>
                    <Text style={styles.fullScreenSynopsis}>
                      {selectedMovie?.synopsis || 'No overview available for this screening.'}
                    </Text>

                    <Text style={styles.fullScreenSectionHeader}>Key Information</Text>
                    <View style={styles.metaGrid}>
                      <View style={styles.metaGridItem}>
                        <Text style={styles.metaGridLabel}>Cinema Release</Text>
                        <Text style={styles.metaGridValue}>{selectedMovie?.releaseDate || 'Now In Theatres'}</Text>
                      </View>
                      <View style={styles.metaGridItem}>
                        <Text style={styles.metaGridLabel}>Formats Available</Text>
                        <Text style={styles.metaGridValue}>IMAX Laser • Standard 2D</Text>
                      </View>
                    </View>
                  </View>
                )}

                {detailSubTab === 'cast' && (
                  <View style={styles.subTabContent}>
                    <Text style={styles.fullScreenSectionHeader}>Top Billed Cast</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.castScroll}>
                      {SAMPLE_CAST.map(actor => (
                        <View key={actor.id} style={styles.castCard}>
                          <View style={styles.castAvatarCircle}>
                            <Text style={styles.castAvatarInitial}>{actor.initials}</Text>
                          </View>
                          <Text style={styles.castActorName} numberOfLines={1}>{actor.name}</Text>
                          <Text style={styles.castRoleName} numberOfLines={1}>{actor.role}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {detailSubTab === 'showtimes' && (
                  <View style={styles.subTabContent}>
                    <Text style={styles.fullScreenSectionHeader}>Today's Schedules</Text>
                    <View style={styles.showtimeCard}>
                      <View style={styles.showtimeHeader}>
                        <Text style={styles.showtimeCinema}>Filmhouse Cinemas (Lekki)</Text>
                        <Text style={styles.showtimePrice}>₦4,500</Text>
                      </View>
                      <Text style={styles.showtimeScreen}>Screen 1 • IMAX Laser</Text>
                      <View style={styles.timePillsRow}>
                        <View style={styles.timePill}><Text style={styles.timePillText}>2:30 PM</Text></View>
                        <View style={[styles.timePill, styles.activeTimePill]}><Text style={styles.activeTimePillText}>5:15 PM</Text></View>
                        <View style={styles.timePill}><Text style={styles.timePillText}>8:00 PM</Text></View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Interactive Seat Selection & Booking Confirmation Modal */}
        <SeatSelectionModal
          visible={showSeatModal}
          movie={selectedMovie}
          onClose={() => setShowSeatModal(false)}
        />

      {/* Floating Back To Top Button */}
      {showBackToTop && (
        <TouchableOpacity
          style={styles.backToTopButton}
          onPress={() => scrollRef.current?.scrollToOffset({ offset: 0, animated: true })}
          activeOpacity={0.85}
          accessibilityLabel="Back to top"
        >
          <Ionicons name="arrow-up" size={24} color={Colors.onPrimary} />
        </TouchableOpacity>
      )}
    </View>
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
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
              setSelectedState(st);
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Filter cinemas by ${st}`}
            accessibilityState={{ selected: selectedState === st }}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
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
              <Ionicons name="business-outline" size={22} color={Colors.primary} />
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

function TicketsView({ onBrowse }) {
  const [ticketTab, setTicketTab] = useState('upcoming');

  const DEMO_TICKET = {
    bookingRef: 'MTN-9482-LKK',
    movieTitle: 'The Wild Robot',
    cinema: 'Filmhouse Cinemas, Lekki Phase 1',
    screen: 'Screen 1 (IMAX Laser)',
    date: 'Today, Oct 19',
    time: '7:45 PM',
    row: 'Row F',
    seats: 'Seats 12, 13',
    format: 'IMAX 2D',
    status: 'CONFIRMED'
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeader}>
        <Text style={styles.brandSubtitle}>MATINEE DIGITAL PASS</Text>
        <Text style={styles.pageTitle}>My Tickets</Text>
      </View>

      {/* Segment Switcher */}
      <View style={styles.ticketSegmentWrapper}>
        <TouchableOpacity
          style={[styles.ticketSegmentBtn, ticketTab === 'upcoming' && styles.activeTicketSegmentBtn]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
            setTicketTab('upcoming');
          }}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="tab"
          accessibilityLabel="Upcoming passes"
          accessibilityState={{ selected: ticketTab === 'upcoming' }}
        >
          <Text style={[styles.ticketSegmentText, ticketTab === 'upcoming' && styles.activeTicketSegmentText]}>
            Upcoming Passes (1)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ticketSegmentBtn, ticketTab === 'past' && styles.activeTicketSegmentBtn]}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
            setTicketTab('past');
          }}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="tab"
          accessibilityLabel="Past bookings"
          accessibilityState={{ selected: ticketTab === 'past' }}
        >
          <Text style={[styles.ticketSegmentText, ticketTab === 'past' && styles.activeTicketSegmentText]}>
            Past Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {ticketTab === 'upcoming' ? (
        <View style={styles.ticketPassContainer}>
          {/* Authentic Physical Cinema Notch Ticket Pass */}
          <View style={styles.notchTicketCard}>
            {/* Semicircular Ticket Notches on Left and Right edges */}
            <View style={styles.notchLeft} />
            <View style={styles.notchRight} />

            {/* Top Ticket Header: Movie Details */}
            <View style={styles.ticketTopSection}>
              <View style={styles.ticketHeaderBadgeRow}>
                <View style={styles.ticketStatusBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.onSuccessContainer} style={{ marginRight: Spacing.xxs }} />
                  <Text style={styles.ticketStatusBadgeText}>{DEMO_TICKET.status}</Text>
                </View>
                <Text style={styles.ticketFormatText}>{DEMO_TICKET.format}</Text>
              </View>

              <Text style={styles.ticketMovieTitle}>{DEMO_TICKET.movieTitle}</Text>
              <View style={styles.ticketVenueRow}>
                <Ionicons name="location-outline" size={13} color={Colors.primary} style={{ marginRight: Spacing.xxs }} />
                <Text style={styles.ticketCinemaVenue}>{DEMO_TICKET.cinema}</Text>
              </View>
            </View>

            {/* Perforated Divider with dashed dots */}
            <View style={styles.perforatedDivider}>
              <View style={styles.perforatedDashes} />
            </View>

            {/* Bottom Ticket Stub: Screening & Seating Matrix */}
            <View style={styles.ticketStubSection}>
              <View style={styles.ticketDataGrid}>
                <View style={styles.ticketDataCol}>
                  <Text style={styles.ticketDataLabel}>DATE</Text>
                  <Text style={styles.ticketDataValue}>{DEMO_TICKET.date}</Text>
                </View>
                <View style={styles.ticketDataCol}>
                  <Text style={styles.ticketDataLabel}>TIME</Text>
                  <Text style={styles.ticketDataValue}>{DEMO_TICKET.time}</Text>
                </View>
                <View style={styles.ticketDataCol}>
                  <Text style={styles.ticketDataLabel}>HALL</Text>
                  <Text style={styles.ticketDataValue}>Screen 1</Text>
                </View>
                <View style={styles.ticketDataCol}>
                  <Text style={styles.ticketDataLabel}>SEATS</Text>
                  <Text style={styles.ticketDataValueHighlight}>{DEMO_TICKET.row} • 12, 13</Text>
                </View>
              </View>

              {/* Barcode Graphic & Turnstile Scan Prompt */}
              <View style={styles.barcodeWrapper}>
                <View style={styles.barcodeBars}>
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4].map((w, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: w * 2,
                        height: 44,
                        backgroundColor: Colors.onSurface,
                        marginRight: Spacing.xxs
                      }}
                    />
                  ))}
                </View>
                <Text style={styles.barcodeBookingRef}>BOOKING REF: {DEMO_TICKET.bookingRef}</Text>
                <View style={styles.barcodePromptRow}>
                  <Ionicons name="scan-outline" size={14} color={Colors.primary} style={{ marginRight: Spacing.xxs }} />
                  <Text style={styles.barcodePromptText}>Scan this digital barcode at cinema turnstile</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyStateBox}>
          <View style={styles.emptyStateIconCircle}>
            <Ionicons name="time-outline" size={44} color={Colors.outline} />
          </View>
          <Text style={styles.emptyStateTitle}>No Past Bookings</Text>
          <Text style={styles.emptyStateSubtitle}>
            Completed movie bookings from previous visits will be archived here.
          </Text>
          {onBrowse && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
                onBrowse();
              }}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Explore movies in theatres"
            >
              <Text style={styles.emptyActionBtnText}>Explore In Theatres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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

      {/* About & Attribution */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>About & Legal</Text>
        <View style={styles.accountRow}>
          <Text style={styles.rowLabel}>App Version</Text>
          <Text style={styles.rowValue}>1.0.0 (MVP)</Text>
        </View>
        <View style={styles.accountRow}>
          <Text style={styles.rowLabel}>Movie Data</Text>
          <Text style={styles.rowValue}>TMDB API</Text>
        </View>
        <Text style={styles.aboutDisclaimerText}>
          Film posters, descriptions, and ratings provided by The Movie Database. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
      </View>

      {/* Logout Action */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Log out of account"
      >
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
  discoverContainer: {
    flex: 1,
    position: 'relative'
  },
  stickySearchWrapper: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    zIndex: 10
  },
  stickySearchWrapperScrolled: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    ...Shadows.soft
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    minHeight: 48
  },
  searchIcon: {
    marginRight: Spacing.xs,
    fontSize: 16
  },
  searchInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    paddingVertical: Spacing.none
  },
  clearSearchButton: {
    padding: Spacing.xxs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  clearSearchIcon: {
    fontSize: 14,
    color: Colors.onSurface,
    opacity: 0.85,
    fontWeight: '700'
  },
  emptySearchBox: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySearchIconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm
  },
  emptySearchTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  emptySearchText: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: Spacing.md
  },
  clearSearchBtnText: {
    ...Typography.labelMedium,
    color: Colors.primary,
    fontWeight: '700'
  },
  backToTopButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.hard,
    zIndex: 99
  },
  bannerCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
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
    opacity: 0.85,
    marginTop: Spacing.xs
  },
  errorCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm
  },
  errorCardTitle: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  errorCardSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44
  },
  retryButtonText: {
    ...Typography.labelMedium,
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  emptyActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md
  },
  emptyActionBtnText: {
    ...Typography.labelMedium,
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: Spacing.md
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between'
  },
  movieCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    position: 'relative'
  },
  moviePoster: {
    width: '100%',
    height: 190,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer
  },
  moviePosterPlaceholder: {
    width: '100%',
    height: 190,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center'
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
    opacity: 0.85,
    marginTop: Spacing.xxs
  },
  loadMoreButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs
  },
  loadMoreButtonText: {
    ...Typography.labelMedium,
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  footerAttribution: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  footerAttributionText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14
  },
  aboutDisclaimerText: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.85,
    marginTop: Spacing.sm,
    fontSize: 11,
    lineHeight: 16
  },
  // Category Filter Pills (Steam Store / JioHotstar)
  categoryPillsScroll: {
    marginBottom: Spacing.md
  },
  categoryPill: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
    marginRight: Spacing.xs
  },
  activeCategoryPill: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  categoryPillText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    fontWeight: '600'
  },
  activeCategoryPillText: {
    color: Colors.onPrimary,
    fontWeight: '700'
  },

  // Full-Screen Movie Details Page (Funflix & Letterboxd)
  fullScreenContainer: {
    flex: 1,
    backgroundColor: Colors.surface
  },
  fullScreenScroll: {
    paddingBottom: Spacing.huge
  },
  fullScreenBackdropWrapper: {
    width: '100%',
    height: 320,
    position: 'relative'
  },
  fullScreenBackdrop: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceContainer
  },
  fullScreenBackdropPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 18, 0.45)'
  },
  fullScreenTopNav: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topNavRightActions: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  circleIconBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(13, 13, 18, 0.75)',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fullScreenBody: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    marginTop: -Spacing.xl
  },
  fullScreenTitle: {
    ...Typography.headlineLarge,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.sm
  },
  fullScreenMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
    marginBottom: Spacing.md
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs
  },
  ratingPillText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700'
  },
  metaPill: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs
  },
  metaPillText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  primaryBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    minHeight: 52,
    marginBottom: Spacing.lg,
    ...Shadows.medium
  },
  primaryBookButtonText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
    fontWeight: '700'
  },
  detailTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    marginBottom: Spacing.md
  },
  detailTabItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeDetailTabItem: {
    borderBottomColor: Colors.primary
  },
  detailTabText: {
    ...Typography.labelMedium,
    color: Colors.onSurface,
    opacity: 0.85
  },
  activeDetailTabText: {
    color: Colors.primary,
    fontWeight: '700',
    opacity: 1
  },
  subTabContent: {
    gap: Spacing.sm
  },
  fullScreenSectionHeader: {
    ...Typography.titleMedium,
    color: Colors.onSurface,
    fontWeight: '700',
    marginTop: Spacing.xs
  },
  fullScreenSynopsis: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    lineHeight: 22
  },
  metaGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs
  },
  metaGridItem: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant
  },
  metaGridLabel: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  metaGridValue: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    fontWeight: '600',
    marginTop: Spacing.xxs
  },
  castScroll: {
    paddingVertical: Spacing.xs
  },
  castCard: {
    alignItems: 'center',
    width: 76,
    marginRight: Spacing.sm
  },
  castAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs
  },
  castAvatarInitial: {
    ...Typography.titleSmall,
    color: Colors.onPrimaryContainer,
    fontWeight: '700'
  },
  castActorName: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    textAlign: 'center',
    fontWeight: '600'
  },
  castRoleName: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85,
    fontSize: 9,
    textAlign: 'center'
  },
  showtimeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant
  },
  showtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  showtimeCinema: {
    ...Typography.titleSmall,
    color: Colors.onSurface,
    fontWeight: '700'
  },
  showtimePrice: {
    ...Typography.labelMedium,
    color: Colors.primary,
    fontWeight: '700'
  },
  showtimeScreen: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.85,
    marginTop: Spacing.xxs,
    marginBottom: Spacing.sm
  },
  timePillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  timePill: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    minHeight: 32,
    justifyContent: 'center'
  },
  activeTimePill: {
    backgroundColor: Colors.primaryContainer,
    borderWidth: 1,
    borderColor: Colors.primary
  },
  timePillText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  activeTimePillText: {
    ...Typography.labelSmall,
    color: Colors.onPrimaryContainer,
    fontWeight: '700'
  },

  // Ticket Pass & Notch Cinema Pass Styling (Mobile Ticket Inspired)
  ticketSegmentWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxs,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: Spacing.lg
  },
  ticketSegmentBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md
  },
  activeTicketSegmentBtn: {
    backgroundColor: Colors.primary
  },
  ticketSegmentText: {
    ...Typography.labelMedium,
    color: Colors.onSurface,
    opacity: 0.85
  },
  activeTicketSegmentText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    opacity: 1
  },
  ticketPassContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs
  },
  notchTicketCard: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.medium
  },
  notchLeft: {
    position: 'absolute',
    top: 135,
    left: -12,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    zIndex: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.outlineVariant
  },
  notchRight: {
    position: 'absolute',
    top: 135,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    zIndex: 10,
    borderLeftWidth: 1,
    borderLeftColor: Colors.outlineVariant
  },
  ticketTopSection: {
    backgroundColor: Colors.primaryContainer,
    padding: Spacing.lg
  },
  ticketHeaderBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs
  },
  ticketStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successContainer,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs
  },
  ticketStatusBadgeText: {
    ...Typography.labelSmall,
    color: Colors.onSuccessContainer,
    fontWeight: '700'
  },
  ticketFormatText: {
    ...Typography.labelSmall,
    color: Colors.onPrimaryContainer,
    letterSpacing: 1,
    fontWeight: '700'
  },
  ticketMovieTitle: {
    ...Typography.headlineMedium,
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  ticketVenueRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  ticketCinemaVenue: {
    ...Typography.bodySmall,
    color: Colors.onPrimaryContainer,
    opacity: 0.9
  },
  perforatedDivider: {
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    height: 1
  },
  perforatedDashes: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.outlineVariant
  },
  ticketStubSection: {
    padding: Spacing.lg
  },
  ticketDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg
  },
  ticketDataCol: {
    alignItems: 'flex-start'
  },
  ticketDataLabel: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85,
    marginBottom: Spacing.xxs
  },
  ticketDataValue: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    fontWeight: '600'
  },
  ticketDataValueHighlight: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: '700'
  },
  barcodeWrapper: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginBottom: Spacing.xs
  },
  barcodeBookingRef: {
    ...Typography.labelMedium,
    color: Colors.onSurface,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  barcodePromptRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  barcodePromptText: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
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
    opacity: 0.85,
    lineHeight: 20
  },
  cinemaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.sm
  },
  cinemaIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm
  },
  cinemaDetails: {
    flex: 1
  },
  cinemaName: {
    ...Typography.labelLarge,
    color: Colors.onSurface,
    flex: 1,
    marginRight: Spacing.xs
  },
  cinemaAddress: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.85,
    marginTop: Spacing.xxs
  },
  chipScroll: {
    marginBottom: Spacing.md
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
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
    alignItems: 'center',
    gap: Spacing.xs
  },
  screenCountBadge: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs
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
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs
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
  emptyStateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md
  },
  emptyStateTitle: {
    ...Typography.headlineMedium,
    color: Colors.onSurface,
    marginBottom: Spacing.xxs
  },
  emptyStateSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 22
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    marginBottom: Spacing.md
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
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
    opacity: 0.85
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
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
    opacity: 0.85
  },
  rowValue: {
    ...Typography.bodyMedium,
    color: Colors.onSurface
  },
  badge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.full,
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
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
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
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.md
  },
  activeNavItem: {
    backgroundColor: Colors.surfaceContainer
  },
  navLabel: {
    ...Typography.labelSmall,
    color: Colors.onSurface,
    opacity: 0.85
  },
  activeNavLabel: {
    color: Colors.primary,
    fontWeight: '700',
    opacity: 1
  }
});
