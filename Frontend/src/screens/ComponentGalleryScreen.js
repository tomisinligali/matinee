import React, { useState } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Button,
  Text,
  Card,
  MovieCard,
  Input,
  Chip,
  Badge,
  BottomSheet,
  Skeleton,
  Toast,
  EmptyState,
  SeatMap
} from '../components/ui';

export default function ComponentGalleryScreen({ onBack }) {
  const { colors, isDark, toggleTheme } = useTheme();

  // Component test states
  const [btnLoading, setBtnLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputPassword, setInputPassword] = useState('SecretPass123!');
  const [inputError, setInputError] = useState('');
  const [selectedChips, setSelectedChips] = useState(['action', 'imax']);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastConfig, setToastConfig] = useState({ visible: false, type: 'info', message: '', title: '' });
  const [isBookmarked, setIsBookmarked] = useState(true);
  const [selectedSeatIds, setSelectedSeatIds] = useState(['C10', 'C11', 'A1']);

  const toggleChip = (id) => {
    setSelectedChips(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSeatToggle = (seatId) => {
    setSelectedSeatIds(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  const showToast = (type, title, message) => {
    setToastConfig({ visible: true, type, title, message });
  };

  const sampleMovie = {
    id: 101,
    title: 'Dune: Part Two (IMAX 70mm)',
    poster_path: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    vote_average: 8.6,
    genre: 'Sci-Fi / Adventure',
    duration: '2h 46m'
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      {/* Toast Alert Component Host */}
      <Toast
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onDismiss={() => setToastConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Screen Header */}
      <View style={[styles.header, { borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Back from Component Gallery"
        >
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text variant="labelSmall" color="primary" style={{ letterSpacing: 2, fontWeight: '700' }}>
            DESIGN SYSTEM
          </Text>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            Living Component Gallery
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceContainer }]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. BUTTONS */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            1. Button (Variants & States)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <Text variant="labelMedium" color="onSurfaceVariant" style={{ marginBottom: Spacing.sm }}>
              Variants: Primary, Secondary, Outline, Ghost, Danger
            </Text>
            <View style={styles.rowWrap}>
              <Button variant="primary" size="md">Primary</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="outline" size="md">Outline</Button>
              <Button variant="ghost" size="md">Ghost</Button>
              <Button variant="danger" size="md">Danger</Button>
            </View>

            <Text variant="labelMedium" color="onSurfaceVariant" style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              Sizes: Small (36pt), Medium (44pt), Large (52pt)
            </Text>
            <View style={styles.rowWrap}>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </View>

            <Text variant="labelMedium" color="onSurfaceVariant" style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              States: Loading & Disabled
            </Text>
            <View style={styles.rowWrap}>
              <Button
                variant="primary"
                size="md"
                loading={btnLoading}
                onPress={() => {
                  setBtnLoading(true);
                  setTimeout(() => setBtnLoading(false), 2000);
                }}
              >
                Click to Load (2s)
              </Button>
              <Button variant="primary" size="md" disabled>
                Disabled
              </Button>
            </View>
          </Card>
        </View>

        {/* 2. TEXT TYPOGRAPHY */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            2. Text (Typography Scale)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <Text variant="displaySmall" style={{ marginBottom: Spacing.xxs }}>
              Display Small (Lora)
            </Text>
            <Text variant="headlineLarge" style={{ marginBottom: Spacing.xxs }}>
              Headline Large (DM Sans)
            </Text>
            <Text variant="headlineMedium" style={{ marginBottom: Spacing.xxs }}>
              Headline Medium
            </Text>
            <Text variant="titleMedium" style={{ marginBottom: Spacing.xxs }}>
              Title Medium (Bold / Structural)
            </Text>
            <Text variant="bodyLarge" style={{ marginBottom: Spacing.xxs }}>
              Body Large: High readability standard copy.
            </Text>
            <Text variant="bodyMedium" color="onSurfaceVariant" style={{ marginBottom: Spacing.xxs }}>
              Body Medium: Secondary metadata and screening notes.
            </Text>
            <Text variant="labelMedium" color="primary">
              Label Medium: Interactive buttons and tags.
            </Text>
          </Card>
        </View>

        {/* 3. CARD */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            3. Card (Variants & Elevation)
          </Text>
          <View style={{ gap: Spacing.sm }}>
            <Card variant="elevated" padding="md">
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>Elevated Card</Text>
              <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginTop: 2 }}>
                Default elevated surface with soft shadow and outlineVariant border.
              </Text>
            </Card>

            <Card variant="outlined" padding="md">
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>Outlined Card</Text>
              <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginTop: 2 }}>
                Transparent background with 1px border.
              </Text>
            </Card>

            <Card
              variant="filled"
              padding="md"
              onPress={() => showToast('info', 'Interactive Card', 'Card press recognized with haptic feedback')}
            >
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>Interactive Filled Card (Tap me)</Text>
              <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginTop: 2 }}>
                Tonal filled background with touchable haptic feedback.
              </Text>
            </Card>
          </View>
        </View>

        {/* 4. MOVIE CARD */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            4. MovieCard
          </Text>
          <View style={{ width: 190 }}>
            <MovieCard
              movie={sampleMovie}
              isBookmarked={isBookmarked}
              onBookmark={() => setIsBookmarked(!isBookmarked)}
              onPress={() => showToast('success', 'Movie Selected', `Opened screening for ${sampleMovie.title}`)}
            />
          </View>
        </View>

        {/* 5. INPUT */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            5. Input (Form Fields & Validation)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <Input
              label="Movie Search Query"
              value={inputText}
              onChangeText={setInputText}
              placeholder="Search by title, director, actor..."
              clearable
              iconLeading={<Ionicons name="search" size={18} color={colors.outline} />}
              helperText="Type text to view clear button"
            />

            <Input
              label="Account Password"
              value={inputPassword}
              onChangeText={setInputPassword}
              secureTextEntry
              iconLeading={<Ionicons name="lock-closed-outline" size={18} color={colors.outline} />}
            />

            <Input
              label="Field with Validation Error"
              value="invalid-email@"
              onChangeText={() => {}}
              error="Please enter a valid email address matching user@example.com"
              iconLeading={<Ionicons name="mail-outline" size={18} color={colors.error} />}
            />

            <Input
              label="Disabled Field"
              value="ReadOnlyToken_MTN_9921"
              disabled
              iconLeading={<Ionicons name="key-outline" size={18} color={colors.outline} />}
            />
          </Card>
        </View>

        {/* 6. CHIPS */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            6. Chip (Filter Pills with 40pt Min Height)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <View style={styles.rowWrap}>
              <Chip
                label="Action"
                selected={selectedChips.includes('action')}
                onPress={() => toggleChip('action')}
              />
              <Chip
                label="IMAX Experience"
                selected={selectedChips.includes('imax')}
                icon={<Ionicons name="sparkles" size={14} color={selectedChips.includes('imax') ? colors.onPrimary : colors.primary} />}
                onPress={() => toggleChip('imax')}
              />
              <Chip
                label="Sci-Fi"
                selected={selectedChips.includes('scifi')}
                onPress={() => toggleChip('scifi')}
              />
              <Chip
                label="Disabled Tag"
                disabled
              />
            </View>
          </Card>
        </View>

        {/* 7. BADGES */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            7. Badge (Status & Tags)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <View style={styles.rowWrap}>
              <Badge variant="primary" label="FEATURED" dot />
              <Badge variant="success" label="AVAILABLE" dot />
              <Badge variant="warning" label="SELLING FAST" dot />
              <Badge variant="error" label="SOLD OUT" dot />
              <Badge variant="neutral" label="ARCHIVED" />
            </View>
          </Card>
        </View>

        {/* 8. BOTTOM SHEET */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            8. BottomSheet (Slide-Up Modal)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <Button
              variant="secondary"
              size="md"
              onPress={() => setIsSheetOpen(true)}
            >
              Open Bottom Sheet Modal
            </Button>
          </Card>
        </View>

        {/* 9. SKELETON */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            9. Skeleton (Looping Shimmer Loaders)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <Text variant="labelSmall" color="onSurfaceVariant" style={{ marginBottom: Spacing.sm }}>
              Pulsing Box, Circle, and Composite Card:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
              <Skeleton.Circle size={52} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton.Text width="80%" height={14} />
                <Skeleton.Text width="50%" height={12} />
              </View>
            </View>
            <Skeleton.Card />
          </Card>
        </View>

        {/* 10. TOAST NOTIFICATIONS */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            10. Toast (Floating Haptic Alerts)
          </Text>
          <Card variant="outlined" padding="md" style={styles.demoCard}>
            <View style={styles.rowWrap}>
              <Button
                variant="primary"
                size="sm"
                onPress={() => showToast('success', 'Booking Confirmed!', 'Tickets dispatched to your inbox.')}
              >
                Success Toast
              </Button>
              <Button
                variant="danger"
                size="sm"
                onPress={() => showToast('error', 'Seat Contention', 'Another customer just secured this seat.')}
              >
                Error Toast
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => showToast('warning', 'Hold Expiring', '2 minutes remaining before seats release.')}
              >
                Warning Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => showToast('info', 'Schedule Update', 'Screen 2 showtime shifted by 10 mins.')}
              >
                Info Toast
              </Button>
            </View>
          </Card>
        </View>

        {/* 11. EMPTY STATE */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            11. EmptyState (A Blank Screen is a Bug)
          </Text>
          <EmptyState
            icon="ticket-outline"
            title="No Active Bookings"
            description="You have no upcoming cinema screenings scheduled. Explore currently showing movies to book tickets."
            actionLabel="Browse In Theatres"
            onAction={() => showToast('info', 'Browse', 'Navigating to movie catalogue')}
            secondaryActionLabel="Check Past History"
            onSecondaryAction={() => showToast('info', 'History', 'Showing past tickets')}
          />
        </View>

        {/* 12. SEATMAP (300+ SEATS ENGINE) */}
        <View style={styles.section}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            12. SeatMap (300+ Auditorium Engine)
          </Text>
          <Text variant="bodySmall" color="onSurfaceVariant" style={{ marginBottom: Spacing.sm }}>
            15 Rows (A–O) × 20 Columns = 300 Seats. Supports available, selected, held, sold, and wheelchair states with sub-millisecond response.
          </Text>
          <Card variant="outlined" padding="sm" style={styles.demoCard}>
            <SeatMap
              selectedSeatIds={selectedSeatIds}
              onSeatToggle={handleSeatToggle}
              maxSelectable={8}
            />

            {/* Live Selection Summary */}
            <View style={[styles.selectionFooter, { borderTopColor: colors.outlineVariant }]}>
              <View>
                <Text variant="labelSmall" color="onSurfaceMuted">SELECTED SEATS ({selectedSeatIds.length})</Text>
                <Text variant="titleMedium" color="primary" style={{ fontWeight: '700' }}>
                  {selectedSeatIds.length > 0 ? selectedSeatIds.join(', ') : 'None selected'}
                </Text>
              </View>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedSeatIds.length === 0}
                onPress={() => showToast('success', 'Seats Locked', `Secured seats: ${selectedSeatIds.join(', ')}`)}
              >
                Book Selected
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* BottomSheet Instance */}
      <BottomSheet
        visible={isSheetOpen}
        title="Cinema Screening Information"
        onClose={() => setIsSheetOpen(false)}
      >
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: Spacing.xs }}>
          Experience Details
        </Text>
        <Text variant="bodyMedium" color="onSurfaceVariant" style={{ lineHeight: 22, marginBottom: Spacing.md }}>
          Experience Dune in IMAX laser projection with 12-channel surround audio. Please arrive 15 minutes before the showtime for seamless check-in.
        </Text>
        <Button
          variant="primary"
          size="md"
          onPress={() => setIsSheetOpen(false)}
        >
          Got It, Continue
        </Button>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge
  },
  section: {
    marginBottom: Spacing.xl
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: Spacing.sm
  },
  demoCard: {
    width: '100%'
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs
  },
  selectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs
  }
});
