const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Local JSON "database" used when MongoDB is unreachable (development only).
const dbFilePath = process.env.MOCK_DB_PATH || path.join(__dirname, '..', 'mock_db_data.json');

const loadData = () => {
  try {
    if (fs.existsSync(dbFilePath)) {
      return JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading mock DB data:', err);
  }
  return {};
};

// User-owned record collections (workout sessions, enrollments, body metrics).
const COLLECTIONS = ['workoutSessions', 'enrollments', 'bodyMetrics'];

const data = { users: [], reviews: [], workoutStats: {}, ...loadData() };
for (const name of COLLECTIONS) data[name] = data[name] || [];
// Workouts are always served from seed/workoutSeeder.js; drop any stale copy.
delete data.workouts;

const saveData = () => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving mock DB data:', err);
  }
};

// Seed demo user if not exists
const seedDemoUser = async () => {
  if (data.users.some((user) => user.email === 'demo@fitguide.com')) return;
  const hashedPassword = await bcrypt.hash('demo123', 12);
  data.users.push({
    id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@fitguide.com',
    password: hashedPassword,
    gender: 'Male',
    height: 178,
    weight: 75,
    targetWeight: 72,
    fitnessLevel: 'Intermediate',
    activityStatus: 'Active',
    goal: 'Vitality',
    diet: 'Mediterranean Diet',
    avatarUrl: null,
    favoriteWorkouts: [],
    customWorkoutImages: [],
    createdAt: new Date('2024-01-01').toISOString(),
  });
  saveData();
  console.log('✅ Demo user seeded: demo@fitguide.com / demo123');
};

seedDemoUser().catch(console.error);

// Seed initial default reviews for presentation
if (data.reviews.length === 0) {
  data.reviews = [
    {
      id: 'mock-review-1',
      userId: null,
      name: 'Sarah Connor',
      userAvatar: null,
      rating: 5,
      comment: 'Core with Sarah has completely changed my daily routine. The core strength I have gained is visible and helps my posture immensely!',
      workoutRegiment: 'Core with Sarah',
      workoutId: 'core-with-sarah',
      beforeImage: '/uploads/reviews/before-example.jpg',
      afterImage: '/uploads/reviews/after-example.jpg',
      likes: 12,
      likedBy: [],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-review-2',
      userId: null,
      name: 'Alex Mercer',
      userAvatar: null,
      rating: 4,
      comment: 'Really enjoying the Morning Zen routine. Highly recommend for developers sitting all day! The lower back stretching is incredible.',
      workoutRegiment: 'Morning Zen',
      workoutId: 'morning-zen',
      beforeImage: null,
      afterImage: null,
      likes: 5,
      likedBy: [],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  saveData();
}

module.exports = {
  getUsers: () => data.users,
  findUserById: (id) => data.users.find((u) => u.id === id) || null,
  findUserByEmail: (email) => data.users.find((u) => u.email === email) || null,
  addUser: (user) => {
    data.users.push(user);
    saveData();
  },
  updateUser: (id, updateData) => {
    const idx = data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    data.users[idx] = { ...data.users[idx], ...updateData, updatedAt: new Date().toISOString() };
    saveData();
    return data.users[idx];
  },
  getReviews: () => data.reviews,
  addReview: (review) => {
    data.reviews.push(review);
    saveData();
  },
  updateReview: (id, updateFn) => {
    const review = data.reviews.find((r) => r.id === id);
    if (!review) return null;
    updateFn(review);
    saveData();
    return review;
  },
  getWorkoutStats: (slug) => data.workoutStats[slug] || { viewCount: 0, likeCount: 0, likedBy: [] },
  updateWorkoutStats: (slug, updateFn) => {
    const stats = { viewCount: 0, likeCount: 0, likedBy: [], ...data.workoutStats[slug] };
    updateFn(stats);
    data.workoutStats[slug] = stats;
    saveData();
    return stats;
  },

  // Generic access to the user-owned collections in COLLECTIONS.
  all: (collection) => data[collection],
  insert: (collection, record) => {
    data[collection].push(record);
    saveData();
    return record;
  },
  update: (collection, id, updateFn) => {
    const record = data[collection].find((r) => r.id === id);
    if (!record) return null;
    updateFn(record);
    record.updatedAt = new Date().toISOString();
    saveData();
    return record;
  },
  remove: (collection, id) => {
    const idx = data[collection].findIndex((r) => r.id === id);
    if (idx === -1) return false;
    data[collection].splice(idx, 1);
    saveData();
    return true;
  },
};
