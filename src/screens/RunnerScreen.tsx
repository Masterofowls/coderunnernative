import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CodeEditor } from '../components/CodeEditor';
import { ConsolePanel } from '../components/ConsolePanel';
import { JsEngine } from '../components/JsEngine';
import { LessonsMenu } from '../components/LessonsMenu';
import { PackagesMenu } from '../components/PackagesMenu';
import { ProjectsMenu } from '../components/ProjectsMenu';
import { PythonEngine } from '../components/PythonEngine';
import { RuntimeBanner } from '../components/RuntimeBanner';
import { StdinPrompt } from '../components/StdinPrompt';
import { Toolbar } from '../components/Toolbar';
import { EXAMPLES, type CodeExample } from '../engine/examples';
import { JS_EXAMPLES } from '../engine/examplesJs';
import { storageKeyFor, type CodeLanguage } from '../engine/language';
import {
  checkLessonOutput,
  LESSONS,
  type Lesson,
} from '../engine/lessons';
import {
  createProject,
  loadProjectStore,
  saveProjectStore,
  type CodeProject,
} from '../engine/projects';
import {
  ensurePyodideCached,
  type RuntimeCacheProgress,
} from '../engine/runtimeCache';
import { useJsRunner } from '../engine/useJsRunner';
import { usePythonRunner } from '../engine/usePythonRunner';
import { colors } from '../theme/colors';

const LANGUAGE_KEY = 'coderunner.language';
const SPLIT_KEY = 'coderunner.split.editorFlex';
const ONBOARD_KEY = 'coderunner.onboarded.v1';
const HISTORY_KEY = 'coderunner.stdin.history';

export function RunnerScreen() {
  const [language, setLanguage] = useState<CodeLanguage>('python');
  const [pythonCode, setPythonCode] = useState(EXAMPLES[1]?.code ?? EXAMPLES[0].code);
  const [jsCode, setJsCode] = useState(JS_EXAMPLES[1]?.code ?? JS_EXAMPLES[0].code);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [editorFlex, setEditorFlex] = useState(2.4);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [stdinHistory, setStdinHistory] = useState<string[]>([]);
  const [pyIndexUrl, setPyIndexUrl] = useState<string | null>(null);
  const [cacheProgress, setCacheProgress] = useState<RuntimeCacheProgress | null>(null);
  const [pythonBooted, setPythonBooted] = useState(false);
  const [jsEverOpened, setJsEverOpened] = useState(false);

  const jsEnabled = language === 'javascript';
  const python = usePythonRunner(pythonBooted);
  const js = useJsRunner(jsEnabled || jsEverOpened);

  useEffect(() => {
    if (jsEnabled) setJsEverOpened(true);
  }, [jsEnabled]);

  const code = language === 'python' ? pythonCode : jsCode;
  const setCode = language === 'python' ? setPythonCode : setJsCode;
  const active = language === 'python' ? python : js;
  const examples = useMemo(
    () => (language === 'python' ? EXAMPLES : JS_EXAMPLES),
    [language],
  );

  const refreshCache = useCallback(async () => {
    // Background cache only — Python engine always boots from CDN for reliability.
    await ensurePyodideCached(setCacheProgress);
  }, []);

  useEffect(() => {
    // Mount Python WebView immediately (do not wait on offline cache).
    setPythonBooted(true);
    setPyIndexUrl(null);

    void (async () => {
      const [lang, py, jsc, split, hist, store, onboarded] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        AsyncStorage.getItem(storageKeyFor('python')),
        AsyncStorage.getItem(storageKeyFor('javascript')),
        AsyncStorage.getItem(SPLIT_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        loadProjectStore((k) => AsyncStorage.getItem(k)),
        AsyncStorage.getItem(ONBOARD_KEY),
      ]);

      if (lang === 'python' || lang === 'javascript') setLanguage(lang);
      if (py) setPythonCode(py);
      if (jsc) setJsCode(jsc);
      if (split) {
        const n = Number(split);
        if (Number.isFinite(n) && n >= 1.2 && n <= 3.6) setEditorFlex(n);
      }
      if (hist) {
        try {
          const parsed = JSON.parse(hist) as string[];
          if (Array.isArray(parsed)) setStdinHistory(parsed.slice(-40));
        } catch {
          // ignore
        }
      }
      setProjects(store.projects);

      if (!onboarded) {
        Alert.alert(
          'Welcome to CodeRunner',
          'Python & JavaScript on device. First Python run needs network for Pyodide. The editor works offline.',
          [{ text: 'Got it', onPress: () => void AsyncStorage.setItem(ONBOARD_KEY, '1') }],
        );
      }

      void refreshCache();
    })();
  }, [refreshCache]);

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

  useEffect(() => {
    void AsyncStorage.setItem(SPLIT_KEY, String(editorFlex));
  }, [editorFlex]);

  const persistProjects = useCallback(async (next: CodeProject[]) => {
    setProjects(next);
    await saveProjectStore({ projects: next, activeId: null }, (k, v) =>
      AsyncStorage.setItem(k, v),
    );
  }, []);

  const handleLanguageChange = useCallback((next: CodeLanguage) => {
    setLanguage(next);
    setActiveLesson(null);
    if (next === 'python') setPythonBooted(true);
  }, []);

  const handleSelectExample = useCallback(
    (example: CodeExample) => {
      setActiveLesson(null);
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
    if (language === 'python') python.runCode(pythonCode);
    else js.runCode(jsCode);
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
      setStdinHistory((prev) => {
        const next = [...prev.filter((x) => x !== value), value].slice(-40);
        void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      active.submitStdin(value);
    },
    [active],
  );

  const handleCheckLesson = useCallback(() => {
    if (!activeLesson) return;
    const result = checkLessonOutput(activeLesson, active.lastStdout);
    Alert.alert(result.pass ? 'Pass' : 'Try again', result.message);
  }, [active.lastStdout, activeLesson]);

  const handleSaveProject = useCallback(
    async (name: string) => {
      const project = createProject(name, language, code);
      await persistProjects([project, ...projects]);
      Alert.alert('Saved', `Project "${project.name}" saved.`);
    },
    [code, language, persistProjects, projects],
  );

  const handleOpenProject = useCallback(
    (project: CodeProject) => {
      setLanguage(project.language);
      if (project.language === 'python') setPythonCode(project.code);
      else setJsCode(project.code);
      setProjectsOpen(false);
      setActiveLesson(null);
    },
    [],
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      await persistProjects(projects.filter((p) => p.id !== id));
    },
    [persistProjects, projects],
  );

  const handleExport = useCallback(async () => {
    const ext = language === 'python' ? 'py' : 'js';
    const path = `${FileSystem.cacheDirectory}coderunner-export.${ext}`;
    await FileSystem.writeAsStringAsync(path, code);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: language === 'python' ? 'text/x-python' : 'text/javascript',
        dialogTitle: 'Export code',
      });
    } else {
      Alert.alert('Exported', path);
    }
  }, [code, language]);

  const handleImport = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/*', 'application/javascript', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const content = await FileSystem.readAsStringAsync(asset.uri);
    const name = asset.name?.toLowerCase() ?? '';
    if (name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.ts')) {
      setLanguage('javascript');
      setJsCode(content);
    } else {
      setLanguage('python');
      setPythonCode(content);
    }
    setProjectsOpen(false);
  }, []);

  const handleShare = useCallback(async () => {
    await handleExport();
  }, [handleExport]);

  const canRun =
    language === 'python'
      ? Boolean(python.pyodideVersion) &&
        python.status !== 'running' &&
        python.status !== 'awaiting_input' &&
        python.status !== 'installing'
      : js.ready && js.status !== 'running' && js.status !== 'awaiting_input';

  const errorLine = active.lastErrorLine;

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
            onOpenProjects={() => setProjectsOpen(true)}
            onOpenLessons={() => setLessonsOpen(true)}
            onCheckLesson={handleCheckLesson}
            canRun={canRun}
            lessonActive={Boolean(activeLesson)}
          />

          <RuntimeBanner progress={cacheProgress} onRetry={refreshCache} />

          {activeLesson ? (
            <View style={styles.lessonBanner}>
              <Text style={styles.lessonTitle}>{activeLesson.title}</Text>
              <Text style={styles.lessonPrompt}>{activeLesson.prompt}</Text>
            </View>
          ) : null}

          <CodeEditor
            language={language}
            value={code}
            onChange={setCode}
            editable={active.status !== 'awaiting_input'}
            errorLine={errorLine}
            flex={editorFlex}
          />

          <View style={styles.splitRow}>
            <Pressable
              style={styles.splitBtn}
              onPress={() => setEditorFlex((f) => Math.min(3.6, f + 0.3))}
            >
              <Text style={styles.splitText}>Editor +</Text>
            </Pressable>
            <Pressable
              style={styles.splitBtn}
              onPress={() => setEditorFlex((f) => Math.max(1.2, f - 0.3))}
            >
              <Text style={styles.splitText}>Console +</Text>
            </Pressable>
          </View>

          <ConsolePanel
            lines={active.lines}
            flex={Math.max(0.7, 3.6 - editorFlex)}
            collapsed={consoleCollapsed}
            onToggleCollapse={() => setConsoleCollapsed((v) => !v)}
            hasErrorJump={Boolean(errorLine)}
            onJumpError={() => {
              /* CodeEditor listens to errorLine prop already; re-bump via force */
              Alert.alert('Error line', `Jumping to line ${errorLine}`);
            }}
          />

          {active.pendingInput ? (
            <StdinPrompt
              prompt={active.pendingInput.prompt}
              onSubmit={handleStdin}
              onCancel={handleStop}
              history={stdinHistory}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {pythonBooted ? (
        <PythonEngine
          ref={python.webViewRef}
          onMessage={python.onEngineMessage}
          indexUrl={pyIndexUrl}
          active
        />
      ) : null}
      <JsEngine
        ref={js.webViewRef}
        onMessage={js.onEngineMessage}
        active={jsEnabled || jsEverOpened}
      />

      <PackagesMenu
        visible={packagesOpen}
        onClose={() => setPackagesOpen(false)}
        autoInstall={python.autoInstall}
        onAutoInstallChange={python.setAutoInstall}
        disabled={python.status === 'booting' || python.status === 'running'}
        onInstall={python.installPackages}
        installedPackages={python.installedPackages}
      />

      <ProjectsMenu
        visible={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        projects={projects}
        language={language}
        onSaveAs={handleSaveProject}
        onOpen={handleOpenProject}
        onDelete={handleDeleteProject}
        onExport={handleExport}
        onImport={handleImport}
        onShare={handleShare}
      />

      <LessonsMenu
        visible={lessonsOpen}
        onClose={() => setLessonsOpen(false)}
        language={language}
        lessons={LESSONS}
        onStart={(lesson) => {
          setActiveLesson(lesson);
          setCode(lesson.starter);
          setLessonsOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  lessonBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 10,
    gap: 4,
  },
  lessonTitle: { color: colors.text, fontWeight: '700' },
  lessonPrompt: { color: colors.textMuted, fontSize: 12 },
  splitRow: { flexDirection: 'row', gap: 8 },
  splitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  splitText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
});
