import React, { useState } from 'react';
import { View, SafeAreaView, StatusBar, StyleSheet, Platform } from 'react-native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const SafeContainer = (Platform.OS === 'web' || !SafeAreaView) ? View : SafeAreaView;
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CinemaOperatorScreen from './src/screens/CinemaOperatorScreen';
import PlatformAdminScreen from './src/screens/PlatformAdminScreen';
import { api } from './src/services/api';

function AppContent() {
  const { colors, isDark } = useTheme();
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash' | 'auth' | 'verifyEmail' | 'dashboard'
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleNavigate = (screen, user = null, extraData = null) => {
    if (user) {
      setCurrentUser(user);
    }
    if (extraData?.email) {
      setPendingEmail(extraData.email);
    } else if (user?.email) {
      setPendingEmail(user.email);
    }
    setCurrentScreen(screen);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setPendingEmail('');
    setCurrentScreen('auth');
  };

  const renderDashboardByRole = () => {
    const role = currentUser?.role || 'CUSTOMER';

    if (role === 'CINEMA_OPERATOR') {
      return <CinemaOperatorScreen user={currentUser} onLogout={handleLogout} />;
    }

    if (role === 'PLATFORM_ADMIN') {
      return <PlatformAdminScreen user={currentUser} onLogout={handleLogout} />;
    }

    // Default to Moviegoer Experience
    return <DashboardScreen user={currentUser} onLogout={handleLogout} />;
  };

  return (
    <SafeContainer style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      {currentScreen === 'splash' && (
        <SplashScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'auth' && (
        <AuthScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'verifyEmail' && (
        <EmailVerificationScreen
          email={pendingEmail || currentUser?.email}
          user={currentUser}
          onNavigate={handleNavigate}
          onBackToAuth={() => setCurrentScreen('auth')}
        />
      )}
      {currentScreen === 'dashboard' && renderDashboardByRole()}
    </SafeContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
