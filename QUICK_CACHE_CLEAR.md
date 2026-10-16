# ⚡ Quick Cache Clear Reference

## 🎯 Fastest Method (30 seconds)

1. **Start app**: `cd fitguide_web && npm run dev`
2. **Open browser**: http://localhost:5173
3. **Press F12** to open DevTools
4. **Go to Console tab**
5. **Type**: `clearUnsplashCache()`
6. **Press Enter**
7. **Click OK** on alert
8. **Press F5** to refresh
9. ✅ **Done!** New images will load

---

## 🌐 Alternative: Use Clear Page

1. **Start app**: `cd fitguide_web && npm run dev`
2. **Visit**: http://localhost:5173/clear-cache.html
3. **Click**: "Clear Cache Now" button
4. ✅ **Done!** Return to main app

---

## ✅ Verify It Worked

**In browser console, you should see:**
```
[Unsplash] Fetching image for: "Battle Ropes Conditioning"
[Unsplash] Query: "battle ropes conditioning fitness exercise"
```

**NOT this (old):**
```
[Unsplash] Query: "strength training gym equipment"  ❌
```

---

## 📚 Full Guide

See `CLEAR_CACHE_GUIDE.md` for:
- Detailed instructions
- Troubleshooting
- Alternative methods
- Technical details
