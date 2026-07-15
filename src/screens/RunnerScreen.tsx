import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CodeEditor } from '../components/CodeEditor';
import { ConsolePanel } from '../components/ConsolePanel';
import { PackageBar } from '../components/PackageBar';
import { PythonEngine } from '../components/PythonEngine';
import { StdinPrompt } from '../components/StdinPrompt';
import { Toolbar } from '../components/Toolbar';
import { EXAMPLES, type CodeExample } from '../engine/examples';
import { usePythonRunner } from '../engine/usePythonRunner';
import { colors } from '../theme/colors';

const CODE_STORAGE_KEY = 'coderunner.editor.code';

export function RunnerScreen() {
  const [code, setCode] = useState(EXAMPLES[1]?.code ?? EXAMPLES[0].code);
  const runner = usePythonRunner();

  useEffect(() => {
    void AsyncStorage.getItem(CODE_STORAGE_KEY).then((saved) => {
      if (saved) setCode(saved);
    });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      void AsyncStorage.setItem(CODE_STORAGE_KEY, code);
    }, 400);
    return () => clearTimeout(handle);
  }, [code]);

  const handleSelectExample = useCallback((example: CodeExample) => {
    setCode(example.code);
  }, []);

  const handleRun = useCallback(async () => {
    try {
      await activateKeepAwakeAsync('python-run');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Keep-awake / haptics are best-effort on unsupported hosts.
    }
    runner.runCode(code);
  }, [code, runner]);

  const handleStop = useCallback(async () => {
    runner.interrupt();
    try {
      deactivateKeepAwake('python-run');
    } catch {
      // ignore
    }
  }, [runner]);

  const handleStdin = useCallback(
    async (value: string) => {
      try {
        await Haptics.selectionAsync();
      } catch {
        // ignore
      }
      runner.submitStdin(value);
    },
    [runner],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Toolbar
            status={runner.status}
            statusMessage={runner.statusMessage}
            autoInstall={runner.autoInstall}
            onAutoInstallChange={runner.setAutoInstall}
            examples={EXAMPLES}
            onSelectExample={handleSelectExample}
            onRun={handleRun}
            onStop={handleStop}
            onClear={runner.clearConsole}
            canRun={
              Boolean(runner.pyodideVersion) &&
              runner.status !== 'running' &&
              runner.status !== 'awaiting_input' &&
              runner.status !== 'installing'
            }
          />

          <PackageBar
            disabled={runner.status === 'booting' || runner.status === 'running'}
            onInstall={runner.installPackages}
            installedPackages={runner.installedPackages}
          />

          <CodeEditor
            value={code}
            onChange={setCode}
            editable={runner.status !== 'awaiting_input'}
          />

          <ConsolePanel lines={runner.lines} />

          {runner.pendingInput ? (
            <StdinPrompt
              prompt={runner.pendingInput.prompt}
              onSubmit={handleStdin}
              onCancel={handleStop}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <PythonEngine ref={runner.webViewRef} onMessage={runner.onEngineMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
});
