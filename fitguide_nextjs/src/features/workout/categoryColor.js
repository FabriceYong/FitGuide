// Accent color per workout category (same palette as the Explore tab).
const CATEGORY_COLORS = {
    'HIIT': '#00C4B4',
    'Yoga': '#3E25F5',
    'Strength': '#C084FC',
    'Cardio': '#FB923C',
    'Flexibility': '#14B8A6',
    'Pilates': '#EC4899',
    'CrossFit': '#EF4444',
    'Dance': '#F59E0B',
    'Martial Arts': '#10B981',
    'Swimming': '#06B6D4',
};

export const categoryColor = (category) => CATEGORY_COLORS[category] || '#00C4B4';
