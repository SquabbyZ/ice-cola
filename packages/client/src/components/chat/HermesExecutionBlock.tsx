import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ToolCallResult } from '@/stores/chat';

interface HermesExecutionBlockProps {
  toolName: string;
  status: ToolCallResult['status'];
  output?: string;
  imageUrl?: string;
}

function HermesExecutionBlock({
  toolName,
  status,
  output,
  imageUrl,
}: HermesExecutionBlockProps) {
  const { t } = useTranslation();
  const label = t(`chat.execution.labels.${toolName}`, { defaultValue: toolName });
  const errorMessage = output || t('chat.execution.unknownError');
  const message =
    status === 'running'
      ? t('chat.execution.running', { label })
      : status === 'error'
        ? t('chat.execution.error', { label, message: errorMessage })
        : t('chat.execution.complete', { label });
  const Icon = status === 'running' ? Loader2 : status === 'error' ? XCircle : CheckCircle2;

  return (
    <div
      className={cn(
        'mt-2 rounded-xl border p-3 text-sm',
        status === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-zinc-200 bg-zinc-50 text-zinc-700'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4 flex-shrink-0', status === 'running' && 'animate-spin')} />
        <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>
          {t('chat.execution.tool')}
        </Badge>
        <span>{message}</span>
      </div>

      {output && status !== 'error' && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-xs text-zinc-600">
          {output}
        </pre>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt={label}
          className="mt-2 max-h-64 max-w-full rounded-lg border border-zinc-200 object-contain"
        />
      )}
    </div>
  );
}

export { HermesExecutionBlock };
