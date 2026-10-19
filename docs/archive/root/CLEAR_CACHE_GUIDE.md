# 🧹 Clear Unsplash Image Cache Guide

## Why Clear the Cache?

The old cached images were fetched using generic category-based queries. After implementing title-based queries, you need to clear the cache so that:

- **"Battle Ropes Conditioning"** searches for → "battle ropes" images (not generic "strength training")
- **"Kettlebell Swings"** searches for → "kettlebell" images
- **"Box Jumps Circuit"** searches for → "box jumps" images

## Quick Methods

### ⭐ METHOD 1: Browser Console (Easiest & Recommended)

1. Start the frontend:
   ```bash
   cd fitguide_web
   npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. Open Browser DevTools:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+K`

4. Go to the **Console** tab

5. Type this command and press Enter:
   ```javascript
   clearUnsplashCache()
   ```

6. You'll see an alert: "✅ Cache cleared! X cached images removed."

7. Click OK and refresh the page (`F5` or `Ctrl+R`)

8. Watch the console for logs like:
   ```
   [Unsplash] Fetching image for: "Battle Ropes Conditioning" | Query: "battle ropes conditioning fitness exercise"
   [Unsplash] Successfully fetched image by [Photographer] for: "Battle Ropes Conditioning"
   ```

### 🌐 METHOD 2: Dedicated Clear Cache Page

1. Start the frontend:
   ```bash
   cd fitguide_web
   npm run dev
   ```

2. Navigate to: **http://localhost:5173/clear-cache.html**

3. You'll see:
   - Current cache statistics (number of items, size)
   - A big "Clear Cache Now" button

4. Click **"Clear Cache Now"**

5. See confirmation message

6. Click **"← Back to FitGuide"** or navigate to the main app

7. Refresh the page to see new images

### 🔧 METHOD 3: Browser Storage Manager

**Chrome/Edge:**
1. Open DevTools (`F12`)
2. Go to **Application** tab
3. In left sidebar: **Storage** → **Local Storage**
4. Click on your localhost URL (e.g., `http://localhost:5173`)
5. In the list, find all keys starting with `unsplash_workout_`
6. Select them (Ctrl+Click to select multiple)
7. Press `Delete` key or right-click → Delete
8. Also delete keys starting with `unsplash_timestamp_`
9. Refresh the page

**Firefox:**
1. Open DevTools (`F12`)
2. Go to **Storage** tab
3. Expand **Local Storage** in left sidebar
4. Click on your localhost URL
5. Find and delete keys starting with `unsplash_workout_` and `unsplash_timestamp_`
6. Refresh the page

### 🗑️ METHOD 4: Clear All Site Data (Nuclear Option)

⚠️ **WARNING**: This will:
- Clear ALL localStorage (including auth tokens)
- Log you out of the app
- Remove all cached data

Only use if other methods don't work or you want a fresh start.

**Steps:**
1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Find **"Clear site data"** button (usually at the top)
4. Click it
5. Confirm
6. Refresh the page
7. Log in again

## Verification

After clearing the cache, verify it worked:

### 1. Check Console Logs
Open browser console and look for:
```
[Unsplash] Fetching image for: "Battle Ropes Conditioning" | Query: "battle ropes conditioning fitness exercise"
✅ SUCCESS - Specific query for battle ropes

Instead of old:
[Unsplash] Fetching image for: "Battle Ropes Conditioning" | Query: "strength training gym equipment"
❌ OLD - Generic category query
```

### 2. Visual Check
- Go to Explore tab
- Look at workout cards
- Images should be specific to workout type:
  - Battle Ropes → Rope workout photos
  - Kettlebell → Kettlebell exercise photos
  - Yoga → Yoga pose photos
  - Box Jumps → Box jump photos

### 3. Check Cache Stats
In browser console, type:
```javascript
getCacheInfo()
```

You should see:
```javascript
{ total: 0, size: "0.00 KB" }  // Right after clearing
{ total: 5, size: "12.34 KB" } // After viewing some workouts
```

## Automated Script

Run this Node.js script for instructions:
```bash
node clear-unsplash-cache.js
```

## Troubleshooting

### Cache not clearing
- Make sure you're on the correct localhost URL
- Try closing and reopening the browser
- Use METHOD 4 (nuclear option)

### Images still look generic
- Verify API key is set: `VITE_UNSPLASH_ACCESS_KEY` in `.env`
- Check console for error messages
- Verify you cleared the cache completely
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Function not found error
```
Uncaught ReferenceError: clearUnsplashCache is not defined
```

**Solution:**
- Make sure the app is running (`npm run dev`)
- Verify `import './utils/clearCache'` is in `main.tsx`
- Try refreshing the page
- Use METHOD 2 or METHOD 3 instead

## Technical Details

### Cache Structure
```
localStorage:
├── unsplash_workout_Strength_12345        → Cached image data
├── unsplash_timestamp_Strength_12345      → Timestamp for expiry
├── unsplash_workout_HIIT_67890            → Another cached image
└── unsplash_timestamp_HIIT_67890          → Its timestamp
```

### Cache Duration
- **Default**: 7 days (604,800,000 milliseconds)
- **Location**: `fitguide_web/src/services/unsplashService.ts`
- **Key**: `CACHE_DURATION` constant

### What Gets Deleted
When you clear the cache:
1. All keys starting with `unsplash_workout_*`
2. All keys starting with `unsplash_timestamp_*`
3. Nothing else is affected (auth tokens, user preferences, etc.)

## Next Steps After Clearing

1. ✅ **Refresh the page** to trigger new image fetches
2. ✅ **Browse workouts** to see specific images
3. ✅ **Check console logs** to verify title-based queries
4. ✅ **Wait for images to load** (first load takes 1-2 seconds per image)
5. ✅ **Images are cached again** for 7 days automatically

## Files Involved

- `fitguide_web/src/utils/clearCache.ts` - Cache utility functions
- `fitguide_web/src/main.tsx` - Imports cache utils (makes globally available)
- `fitguide_web/public/clear-cache.html` - Dedicated clearing page
- `clear-unsplash-cache.js` - Instructions script
- `fitguide_web/src/services/unsplashService.ts` - Cache management

---

**Need Help?**
- Check browser console for error messages
- Verify `.env` file has correct API key
- Ensure frontend is running on http://localhost:5173
- Try METHOD 4 (nuclear option) as last resort
