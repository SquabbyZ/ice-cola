import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check } from 'lucide-react';
import 'highlight.js/styles/atom-one-dark.css';

interface MarkdownContentProps {
  content: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const [copiedCodeBlock, setCopiedCodeBlock] = React.useState<string | null>(null);

  const handleCopyCode = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeBlock(blockId);
      setTimeout(() => setCopiedCodeBlock(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="markdown-content prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 代码块
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const blockId = `code-${Math.random().toString(36).slice(2, 9)}`;

            if (!inline && match) {
              return (
                <div className="relative group my-4">
                  {/* 语言标签和复制按钮 */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t-lg border-b border-gray-700">
                    <span className="text-xs text-gray-400 font-mono">
                      {match[1]}
                    </span>
                    <button
                      onClick={() => handleCopyCode(codeString, blockId)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors rounded"
                      title="复制代码"
                    >
                      {copiedCodeBlock === blockId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>复制</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* 代码内容 */}
                  <pre className="!mt-0 !rounded-t-none !rounded-b-lg overflow-x-auto">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            }

            // 行内代码
            return (
              <code
                className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-pink-600 dark:text-pink-400"
                {...props}
              >
                {children}
              </code>
            );
          },

          // 链接
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {children}
              </a>
            );
          },

          // 引用块
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg">
                {children}
              </blockquote>
            );
          },

          // 表格
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {children}
                </table>
              </div>
            );
          },

          thead({ children }: any) {
            return (
              <thead className="bg-gray-50 dark:bg-gray-800">
                {children}
              </thead>
            );
          },

          th({ children }: any) {
            return (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {children}
              </th>
            );
          },

          td({ children }: any) {
            return (
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700">
                {children}
              </td>
            );
          },

          // 列表
          ul({ children }: any) {
            return <ul className="list-disc list-outside ml-4 my-2 space-y-1">{children}</ul>;
          },

          ol({ children }: any) {
            return <ol className="list-decimal list-outside ml-4 my-2 space-y-1">{children}</ol>;
          },

          li({ children }: any) {
            return <li className="text-sm">{children}</li>;
          },

          // 标题
          h1({ children }: any) {
            return <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">{children}</h1>;
          },

          h2({ children }: any) {
            return <h2 className="text-xl font-semibold mt-5 mb-2 text-gray-900 dark:text-gray-100">{children}</h2>;
          },

          h3({ children }: any) {
            return <h3 className="text-lg font-medium mt-4 mb-2 text-gray-900 dark:text-gray-100">{children}</h3>;
          },

          h4({ children }: any) {
            return <h4 className="text-base font-medium mt-3 mb-1 text-gray-900 dark:text-gray-100">{children}</h4>;
          },

          // 段落
          p({ children }: any) {
            return <p className="my-2 text-sm leading-relaxed">{children}</p>;
          },

          // 分隔线
          hr() {
            return <hr className="my-4 border-gray-200 dark:border-gray-700" />;
          },

          // 粗体
          strong({ children }: any) {
            return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>;
          },

          // 斜体
          em({ children }: any) {
            return <em className="italic">{children}</em>;
          },

          // 删除线
          del({ children }: any) {
            return <del className="line-through text-gray-500">{children}</del>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
