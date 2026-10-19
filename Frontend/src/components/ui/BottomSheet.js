import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius, Shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Matinee BottomSheet Component
 *
 * @param {Object} props
 * @param {boolean} props.visible Whether the sheet is open
 * @param {string} [props.title] Header title
 * @param {Function} props.onClose Callback invoked when dismissed
 * @param {number} [props.maxHeight=0.85] Maximum height as a fraction of screen height
 * @param {Object} [props.style] Additional content styling
 * @param {React.ReactNode} props.children Content rendered inside the sheet
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  maxHeight = 0.85,
  style,
  children
}) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true
        }),
        Animated.timing(backdropAnim, {
          toValue: 0.6,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropAnim }
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceContainerLowest,
              borderColor: colors.outlineVariant,
              maxHeight: SCREEN_HEIGHT * maxHeight,
              transform: [{ translateY: slideAnim }]
            },
            style
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleWrapper}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: colors.outlineVariant }
              ]}
            />
          </View>

          {/* Header */}
          {title && (
            <View
              style={[
                styles.headerRow,
                { borderBottomColor: colors.outlineVariant }
              ]}
            >
              <Text variant="titleMedium" style={styles.headerTitle}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.closeBtn}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close bottom sheet"
              >
                <Ionicons name="close" size={22} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          )}

          {/* Scrollable Body */}
          <ScrollView
            contentContainerStyle={styles.contentBody}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000'
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    ...Shadows.hard
  },
  handleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.xs
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: BorderRadius.full
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1
  },
  headerTitle: {
    fontWeight: '700',
    flex: 1
  },
  closeBtn: {
    padding: Spacing.xxs
  },
  contentBody: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl
  }
});

export default BottomSheet;
