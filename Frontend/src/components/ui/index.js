/**
 * Matinee UI Component Library
 *
 * Exporting all 12 core design system components:
 * 1. Button (with variants, loading, and sizes)
 * 2. Text (using design tokens typography scale)
 * 3. Card (elevated, outlined, filled variants)
 * 4. MovieCard (poster cache, rating badge, watchlist bookmark)
 * 5. Input (focus borders, clear button, password mask, error state)
 * 6. Chip (filter chip with selected, unselected, minHeight: 40)
 * 7. Badge (status roles: primary, success, warning, error, neutral)
 * 8. BottomSheet (animated modal sheet with backdrop and drag handle)
 * 9. Skeleton (shimmer box, circle, text, card pulse loaders)
 * 10. Toast (animated top alerts with auto-dismiss and haptics)
 * 11. EmptyState (icon, title, description, and primary CTA)
 * 12. SeatMap (high-performance 300+ seat engine with 5 states)
 */

export { Button } from './Button';
export { Text } from './Text';
export { Card } from './Card';
export { MovieCard } from './MovieCard';
export { Input } from './Input';
export { Chip } from './Chip';
export { Badge } from './Badge';
export { BottomSheet } from './BottomSheet';
export { Skeleton, SkeletonBox, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
export { Toast } from './Toast';
export { EmptyState } from './EmptyState';
export { SeatMap, generateAuditoriumSeats } from './SeatMap';
