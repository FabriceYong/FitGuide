# FitGuide Next.js Migration Guide

## Overview
This document outlines the complete migration from the React + TypeScript + Vite application to Next.js with JavaScript.

## Project Structure

```
fitguide_nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.js          # Root layout
│   │   ├── page.js            # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable UI components
│   │   ├── Dashboard.js
│   │   ├── HeroSection.js
│   │   ├── LoadingScreen.js
│   │   └── ... (all other components)
│   ├── features/              # Feature-based modules
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── onboarding/
│   │   ├── profile/
│   │   ├── programs/
│   │   ├── reviews/
│   │   └── workout/
│   ├── contexts/              # React Context providers
│   │   ├── AuthContext.js
│   │   └── WorkoutContext.js
│   ├── services/              # API services
│   │   ├── workoutService.js
│   │   ├── unsplashService.js
│   │   ├── favoriteService.js
│   │   └── heroCarouselService.js
│   ├── hooks/                 # Custom React hooks
│   │   └── useWorkoutImage.js
│   └── utils/                 # Utility functions
│       ├── imageCache.js
│       ├── unsplashImages.js
│       ├── clearCache.js
│       └── workoutHelpers.js
├── public/                    # Static assets
│   └── assets/               # Images, icons, etc.
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
└── package.json              # Dependencies

```

## Key Changes from React to Next.js

### 1. Routing
- **Before:** React Router (client-side)
- **After:** Next.js App Router (file-system based)
- All pages now use Next.js file-based routing
- API routes can be added in `src/app/api/` if needed

### 2. Components
- All `.tsx` files converted to `.js`
- TypeScript interfaces removed, replaced with JSDoc comments where helpful
- 'use client' directive added to components using hooks/state

### 3. Environment Variables
- **Before:** `import.meta.env.VITE_*`
- **After:** `process.env.NEXT_PUBLIC_*`
- Update `.env` file accordingly

### 4. Image Handling
- **Before:** Regular `<img>` tags
- **After:** Next.js `<Image>` component (optional but recommended)
- Remote image patterns configured in `next.config.js`

### 5. CSS/Styling
- Tailwind CSS configuration updated for Next.js
- Custom CSS properties maintained
- All animations and transitions preserved

## Migration Steps

### 1. Install Dependencies
```bash
cd fitguide_nextjs
npm install
```

### 2. Update Environment Variables
Create `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_key_here
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

## API Backend
The existing `fitguide_api` backend remains unchanged and continues to work with the Next.js frontend.

## Features Preserved
✅ Authentication system
✅ Workout browsing and filtering
✅ Workout execution with timer
✅ Progress tracking
✅ Favorites system
✅ Reviews and ratings
✅ User profiles
✅ Programs/plans
✅ Calculators and tools
✅ Unsplash image integration
✅ Image caching
✅ Responsive design
✅ All animations and transitions
✅ Dark theme styling

## Next Steps
1. Complete migration of all component files
2. Test all features thoroughly
3. Optimize images with Next.js Image component
4. Add SEO metadata
5. Deploy to production

## Notes
- All functionality remains exactly the same
- No TypeScript - pure JavaScript
- Backend API unchanged
- All styling and animations preserved
