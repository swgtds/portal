import React, { useState, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { EditorView } from '@codemirror/view';
import { FileText, Code2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type EditorMode = 'text' | 'code';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python'     },
  { id: 'cpp',        label: 'C / C++'    },
  { id: 'java',       label: 'Java'       },
  { id: 'rust',       label: 'Rust'       },
  { id: 'html',       label: 'HTML'       },
  { id: 'css',        label: 'CSS'        },
] as const;

type LanguageId = (typeof LANGUAGES)[number]['id'];

const VALID_LANGUAGES = LANGUAGES.map(l => l.id) as string[];

function getLanguageExtension(lang: LanguageId) {
  switch (lang) {
    case 'javascript':  return javascript({ jsx: true });
    case 'typescript':  return javascript({ jsx: true, typescript: true });
    case 'python':      return python();
    case 'cpp':         return cpp();
    case 'java':        return java();
    case 'rust':        return rust();
    case 'html':        return html();
    case 'css':         return css();
    default:            return javascript();
  }
}

// ── localStorage helpers ─────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

interface SplitMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Namespace for persisted editor prefs (e.g. roomId). Defaults to 'global'. */
  storageKey?: string;
  /** kept for API compatibility – no longer used */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
}

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#282c34',
    fontSize: '14px',
  },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'Fira Code', 'JetBrains Mono', monospace" },
  '.cm-content': { caretColor: '#61afef', padding: '16px 0' },
  '.cm-line': { padding: '0 16px' },
  '.cm-focused': { outline: 'none' },
  '.cm-editor': { height: '100%' },
  '.cm-gutters': { backgroundColor: '#21252b', borderRight: '1px solid #3e4451', color: '#5c6370' },
});

const SplitMarkdownEditor: React.FC<SplitMarkdownEditorProps> = ({
  value,
  onChange,
  storageKey = 'global',
  placeholder = 'Start typing…',
}) => {
  const modeKey = `editor_mode_${storageKey}`;
  const langKey  = `editor_lang_${storageKey}`;

  const [mode, setModeRaw] = useState<EditorMode>(() =>
    lsGet<EditorMode>(modeKey, 'text') === 'code' ? 'code' : 'text'
  );

  const [language, setLanguageRaw] = useState<LanguageId>(() => {
    const stored = lsGet<string>(langKey, 'javascript');
    return VALID_LANGUAGES.includes(stored) ? (stored as LanguageId) : 'javascript';
  });

  const setMode = (m: EditorMode) => {
    setModeRaw(m);
    lsSet(modeKey, m);
  };

  const setLanguage = (l: LanguageId) => {
    setLanguageRaw(l);
    lsSet(langKey, l);
  };

  const extensions = useMemo(() => {
    const lang = mode === 'text' ? markdown() : getLanguageExtension(language);
    return [lang, baseTheme];
  }, [mode, language]);

  const currentLangLabel = LANGUAGES.find(l => l.id === language)?.label ?? 'JavaScript';

  return (
    <div className="h-[85vh] min-h-[700px] max-h-[90vh] flex flex-col bg-onedark-background border-2 border-onedark-selection rounded-lg shadow-lg overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-onedark-selection bg-onedark-selection/40 flex-shrink-0">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 rounded-md border border-onedark-comment/30 p-0.5 bg-onedark-background/60">
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'text'
                ? 'bg-onedark-blue text-white shadow'
                : 'text-onedark-comment hover:text-onedark-foreground'
            }`}
          >
            <FileText size={13} />
            Text
          </button>
          <button
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'code'
                ? 'bg-onedark-blue text-white shadow'
                : 'text-onedark-comment hover:text-onedark-foreground'
            }`}
          >
            <Code2 size={13} />
            Code
          </button>
        </div>

        {/* Language selector – only visible in code mode */}
        {mode === 'code' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-transparent border-onedark-comment/40 text-onedark-foreground hover:bg-onedark-selection"
              >
                {currentLangLabel}
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-onedark-background border-onedark-selection text-onedark-foreground"
            >
              {LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`text-xs cursor-pointer hover:bg-onedark-selection focus:bg-onedark-selection ${
                    language === lang.id ? 'text-onedark-blue font-semibold' : ''
                  }`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {mode === 'text' && (
          <span className="text-xs text-onedark-comment">Markdown</span>
        )}
      </div>

      {/* ── Editor ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={extensions}
          theme={oneDark}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: mode === 'code',
            foldGutter: mode === 'code',
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            autocompletion: mode === 'code',
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
            tabSize: 2,
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
};

export default SplitMarkdownEditor;
