import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { BorderRadius, Spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Matinee Skeleton Box
 *
 * @param {Object} props
 * @param {number | string} props.width Width of skeleton shape
 * @param {number | string} props.height Height of skeleton shape
 * @param {number} [props.borderRadius=BorderRadius.sm] Border radius token
 * @param {Object} [props.style] Additional custom styles
 */
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
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel="Loading placeholder"
    />
  );
}

/**
 * Matinee Skeleton Circle (Avatar / Icon placeholder)
 */
export function SkeletonCircle({ size = 48, style }) {
  return (
    <SkeletonBox
      width={size}
      height={size}
      borderRadius={BorderRadius.full}
      style={style}
    />
  );
}

/**
 * Matinee Skeleton Text line
 */
export function SkeletonText({ width = '100%', height = 14, style }) {
  return (
    <SkeletonBox
      width={width}
      height={height}
      borderRadius={BorderRadius.xs}
      style={style}
    />
  );
}

/**
 * Matinee Composite Card Skeleton
 */
export function SkeletonCard({ style }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: colors.outlineVariant
        },
        style
      ]}
    >
      <SkeletonBox width="100%" height={160} borderRadius={BorderRadius.md} />
      <View style={styles.cardMeta}>
        <SkeletonText width="75%" height={16} style={{ marginBottom: Spacing.xs }} />
        <SkeletonText width="45%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    width: '100%'
  },
  cardMeta: {
    marginTop: Spacing.sm
  }
});

export const Skeleton = {
  Box: SkeletonBox,
  Circle: SkeletonCircle,
  Text: SkeletonText,
  Card: SkeletonCard
};

export default Skeleton;
