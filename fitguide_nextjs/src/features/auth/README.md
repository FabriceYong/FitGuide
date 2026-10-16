# Authentication System

This authentication system provides a complete login and registration flow for the FitGuide application.

## Components

### LoginPage
- Email/password login form
- Password visibility toggle
- Error handling and loading states
- Demo credentials display
- Link to registration

### AuthWrapper
- Manages authentication state
- Routes between login and registration
- Wraps the main application

### AuthContext
- React context for user state management
- Persists user data to localStorage
- Provides login/logout functions

## Usage

The system automatically handles:
1. **Unauthenticated users** → Shows login page
2. **Login success** → Redirects to main dashboard
3. **Registration link** → Shows onboarding wizard
4. **Registration success** → Auto-login and redirect to dashboard
5. **Logout** → Clears user data and returns to login

## Demo Credentials

For testing purposes, a demo user is automatically created:
- **Email:** demo@fitguide.com
- **Password:** demo123

## API Integration

- **Login:** `POST /api/auth/login`
- **Register:** `POST /api/auth/register`
- Mock database mode creates demo user automatically
- User data persisted in localStorage for session management

## Features

✅ Complete login/register flow
✅ Persistent authentication state
✅ Error handling and validation
✅ Demo user setup
✅ Responsive design matching app aesthetic
✅ Password visibility toggle
✅ Loading states and feedback
✅ Seamless integration with existing onboarding flow