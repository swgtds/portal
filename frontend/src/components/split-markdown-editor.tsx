import React, { useRef, useCallback } from 'react';

interface SplitMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  placeholder?: string;
}

const SplitMarkdownEditor: React.FC<SplitMarkdownEditorProps> = ({
  value,
  onChange,
  textareaRef,
  placeholder = "Start typing... "
}) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const setTextareaRefs = useCallback((element: HTMLTextAreaElement | null) => {
    if (textareaRef && textareaRef.current !== element) {
      (textareaRef as any).current = element;
    }
    editorRef.current = element;
  }, [textareaRef]);

  return (
    <div className="h-[85vh] min-h-[700px] max-h-[90vh]">
      {/* Editor Panel */}
      <div className="h-full bg-onedark-background border-2 border-onedark-selection rounded-lg shadow-lg">
        <div className="p-3 border-b border-onedark-selection bg-onedark-selection/40">
          <span className="text-sm font-medium text-onedark-foreground">Editor</span>
        </div>
        <textarea
          ref={setTextareaRefs}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full p-4 bg-onedark-background text-onedark-foreground border-none outline-none resize-none font-mono text-sm leading-relaxed placeholder:text-onedark-comment/60 placeholder:italic"
          style={{ height: 'calc(100% - 50px)' }}
        />
      </div>
    </div>
  );
};

export default SplitMarkdownEditor;