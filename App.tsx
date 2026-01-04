import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { OwnerProvider } from './src/contexts/OwnerContext';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ToastProvider>
        <LanguageProvider>
          <AuthProvider>
            <OwnerProvider>
              <AppNavigator />
            </OwnerProvider>
          </AuthProvider>
        </LanguageProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

export default App;
