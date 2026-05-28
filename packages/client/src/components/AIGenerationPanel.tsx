import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGateway } from '@/hooks/useGateway';
import { useAIGenerationStore } from '@/stores/aiGeneration';
import { Loader2, Send, Sparkles, Check, RotateCcw } from 'lucide-react';

interface AIGenerationPanelProps {
  type: 'expert' | 'skill';
  onApply: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

const PLACEHOLDER_MAP = {
  expert: '描述你想要的宗主，例如：我需要一个擅长代码审查的专家，能帮我发现潜在的bug和安全问题',
  skill: '描述你想要的技能，例如：我需要一个能自动格式化SQL查询的技能',
};

export default function AIGenerationPanel({ type, onApply, onClose }: AIGenerationPanelProps) {
  const [input, setInput] = useState('');
  const { send, on, isConnected } = useGateway();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isGenerating,
    streamContent,
    parsedConfig,
    error,
    addUserMessage,
    appendDelta,
    setStreamId,
    setFinalConfig,
    setError,
    setIsGenerating,
    reset,
  } = useAIGenerationStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      on('generate.delta', (data: { delta: string; streamId: string }) => {
        appendDelta(data.delta);
      }),
    );

    unsubs.push(
      on('generate.final', (data: { content: string; streamId: string }) => {
        setFinalConfig(extractJson(data.content) ?? {});
      }),
    );

    unsubs.push(
      on('generate.error', (data: { error: string; streamId: string }) => {
        setError(data.error);
      }),
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [on, appendDelta, setFinalConfig, setError]);

  const handleGenerate = async () => {
    const desc = input.trim();
    if (!desc || isGenerating) return;

    addUserMessage(desc);
    setInput('');
    setIsGenerating(true);

    try {
      const conversationHistory = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: desc },
      ];

      const result = await send('generate.config', {
        type,
        description: desc,
        conversationHistory,
      });

      if (result?.streamId) {
        setStreamId(result.streamId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleApply = () => {
    if (parsedConfig) {
      onApply(parsedConfig);
      reset();
      onClose();
    }
  };

  const handleRetry = () => {
    reset();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-200">AI 智能生成</span>
          <span className="text-xs text-zinc-500">
            {type === 'expert' ? '宗主' : '技能'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {parsedConfig && (
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleApply}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              确认应用
            </Button>
          )}
          {messages.length > 0 && !isGenerating && (
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-zinc-200"
              onClick={handleRetry}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !isGenerating && (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            <div className="text-center space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-zinc-600" />
              <p>用自然语言描述你想要的{type === 'expert' ? '宗主' : '技能'}</p>
              <p className="text-xs text-zinc-600">AI 会自动生成配置，你可以预览后应用</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600/20 text-violet-200 border border-violet-600/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans text-xs">{msg.content}</pre>
            </div>
          </div>
        ))}

        {streamContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-zinc-800 text-zinc-300 border border-zinc-700">
              <pre className="whitespace-pre-wrap font-sans text-xs">{streamContent}</pre>
              {isGenerating && (
                <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-red-900/20 text-red-300 border border-red-600/30">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-zinc-700">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_MAP[type]}
            disabled={isGenerating}
            className="min-h-[60px] max-h-[120px] bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none text-sm"
          />
          <Button
            size="icon"
            onClick={handleGenerate}
            disabled={!input.trim() || isGenerating || !isConnected}
            className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white h-[60px] w-[60px]"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
          />
          <span className="text-[10px] text-zinc-600">
            {isConnected ? 'Gateway 已连接' : 'Gateway 未连接'}
          </span>
        </div>
      </div>
    </div>
  );
}

function extractJson(text: string): Record<string, unknown> | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
