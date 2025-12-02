import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/ui/code-block';
import { Button } from '@/components/ui/button';
import { Plus, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarkdownRendererProps {
  content: string;
  onInsertCodeSnippet?: (code: string, language?: string) => void;
}

const MarkdownRenderer = ({ content, onInsertCodeSnippet }: MarkdownRendererProps) => {
  const { toast } = useToast();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code Copied",
        description: "Code snippet copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="prose prose-invert prose-onedark max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code block renderer with individual insert buttons
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const code = String(children).replace(/\n$/, '');
            const inline = !className;

            if (!inline && code) {
            return (
              <div className="relative group">
                <CodeBlock language={language}>
                  {code}
                </CodeBlock>
                {onInsertCodeSnippet && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyCode(code)}
                      className="h-8 w-8 p-0 bg-onedark-background/80 hover:bg-onedark-selection border-onedark-comment/50"
                    >
                      <Copy size={12} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onInsertCodeSnippet(code, language)}
                      className="h-8 w-8 p-0 bg-onedark-blue/80 hover:bg-onedark-blue text-white"
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <code
              className="px-1.5 py-0.5 rounded bg-onedark-selection text-onedark-foreground font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Style other markdown elements
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold text-onedark-foreground mb-4 mt-6 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold text-onedark-foreground mb-3 mt-5 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-onedark-foreground mb-2 mt-4 first:mt-0">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-base font-semibold text-onedark-foreground mb-2 mt-3 first:mt-0">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="text-onedark-foreground leading-relaxed mb-3 last:mb-0">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-onedark-foreground">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-onedark-foreground">
            {children}
          </em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-onedark-foreground mb-3 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-onedark-foreground mb-3 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-onedark-foreground">
            {children}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-onedark-blue pl-4 italic text-onedark-comment mb-3">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a 
            href={href} 
            className="text-onedark-blue hover:text-onedark-cyan underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="min-w-full border-collapse border border-onedark-comment">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-onedark-comment bg-onedark-selection px-3 py-2 text-left font-semibold text-onedark-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-onedark-comment px-3 py-2 text-onedark-foreground">
            {children}
          </td>
        ),
        hr: () => (
          <hr className="border-0 h-px bg-onedark-comment my-4" />
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;