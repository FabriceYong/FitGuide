/**
 * Workout pictures. Catalog workouts have no photos of their own, so each
 * gets a fixed Unsplash photo matching its title or category (credited in the
 * dashboard footer). No API calls: these are plain image URLs.
 */
type Size = 'small' | 'medium' | 'large';

const DIMENSIONS: Record<Size, string> = { small: 'w=400&h=300', medium: 'w=800&h=600', large: 'w=1200&h=900' };

const photo = (id: string, size: Size) => `https://images.unsplash.com/photo-${id}?${DIMENSIONS[size]}&fit=crop&q=80`;

const CATEGORY_PHOTOS: Record<string, string> = {
  HIIT: '1517836357463-d25dfeac3438',
  Yoga: '1544367567-0f2fcb009e0b',
  Strength: '1534438327276-14e5300c3a48',
  Cardio: '1476480862126-209bfaa8edc8',
  Pilates: '1518611012118-696072aa579a',
  Flexibility: '1506126613408-eca07ce68773',
  CrossFit: '1517836477839-7072aaa8b121',
  Dance: '1508700115892-45ecd05ae2ad',
  'Martial Arts': '1555597408-26bc8e548a46',
  Swimming: '1519315901367-f34ff9154487',
};

// Checked in order; the first keyword found in the title wins.
const TITLE_PHOTOS: [string[], string][] = [
  [['tabata', 'hiit'], '1517838277536-f5f99be501cd'],
  [['yoga', 'sun salutation'], '1544367567-0f2fcb009e0b'],
  [['core', 'abs'], '1571019613454-1cb2f99b2d8b'],
  [['pilates'], '1518611012118-696072aa579a'],
  [['strength', 'weight'], '1534438327276-14e5300c3a48'],
  [['cardio', 'running'], '1476480862126-209bfaa8edc8'],
];

/** Category photo for a workout category (falls back to the HIIT photo). */
export const getWorkoutImageUrl = (category: string, size: Size = 'medium') =>
  photo(CATEGORY_PHOTOS[category] || CATEGORY_PHOTOS.HIIT, size);

/**
 * The photo for a workout: its own image if it has one, else one matching
 * its title, else its category's.
 */
export function getWorkoutSpecificImage(title: string, category: string, size: Size = 'medium', customImageUrl?: string | null) {
  if (customImageUrl) return customImageUrl;
  const lower = title.toLowerCase();
  const match = TITLE_PHOTOS.find(([words]) => words.some((w) => lower.includes(w)));
  return match ? photo(match[1], size) : getWorkoutImageUrl(category, size);
}
