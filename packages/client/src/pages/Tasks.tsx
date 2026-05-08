import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Play, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const statCards = [
    { label: t('tasks.running'), value: '-', icon: Play },
    { label: t('tasks.completed'), value: '-', icon: CheckCircle2 },
    { label: t('tasks.totalExecutions'), value: '-', icon: Clock },
    { label: t('tasks.successRate'), value: '-', icon: Loader2 },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
                {t('tasks.title')}
              </h1>
              <p className="text-zinc-500 text-sm">
                {t('tasks.subtitle')}
              </p>
            </div>
            <Button className="btn-ice gap-2 px-5">
              <Plus className="w-4 h-4" />
              {t('tasks.create')}
            </Button>
          </div>

          {/* Stats - Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <div
                key={stat.label}
                className="bento-tile p-5 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-zinc-900 font-mono tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-sm text-zinc-500 mt-1">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        <div className="bento-tile p-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
            <Clock className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">{t('tasks.comingSoon')}</h3>
          <p className="text-zinc-500 mb-6 text-sm">{t('tasks.automationDesc')}</p>
          <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 rounded-xl px-6">
            {t('tasks.stayTuned')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
