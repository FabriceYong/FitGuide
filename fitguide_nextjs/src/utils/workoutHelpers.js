/**
 * Convert workout title to a consistent ID format
 * Example: "Core with Sarah" -> "core-with-sarah"
 */
export const generateWorkoutId = (workoutTitle) => {
    return workoutTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
};
/**
 * Format date to readable string
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};
/**
 * Calculate average rating from reviews
 */
export const calculateAverageRating = (reviews) => {
    if (reviews.length === 0)
        return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return sum / reviews.length;
};
