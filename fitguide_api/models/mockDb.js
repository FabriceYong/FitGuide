const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbFilePath = path.join(__dirname, '..', 'mock_db_data.json');

const loadData = () => {
  try {
    if (fs.existsSync(dbFilePath)) {
      const content = fs.readFileSync(dbFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading mock DB data:', err);
  }
  return { users: [], reviews: [], workouts: [] };
};

const saveData = (data) => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving mock DB data:', err);
  }
};

const data = loadData();

// Seed workouts for mock database
const seedWorkouts = () => {
  if (!data.workouts || data.workouts.length === 0) {
    try {
      const workoutsData = require('../seed/workoutSeeder');
      if (Array.isArray(workoutsData)) {
        data.workouts = workoutsData.map((w, index) => ({
          ...w,
          id: `mock-workout-${index + 1}`,
          viewCount: Math.floor(Math.random() * 1000),
          likeCount: Math.floor(Math.random() * 100),
          averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
          totalReviews: Math.floor(Math.random() * 50),
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true
        }));
        saveData(data);
        console.log(`✅ ${data.workouts.length} workouts seeded to mock database`);
      }
    } catch (err) {
      console.error('Error seeding workouts:', err.message);
    }
  }
};

// Call seed function
seedWorkouts();

// Seed demo user if not exists
const seedDemoUser = async () => {
  const existingDemo = data.users.find(user => user.email === 'demo@fitguide.com');
  if (!existingDemo) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('demo123', salt);

    const demoUser = {
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
      createdAt: new Date('2024-01-01').toISOString()
    };

    data.users.push(demoUser);
    saveData(data);
    console.log('✅ Demo user seeded: demo@fitguide.com / demo123');
  }
};

// Seed demo user on module load
seedDemoUser().catch(console.error);

// Seed initial default reviews for presentation
if (data.reviews.length === 0) {
  data.reviews = [
    {
      id: 'mock-review-1',
      name: 'Sarah Connor',
      userAvatar: null,
      rating: 5,
      comment: 'Core with Sarah has completely changed my daily routine. The core strength I have gained is visible and helps my posture immensely!',
      workoutRegiment: 'Core with Sarah',
      workoutId: 'core-with-sarah',
      beforeImage: '/uploads/reviews/before-example.jpg',
      afterImage: '/uploads/reviews/after-example.jpg',
      likes: 12,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mock-review-2',
      name: 'Alex Mercer',
      userAvatar: null,
      rating: 4,
      comment: 'Really enjoying the Morning Zen routine. Highly recommend for developers sitting all day! The lower back stretching is incredible.',
      workoutRegiment: 'Morning Zen',
      workoutId: 'morning-zen',
      beforeImage: null,
      afterImage: null,
      likes: 5,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  saveData(data);
}

module.exports = {
  getUsers: () => data.users,
  addUser: (user) => {
    data.users.push(user);
    saveData(data);
  },
  updateUser: (id, updateData) => {
    const idx = data.users.findIndex(u => u.id === id || u._id === id);
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...updateData, updatedAt: new Date().toISOString() };
      saveData(data);
      return data.users[idx];
    }
    return null;
  },
  getReviews: () => data.reviews,
  addReview: (review) => {
    data.reviews.push(review);
    saveData(data);
  },
  updateReview: (id, updateFn) => {
    const idx = data.reviews.findIndex(r => r.id === id);
    if (idx !== -1) {
      updateFn(data.reviews[idx]);
      saveData(data);
      return data.reviews[idx];
    }
    return null;
  },
  getWorkouts: () => data.workouts || [],
  getWorkoutBySlug: (slug) => {
    return (data.workouts || []).find(w => w.slug === slug);
  }
};
