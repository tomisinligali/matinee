import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

/**
 * Matinee MovieCard Component
 *
 * @param {Object} props
 * @param {Object} props.movie Movie object
 * @param {string} props.movie.title Movie title
 * @param {string} [props.movie.poster_path] TMDB poster path or absolute image URI
 * @param {number} [props.movie.vote_average] Rating out of 10
 * @param {string} [props.movie.genre] Primary genre label
 * @param {string} [props.movie.duration] Runtime string (e.g. '2h 15m')
 * @param {Function} [props.onPress] Callback when card is selected
 * @param {Function} [props.onBookmark] Callback when bookmark icon is tapped
 * @param {boolean} [props.isBookmarked=false] Whether movie is saved to watchlist
 * @param {boolean} [props.showBookmark=true] Shows/hides bookmark button
 * @param {Object} [props.style] Additional card wrapper styles
 */
export function MovieCard({
  movie,
  onPress,
  onBookmark,
  isBookmarked = false,
  showBookmark = true,
  style,
  ...rest
}) {
  const { colors, isDark } = useTheme();

  const handleCardPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (onPress) onPress(movie);
  };

  const handleBookmarkPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    if (onBookmark) onBookmark(movie);
  };

  const posterUri = movie?.poster_path
    ? (movie.poster_path.startsWith('http') ? movie.poster_path : `${TMDB_IMAGE_BASE}${movie.poster_path}`)
    : null;

  const ratingFormatted = movie?.vote_average
    ? Number(movie.vote_average).toFixed(1)
    : '7.8';

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      activeOpacity={0.82}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: colors.outlineVariant
        },
        isDark ? Shadows.soft : Shadows.medium,
        style
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${movie?.title || 'Movie'}, rated ${ratingFormatted} out of 10, ${movie?.genre || 'Feature'}`}
      {...rest}
    >
      {/* Poster Image Container */}
      <View style={[styles.posterWrapper, { backgroundColor: colors.surfaceContainer }]}>
        {posterUri ? (
          <ExpoImage
            source={{ uri: posterUri }}
            style={styles.posterImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={300}
          />
        ) : (
          <View style={styles.posterFallback}>
            <Ionicons name="film-outline" size={44} color={colors.outline} />
          </View>
        )}

        {/* Rating Badge */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color="#FBBF24" style={{ marginRight: 3 }} />
          <Text variant="labelSmall" style={styles.ratingText}>
            {ratingFormatted}
          </Text>
        </View>

        {/* Bookmark Action */}
        {showBookmark && (
          <TouchableOpacity
            onPress={handleBookmarkPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.bookmarkBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? `Remove ${movie?.title} from watchlist` : `Save ${movie?.title} to watchlist`}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isBookmarked ? colors.primary : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Meta Content */}
      <View style={styles.metaContainer}>
        <Text
          variant="titleSmall"
          numberOfLines={1}
          style={styles.title}
        >
          {movie?.title || 'Screening Title'}
        </Text>

        <View style={styles.detailsRow}>
          <Text
            variant="labelSmall"
            color="onSurfaceVariant"
            numberOfLines={1}
            style={styles.genreText}
          >
            {movie?.genre || 'Action / Drama'}
          </Text>
          {movie?.duration && (
            <Text
              variant="labelSmall"
              color="onSurfaceMuted"
            >
              • {movie.duration}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    marginBottom: Spacing.sm
  },
  posterWrapper: {
    width: '100%',
    height: 190,
    position: 'relative'
  },
  posterImage: {
    width: '100%',
    height: '100%'
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs
  },
  ratingText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  bookmarkBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metaContainer: {
    padding: Spacing.sm
  },
  title: {
    fontWeight: '700',
    marginBottom: 2
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  genreText: {
    fontWeight: '500',
    marginRight: 4
  }
});

export default MovieCard;
