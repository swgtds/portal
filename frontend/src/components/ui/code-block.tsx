import { useState, useEffect } from 'react';
import { codeToHtml } from 'shiki';

interface CodeBlockProps {
  children: string;
  language?: string;
}

const CodeBlock = ({ children, language = 'text' }: CodeBlockProps) => {
  const [highlightedCode, setHighlightedCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setIsLoading(true);
        const html = await codeToHtml(children, {
          lang: language || 'text',
          theme: 'one-dark-pro'
        });
        
        const cleanedHtml = html
          .replace(/^<pre[^>]*><code[^>]*>/, '')
          .replace(/<\/code><\/pre>$/, '');
        
        setHighlightedCode(cleanedHtml);
      } catch (error) {
        console.error('Shiki highlighting error:', error);
        setHighlightedCode(`<span class="shiki-fallback">${children}</span>`);
      } finally {
        setIsLoading(false);
      }
    };

    if (children) {
      highlightCode();
    }
  }, [children, language]);

  if (isLoading) {
    return (
      <div className="rounded-md overflow-hidden my-2 border border-onedark-comment bg-[#282c34]">
        {language && language !== 'text' && (
          <div className="px-3 py-2 text-xs font-mono border-b border-onedark-comment bg-[rgba(92,99,112,0.1)] text-[#5c6370]">
            {language}
          </div>
        )}
        <pre className="p-4 overflow-x-auto m-0 bg-[#282c34]">
          <code className="text-sm font-mono leading-relaxed text-[#abb2bf] animate-pulse">
            Loading syntax highlighting...
          </code>
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden my-2 border border-onedark-comment bg-[#282c34]">
      {language && language !== 'text' && (
        <div className="px-3 py-2 text-xs font-mono border-b border-onedark-comment bg-[rgba(92,99,112,0.1)] text-[#5c6370]">
          {language}
        </div>
      )}
      <pre className="p-4 overflow-x-auto m-0 bg-[#282c34]">
        <div 
          className="text-sm font-mono leading-relaxed shiki-container"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          style={{
            background: 'transparent',
          }}
        />
      </pre>
      <style>{`
        .shiki-container code {
          background: transparent !important;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
        }
        .shiki-fallback {
          color: #abb2bf;
        }
      `}</style>
    </div>
  );
};

export default CodeBlock;