import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { OwnerProvider } from './src/contexts/OwnerContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <SocketProvider>
              <OwnerProvider>
                <AppNavigator />
              </OwnerProvider>
            </SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
