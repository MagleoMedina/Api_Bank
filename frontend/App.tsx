import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { CredentialManagementScreen } from './src/screens/CredentialManagementScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { CredentialProvider } from './src/contexts/CredentialContext';

type Screen = 'home' | 'credentials';

function Root() {
  const { mode, colors } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedBank, setSelectedBank] = useState<string>('bdv');

  const navigateToCredentials = (bank?: string) => {
    if (bank) setSelectedBank(bank);
    setCurrentScreen('credentials');
  };

  const navigateHome = () => setCurrentScreen('home');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      {currentScreen === 'home' ? (
        <HomeScreen onNavigateToCredentials={navigateToCredentials} />
      ) : (
        <CredentialManagementScreen bank={selectedBank} onBack={navigateHome} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <CredentialProvider>
        <Root />
      </CredentialProvider>
    </ThemeProvider>
  );
}
