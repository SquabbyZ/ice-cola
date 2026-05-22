import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface QuickPrompt {
  label: string;
  prompt: string;
}

interface ChatEmptyStateProps {
  gatewayConnected: boolean;
  onPromptSelect: (prompt: string) => void;
}

function ChatEmptyState({ gatewayConnected, onPromptSelect }: ChatEmptyStateProps) {
  const { t } = useTranslation();
  const prompts: QuickPrompt[] = [
    {
      label: t('chat.quickActions.codeDevelopment'),
      prompt: t('chat.quickActions.codeDevelopmentPrompt'),
    },
    {
      label: t('chat.quickActions.documentProcessing'),
      prompt: t('chat.quickActions.documentProcessingPrompt'),
    },
    {
      label: t('chat.quickActions.deepResearch'),
      prompt: t('chat.quickActions.deepResearchPrompt'),
    },
    {
      label: t('chat.quickActions.officeWork'),
      prompt: t('chat.quickActions.officeWorkPrompt'),
    },
    {
      label: t('chat.quickActions.dataAnalysis'),
      prompt: t('chat.quickActions.dataAnalysisPrompt'),
    },
    {
      label: t('chat.quickActions.slides'),
      prompt: t('chat.quickActions.slidesPrompt'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 rounded-3xl bg-emerald-50 p-4 text-emerald-600">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-semibold text-zinc-900">{t('chat.hermes.workspaceTitle')}</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {gatewayConnected ? t('chat.hermes.ready') : t('chat.hermes.connecting')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPromptSelect(prompt.prompt)}
          >
            {prompt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { ChatEmptyState };
export type { ChatEmptyStateProps };
