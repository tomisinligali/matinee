import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { Colors } from './src/theme/tokens';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CinemaOperatorScreen from './src/screens/CinemaOperatorScreen';
import PlatformAdminScreen from './src/screens/PlatformAdminScreen';
import { api } from './src/services/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // 'splash' | 'auth' | 'dashboard'
  const [currentUser, setCurrentUser] = useState(null);

  const handleNavigate = (screen, user = null) => {
    if (user) {
      setCurrentUser(user);
    }
    setCurrentScreen(screen);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      {currentScreen === 'splash' && (
        <SplashScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'auth' && (
        <AuthScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'dashboard' && renderDashboardByRole()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface
  }
});
