import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CodeEditor } from '../components/CodeEditor';
import { ConsolePanel } from '../components/ConsolePanel';
import { JsEngine } from '../components/JsEngine';
import { PackagesMenu } from '../components/PackagesMenu';
import { PythonEngine } from '../components/PythonEngine';
import { StdinPrompt } from '../components/StdinPrompt';
import { Toolbar } from '../components/Toolbar';
import { EXAMPLES, type CodeExample } from '../engine/examples';
import { JS_EXAMPLES } from '../engine/examplesJs';
import { storageKeyFor, type CodeLanguage } from '../engine/language';
import { useJsRunner } from '../engine/useJsRunner';
import { usePythonRunner } from '../engine/usePythonRunner';
import { colors } from '../theme/colors';

const LANGUAGE_KEY = 'coderunner.language';

export function RunnerScreen() {
  const [language, setLanguage] = useState<CodeLanguage>('python');
  const [pythonCode, setPythonCode] = useState(EXAMPLES[1]?.code ?? EXAMPLES[0].code);
  const [jsCode, setJsCode] = useState(JS_EXAMPLES[1]?.code ?? JS_EXAMPLES[0].code);
  const [packagesOpen, setPackagesOpen] = useState(false);

  const python = usePythonRunner();
  const js = useJsRunner();

  const code = language === 'python' ? pythonCode : jsCode;
  const setCode = language === 'python' ? setPythonCode : setJsCode;
  const active = language === 'python' ? python : js;
  const examples = useMemo(
    () => (language === 'python' ? EXAMPLES : JS_EXAMPLES),
    [language],
  );

  useEffect(() => {
    void AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved === 'python' || saved === 'javascript') setLanguage(saved);
    });
    void AsyncStorage.getItem(storageKeyFor('python')).then((saved) => {
      if (saved) setPythonCode(saved);
    });
    void AsyncStorage.getItem(storageKeyFor('javascript')).then((saved) => {
      if (saved) setJsCode(saved);
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void AsyncStorage.setItem(storageKeyFor('python'), pythonCode);
    }, 400);
    return () => clearTimeout(handle);
  }, [pythonCode]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void AsyncStorage.setItem(storageKeyFor('javascript'), jsCode);
    }, 400);
    return () => clearTimeout(handle);
  }, [jsCode]);

  const handleLanguageChange = useCallback((next: CodeLanguage) => {
    setLanguage(next);
  }, []);

  const handleSelectExample = useCallback(
    (example: CodeExample) => {
      setCode(example.code);
    },
    [setCode],
  );

  const handleRun = useCallback(async () => {
    try {
      await activateKeepAwakeAsync('code-run');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // best-effort
    }
    if (language === 'python') {
      python.runCode(pythonCode);
    } else {
      js.runCode(jsCode);
    }
  }, [js, language, python, pythonCode, jsCode]);

  const handleStop = useCallback(async () => {
    active.interrupt();
    try {
      deactivateKeepAwake('code-run');
    } catch {
      // ignore
    }
  }, [active]);

  const handleStdin = useCallback(
    async (value: string) => {
      try {
        await Haptics.selectionAsync();
      } catch {
        // ignore
      }
      active.submitStdin(value);
    },
    [active],
  );

  const canRun =
    language === 'python'
      ? Boolean(python.pyodideVersion) &&
        python.status !== 'running' &&
        python.status !== 'awaiting_input' &&
        python.status !== 'installing'
      : js.ready &&
        js.status !== 'running' &&
        js.status !== 'awaiting_input';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Toolbar
            language={language}
            onLanguageChange={handleLanguageChange}
            status={active.status}
            statusMessage={active.statusMessage}
            examples={examples}
            onSelectExample={handleSelectExample}
            onRun={handleRun}
            onStop={handleStop}
            onClearConsole={active.clearConsole}
            onOpenPackages={language === 'python' ? () => setPackagesOpen(true) : undefined}
            canRun={canRun}
          />

          <CodeEditor
            language={language}
            value={code}
            onChange={setCode}
            editable={active.status !== 'awaiting_input'}
          />

          <ConsolePanel lines={active.lines} />

          {active.pendingInput ? (
            <StdinPrompt
              prompt={active.pendingInput.prompt}
              onSubmit={handleStdin}
              onCancel={handleStop}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <PythonEngine ref={python.webViewRef} onMessage={python.onEngineMessage} />
      <JsEngine ref={js.webViewRef} onMessage={js.onEngineMessage} />

      <PackagesMenu
        visible={packagesOpen}
        onClose={() => setPackagesOpen(false)}
        autoInstall={python.autoInstall}
        onAutoInstallChange={python.setAutoInstall}
        disabled={python.status === 'booting' || python.status === 'running'}
        onInstall={python.installPackages}
        installedPackages={python.installedPackages}
      />
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
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
});
