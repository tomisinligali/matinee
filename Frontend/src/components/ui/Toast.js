import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  StyleSheet,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

/**
 * Matinee Toast Component
 *
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastType
 *
 * @param {Object} props
 * @param {boolean} props.visible Whether toast is currently shown
 * @param {ToastType} [props.type='info'] Status theme of the notification
 * @param {string} props.message Main body message
 * @param {string} [props.title] Optional headline title
 * @param {number} [props.duration=3500] Auto-dismiss duration in milliseconds (0 to disable)
 * @param {Function} props.onDismiss Callback invoked when toast closes
 * @param {Object} [props.style] Additional custom styles
 */
export function Toast({
  visible,
  type = 'info',
  message,
  title,
  duration = 3500,
  onDismiss,
  style
}) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback based on toast type
      try {
        if (type === 'success') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (type === 'error') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (_) {}

      // Animate entry
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();

      // Auto dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      // Animate exit
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  const typeConfig = {
    success: {
      backgroundColor: colors.successContainer,
      borderColor: colors.success,
      textColor: colors.onSuccessContainer,
      iconName: 'checkmark-circle'
    },
    error: {
      backgroundColor: colors.errorContainer,
      borderColor: colors.error,
      textColor: colors.onErrorContainer,
      iconName: 'alert-circle'
    },
    warning: {
      backgroundColor: colors.warningContainer,
      borderColor: colors.warning,
      textColor: colors.onWarningContainer,
      iconName: 'warning'
    },
    info: {
      backgroundColor: colors.infoContainer,
      borderColor: colors.info,
      textColor: colors.onInfoContainer,
      iconName: 'information-circle'
    }
  }[type] || {
    backgroundColor: colors.infoContainer,
    borderColor: colors.info,
    textColor: colors.onInfoContainer,
    iconName: 'information-circle'
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim
        },
        style
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: typeConfig.backgroundColor,
            borderColor: typeConfig.borderColor
          }
        ]}
      >
        <Ionicons
          name={typeConfig.iconName}
          size={22}
          color={typeConfig.textColor}
          style={styles.icon}
        />

        <View style={styles.content}>
          {title && (
            <Text
              variant="labelMedium"
              style={[styles.title, { color: typeConfig.textColor }]}
            >
              {title}
            </Text>
          )}
          <Text
            variant="bodySmall"
            style={[styles.message, { color: typeConfig.textColor }]}
          >
            {message}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={18} color={typeConfig.textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 50,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Shadows.medium
  },
  icon: {
    marginRight: Spacing.sm
  },
  content: {
    flex: 1,
    marginRight: Spacing.xs
  },
  title: {
    fontWeight: '700',
    marginBottom: 2
  },
  message: {
    lineHeight: 18
  },
  closeBtn: {
    padding: Spacing.xxs
  }
});

export default Toast;
