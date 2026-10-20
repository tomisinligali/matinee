import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

export function SkeletonBox({ width, height, borderRadius = BorderRadius.sm, style }) {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceContainerHigh,
          opacity: opacityAnim
        },
        style
      ]}
    />
  );
}

export function MovieCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.movieCardSkeleton, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
      {/* Poster Skeleton */}
      <SkeletonBox width="100%" height={190} borderRadius={BorderRadius.md} />
      
      {/* Rating Tag Skeleton */}
      <SkeletonBox width={46} height={18} borderRadius={BorderRadius.sm} style={styles.ratingSkeleton} />

      {/* Title Lines */}
      <SkeletonBox width="85%" height={14} borderRadius={BorderRadius.xs} style={{ marginTop: Spacing.sm }} />
      <SkeletonBox width="55%" height={12} borderRadius={BorderRadius.xs} style={{ marginTop: Spacing.xs }} />
    </View>
  );
}

export function MovieGridSkeleton({ count = 6 }) {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <MovieCardSkeleton key={index} />
      ))}
    </View>
  );
}

export function TicketPassSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.ticketSkeletonCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <SkeletonBox width={100} height={20} borderRadius={BorderRadius.sm} />
        <SkeletonBox width={60} height={16} borderRadius={BorderRadius.xs} />
      </View>
      <SkeletonBox width="70%" height={22} borderRadius={BorderRadius.xs} style={{ marginBottom: Spacing.xs }} />
      <SkeletonBox width="50%" height={14} borderRadius={BorderRadius.xs} style={{ marginBottom: Spacing.md }} />

      <View style={{ height: 1, backgroundColor: colors.outlineVariant, marginVertical: Spacing.md, opacity: 0.5 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
        <SkeletonBox width="22%" height={32} borderRadius={BorderRadius.sm} />
        <SkeletonBox width="22%" height={32} borderRadius={BorderRadius.sm} />
        <SkeletonBox width="22%" height={32} borderRadius={BorderRadius.sm} />
        <SkeletonBox width="22%" height={32} borderRadius={BorderRadius.sm} />
      </View>

      <View style={{ alignItems: 'center', marginTop: Spacing.xs }}>
        <SkeletonBox width={140} height={140} borderRadius={12} />
        <SkeletonBox width={160} height={14} borderRadius={BorderRadius.xs} style={{ marginTop: Spacing.sm }} />
      </View>
    </View>
  );
}

export function CinemaShowtimesSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: Spacing.sm }}>
      {[1, 2].map(i => (
        <View key={i} style={{ backgroundColor: colors.surfaceContainerLowest, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: Spacing.md, marginBottom: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <SkeletonBox width={48} height={70} borderRadius={BorderRadius.sm} style={{ marginRight: Spacing.sm }} />
            <View style={{ flex: 1 }}>
              <SkeletonBox width="80%" height={16} borderRadius={BorderRadius.xs} style={{ marginBottom: 6 }} />
              <SkeletonBox width="50%" height={12} borderRadius={BorderRadius.xs} style={{ marginBottom: 6 }} />
              <SkeletonBox width="40%" height={12} borderRadius={BorderRadius.xs} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.xs }}>
            <SkeletonBox width={75} height={32} borderRadius={BorderRadius.md} />
            <SkeletonBox width={75} height={32} borderRadius={BorderRadius.md} />
            <SkeletonBox width={75} height={32} borderRadius={BorderRadius.md} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between'
  },
  movieCardSkeleton: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.xs,
    marginBottom: Spacing.xs
  },
  ratingSkeleton: {
    marginTop: Spacing.xs
  },
  ticketSkeletonCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg
  }
});
