import React, { useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isScrollingSyncRef = useRef(false);

  // Combine the external textareaRef with our internal editorRef
  const setTextareaRefs = useCallback((element: HTMLTextAreaElement | null) => {
    if (textareaRef && textareaRef.current !== element) {
      (textareaRef as any).current = element;
    }
    editorRef.current = element;
  }, [textareaRef]);

  const handleEditorScroll = useCallback(() => {
    if (isScrollingSyncRef.current || !editorRef.current || !previewRef.current) return;
    
    isScrollingSyncRef.current = true;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    // Calculate scroll percentage of editor
    const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    
    // Apply same scroll percentage to preview
    const previewScrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
    preview.scrollTop = previewScrollTop;
    
    // Reset sync flag after a short delay
    setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 50);
  }, []);

  const handlePreviewScroll = useCallback(() => {
    if (isScrollingSyncRef.current || !editorRef.current || !previewRef.current) return;
    
    isScrollingSyncRef.current = true;
    
    const editor = editorRef.current;
    const preview = previewRef.current;
    
    // Calculate scroll percentage of preview
    const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    
    // Apply same scroll percentage to editor
    const editorScrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
    editor.scrollTop = editorScrollTop;
    
    // Reset sync flag after a short delay
    setTimeout(() => {
      isScrollingSyncRef.current = false;
    }, 50);
  }, []);
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[85vh] min-h-[700px] max-h-[90vh]">
      {/* Editor Panel */}
      <div className="flex-1 bg-onedark-background border-2 border-onedark-selection rounded-lg shadow-lg">
        <div className="p-3 border-b border-onedark-selection bg-onedark-selection/40">
          <span className="text-sm font-medium text-onedark-foreground">Editor</span>
        </div>
        <textarea
          ref={setTextareaRefs}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleEditorScroll}
          placeholder={placeholder}
          className="w-full h-full p-4 bg-onedark-background text-onedark-foreground border-none outline-none resize-none font-mono text-sm leading-relaxed placeholder:text-onedark-comment/60 placeholder:italic"
          style={{ height: 'calc(100% - 50px)' }}
        />
      </div>

      {/* Preview Panel */}
      <div className="flex-1 bg-onedark-background border-2 border-onedark-selection rounded-lg shadow-lg overflow-hidden">
        <div className="p-3 border-b border-onedark-selection bg-onedark-selection/40">
          <span className="text-sm font-medium text-onedark-foreground">Preview</span>
        </div>
        <div 
          ref={previewRef}
          onScroll={handlePreviewScroll}
          className="h-full p-4 overflow-auto prose prose-invert max-w-none" 
          style={{ height: 'calc(100% - 50px)' }}
        >
          {value.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = !match;
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        background: '#282c34',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code 
                      className="bg-onedark-selection px-1 py-0.5 rounded text-sm font-mono text-onedark-foreground"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-onedark-foreground mb-4 mt-6 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-onedark-foreground mb-3 mt-5">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-onedark-foreground mb-2 mt-4">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-onedark-foreground mb-4 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="text-onedark-foreground mb-4 ml-6 list-disc space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="text-onedark-foreground mb-4 ml-6 list-decimal space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-onedark-foreground">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-onedark-blue pl-4 py-2 my-4 italic text-onedark-comment bg-onedark-selection/30 rounded-r">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-onedark-foreground">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-onedark-foreground">
                    {children}
                  </em>
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <div className="text-onedark-comment italic">
              Type something to see the preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitMarkdownEditor;