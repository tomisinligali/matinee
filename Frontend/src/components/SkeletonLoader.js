import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/tokens';

export function SkeletonBox({ width, height, borderRadius = BorderRadius.sm, style }) {
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
          backgroundColor: Colors.surfaceContainerHigh,
          opacity: opacityAnim
        },
        style
      ]}
    />
  );
}

export function MovieCardSkeleton() {
  return (
    <View style={styles.movieCardSkeleton}>
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
  }
});
