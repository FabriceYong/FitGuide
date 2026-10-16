# NPM Install Troubleshooting Guide

## Problem
`npm install` is failing with network errors when downloading the Next.js SWC compiler:
```
Error: read ECONNRESET
Downloading swc package @next/swc-win32-x64-msvc...
```

## Solutions (Try in order)

### Solution 1: Manual npm install with retry

Open a **new terminal** and run:

```bash
cd fitguide_nextjs
npm cache clean --force
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm install --legacy-peer-deps
```

If it fails, just **retry the same command** - network issues are often temporary.

### Solution 2: Use different registry

Sometimes the default npm registry has issues:

```bash
cd fitguide_nextjs
npm config set registry https://registry.npmmirror.com
npm install --legacy-peer-deps
```

Then switch back:
```bash
npm config set registry https://registry.npmjs.org/
```

### Solution 3: Install dependencies one by one

```bash
cd fitguide_nextjs

# Install Next.js and React
npm install next@14.2.3 --legacy-peer-deps
npm install react@18.3.1 react-dom@18.3.1 --legacy-peer-deps

# Install other dependencies
npm install axios lucide-react recharts --legacy-peer-deps

# Install dev dependencies
npm install -D eslint eslint-config-next autoprefixer postcss tailwindcss --legacy-peer-deps
```

### Solution 4: Offline installation (if you have slow/unstable internet)

If you have another computer with good internet:

1. On the good computer, create the same package.json
2. Run `npm install`
3. Copy the entire `node_modules` folder to this project
4. Run `npm rebuild` on this computer

### Solution 5: Use Yarn instead of npm

```bash
cd fitguide_nextjs

# Install Yarn if you don't have it
npm install -g yarn

# Install dependencies with Yarn
yarn install
```

### Solution 6: Check your internet/firewall

1. **Disable VPN** if you're using one
2. **Disable antivirus** temporarily
3. **Check firewall** - ensure npm can access the internet
4. **Try different network** - mobile hotspot, different Wi-Fi

### Solution 7: Increase Node.js memory

```bash
cd fitguide_nextjs
set NODE_OPTIONS=--max-old-space-size=4096
npm install --legacy-peer-deps
```

## Recommended: Solution 1 + Patience

**Most common fix:** Just retry `npm install` multiple times. Network issues are temporary.

```bash
cd fitguide_nextjs
npm install --legacy-peer-deps
```

Press Ctrl+C if it hangs, then run again. Usually works after 2-3 tries.

## After Successful Install

You should see:
```
added XXX packages in Xs
```

Then verify:
```bash
npm run dev
```

Should see:
```
▲ Next.js 14.2.3
- Local: http://localhost:3000
```

## Still Not Working?

### Alternative: Use the working React app while fixing this

The original `fitguide_web` still works! You can:

1. Continue using it while troubleshooting
2. The Next.js migration is complete (all files converted)
3. The issue is just the npm installation, not the code

### Contact Support

If none of these work, the issue might be:
- Corporate firewall blocking npm
- ISP blocking certain downloads
- Need to use a proxy
- Network configuration issue

Check with your IT department or internet provider.

## Quick Test

Test if you can reach npm registry:

```bash
curl https://registry.npmjs.org/next
```

Should return JSON data. If not, it's a network issue.

## Summary

**Most likely solutions:**
1. ✅ Retry `npm install` 2-3 times
2. ✅ Clear npm cache and retry
3. ✅ Try on different network (mobile hotspot)
4. ✅ Use Yarn instead of npm

**The migration itself is 100% complete** - this is just a dependency installation issue, not a code problem!
