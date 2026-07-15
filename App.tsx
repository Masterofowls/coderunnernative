import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RunnerScreen } from './src/screens/RunnerScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <RunnerScreen />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
