# FitGuide Next.js

A modern fitness application built with Next.js, providing personalized workout plans, progress tracking, and comprehensive fitness tools.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** JavaScript (ES6+)
- **Styling:** Tailwind CSS
- **UI Components:** React 19
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP Client:** Axios

## 📋 Features

- 🔐 User Authentication & Authorization
- 💪 Workout Library with Advanced Filtering
- ⏱️ Interactive Workout Execution with Timer
- 📊 Progress Tracking & Statistics
- ⭐ Favorites System
- 💬 Reviews & Ratings
- 👤 User Profile Management
- 📚 Workout Programs
- 🧮 Fitness Calculators
- 🖼️ Dynamic Image Integration (Unsplash)
- 📱 Fully Responsive Design
- 🌙 Dark Theme with Custom Color Palette

## 🛠️ Prerequisites

- Node.js 18+ installed
- MongoDB database running (for backend API)
- Unsplash API key (optional, for dynamic images)

## ⚡ Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_api_key_here
```

### 3. Start Backend API

Make sure the backend API is running:

```bash
cd ../fitguide_api
npm install
npm start
```

The API should be running on `http://localhost:5001`

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📁 Project Structure

```
fitguide_nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.js          # Root layout
│   │   ├── page.js            # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable UI components
│   ├── features/              # Feature-based modules
│   │   ├── auth/              # Authentication
│   │   ├── dashboard/         # Dashboard tabs
│   │   ├── workout/           # Workout features
│   │   ├── profile/           # User profile
│   │   └── programs/          # Workout programs
│   ├── contexts/              # React Context providers
│   │   ├── AuthContext.js
│   │   └── WorkoutContext.js
│   ├── services/              # API services
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
├── public/                    # Static assets
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── package.json              # Dependencies
```

## 🎨 Color Palette

```css
--color-noir-eclipse: #0A0C10;    /* Primary background */
--color-obsidian-wave: #131921;   /* Secondary background */
--color-lime-light: #00C4B4;      /* Primary accent */
--color-royal-nebula: #3E25F5;    /* Secondary accent */
```

## 🔧 Configuration

### Tailwind CSS

Custom theme extensions are defined in `tailwind.config.js`:
- Custom colors matching the brand palette
- Extended spacing and sizing utilities
- Custom animation utilities

### Next.js

Configuration in `next.config.js` includes:
- Image optimization for Unsplash domains
- Environment variable configuration
- Strict mode enabled

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🔐 Authentication

The app uses a context-based authentication system:
- User data persisted in localStorage
- Protected routes with AuthWrapper component
- Automatic token refresh (if backend implements it)

## 🎯 Key Components

### Context Providers
- **AuthContext:** User authentication state
- **WorkoutContext:** Global workout data management

### Core Components
- **Dashboard:** Main app container with tab navigation
- **HeroSection:** Dynamic hero carousel
- **LoadingScreen:** Animated loading state
- **WorkoutDetails:** Detailed workout view
- **WorkoutExecution:** Interactive workout timer

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Build for Production

```bash
npm run build
npm start
```

## 🤝 API Integration

The app connects to the Express.js backend API:

**Base URL:** `http://localhost:5001/api` (configurable via env)

**Key Endpoints:**
- `GET /workouts` - Fetch all workouts
- `GET /workouts/:slug` - Get workout by slug
- `POST /workouts/:slug/like` - Like a workout
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

## 🐛 Troubleshooting

### Issue: "use client" errors
**Solution:** Ensure components using hooks have the 'use client' directive at the top

### Issue: Environment variables not working
**Solution:**
- Ensure they start with `NEXT_PUBLIC_`
- Restart dev server after changes

### Issue: Images not loading
**Solution:** Check `next.config.js` image configuration and verify remote domains

### Issue: API calls failing
**Solution:**
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

## 📄 License

This project is private and proprietary.

## 👥 Support

For support, email support@fitguide.com or open an issue in the repository.

---

**Built with ❤️ using Next.js**
