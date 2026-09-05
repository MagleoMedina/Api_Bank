import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

function Root() {
  const { mode, colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <HomeScreen />
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
      <Root />
    </ThemeProvider>
  );
}