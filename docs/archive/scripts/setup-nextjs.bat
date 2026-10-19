@echo off
echo =====================================
echo FitGuide Next.js Migration Setup
echo =====================================
echo.

echo Step 1: Running TypeScript to JavaScript conversion...
node migrate-to-nextjs.js

if errorlevel 1 (
    echo.
    echo ❌ Conversion failed! Please check the errors above.
    pause
    exit /b 1
)

echo.
echo =====================================
echo Step 2: Installing Next.js dependencies...
echo =====================================
cd fitguide_nextjs
call npm install

if errorlevel 1 (
    echo.
    echo ❌ npm install failed! Please check your internet connection.
    pause
    exit /b 1
)

echo.
echo =====================================
echo Step 3: Setting up environment variables...
echo =====================================

if not exist .env.local (
    echo Creating .env.local from template...
    copy .env.example .env.local
    echo ⚠️  Please edit .env.local and add your API keys!
) else (
    echo .env.local already exists, skipping...
)

echo.
echo =====================================
echo ✨ Setup Complete!
echo =====================================
echo.
echo 📝 Next steps:
echo.
echo 1. Edit fitguide_nextjs\.env.local with your API keys
echo.
echo 2. Start the backend API:
echo    cd fitguide_api
echo    npm start
echo.
echo 3. Start the Next.js development server:
echo    cd fitguide_nextjs
echo    npm run dev
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
echo =====================================

pause
