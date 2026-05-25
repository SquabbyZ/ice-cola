import { Bot, Boxes, Brain, Circle, Coins, ImagePlus, PlugZap, Puzzle, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface HermesCapabilityBarProps {
  gatewayConnected: boolean;
  selectedModelName?: string;
  lingqiBalance?: string;
  lingqiEstimate?: string;
  selectedExpertName?: string;
  selectedMcpCount: number;
  selectedSkillsCount?: number;
  selectedPluginsCount?: number;
  attachmentCount: number;
  onModelClick: () => void;
  onExpertClick: () => void;
  onMcpClick: () => void;
  onSkillsClick: () => void;
  onPluginsClick: () => void;
  onAttachClick: () => void;
}

function HermesCapabilityBar({
  gatewayConnected,
  selectedModelName,
  lingqiBalance,
  lingqiEstimate,
  selectedExpertName,
  selectedMcpCount,
  selectedSkillsCount = 0,
  selectedPluginsCount = 0,
  attachmentCount,
  onModelClick,
  onExpertClick,
  onMcpClick,
  onSkillsClick,
  onPluginsClick,
  onAttachClick,
}: HermesCapabilityBarProps) {
  const { t } = useTranslation();
  const lingqiStatus = lingqiEstimate || lingqiBalance || t('chat.capabilities.estimateUnavailable');

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
      <Badge variant={gatewayConnected ? 'default' : 'secondary'} className="gap-1">
        <Circle
          className={cn(
            'h-2 w-2 fill-current',
            gatewayConnected ? 'text-emerald-500' : 'text-zinc-400'
          )}
        />
        {gatewayConnected ? t('chat.hermes.gatewayReady') : t('chat.hermes.gatewayDisconnected')}
      </Badge>

      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      <Button type="button" variant="ghost" size="sm" onClick={onModelClick} className="gap-1">
        <Bot className="h-4 w-4" />
        <span className="max-w-36 truncate">{selectedModelName || t('chat.capabilities.model')}</span>
      </Button>

      <div
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
        aria-label={t('chat.capabilities.lingqi')}
      >
        <Coins className="h-4 w-4" />
        <span className="max-w-44 truncate">{lingqiStatus}</span>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onExpertClick} className="gap-1">
        <Brain className="h-4 w-4" />
        <span className="max-w-36 truncate">{selectedExpertName || t('chat.capabilities.noExpert')}</span>
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onMcpClick} className="gap-1">
        <PlugZap className="h-4 w-4" />
        {t('chat.capabilities.mcpCount', { count: selectedMcpCount })}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onSkillsClick} className="gap-1">
        <Wrench className="h-4 w-4" />
        {selectedSkillsCount > 0
          ? `${t('chat.capabilities.skills')} (${selectedSkillsCount})`
          : t('chat.capabilities.skills')}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onPluginsClick} className="gap-1">
        <Puzzle className="h-4 w-4" />
        {selectedPluginsCount > 0
          ? `${t('chat.capabilities.plugins')} (${selectedPluginsCount})`
          : t('chat.capabilities.plugins')}
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onAttachClick} className="gap-1">
        {attachmentCount > 0 ? <Boxes className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
        {attachmentCount > 0
          ? t('chat.capabilities.attachmentCount', { count: attachmentCount })
          : t('chat.capabilities.multimodal')}
      </Button>
    </div>
  );
}

export { HermesCapabilityBar };
export type { HermesCapabilityBarProps };
