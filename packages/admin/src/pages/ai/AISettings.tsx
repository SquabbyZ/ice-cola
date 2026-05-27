import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Activity } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { useUsageStats } from '../../hooks/useAiModels';
import ApiKeys from './ApiKeys';
import Models from './Models';
import Providers from './Providers';

export default function AISettings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('providers');
  const { data: usageStats } = useUsageStats({ period: 'month' });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('ai.settings.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('ai.settings.description')}</p>
        </div>

        {/* Usage Stats - same row as title */}
        {usageStats && (
          <Card className="shrink-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">{t('ai.settings.usageTitle')}</h3>
              </div>
              <div className="flex gap-6">
                <div className="bg-muted/50 rounded-lg px-4 py-2">
                  <div className="text-xl font-bold">
                    {usageStats.totalTokens?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('ai.settings.tokens')} ({t('ai.settings.thisMonth')})
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg px-4 py-2">
                  <div className="text-xl font-bold">
                    {usageStats.totalRequests?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('ai.settings.requests')} ({t('ai.settings.thisMonth')})
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg px-4 py-2">
                  <div className="text-xl font-bold">
                    ${usageStats.totalCost?.toFixed(4) || '0.0000'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('ai.settings.cost')} ({t('ai.settings.thisMonth')})
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers" onClick={() => setActiveTab('providers')}>
            {t('ai.nav.providers')}
          </TabsTrigger>
          <TabsTrigger value="api-keys" onClick={() => setActiveTab('api-keys')}>
            {t('ai.nav.apiKeys')}
          </TabsTrigger>
          <TabsTrigger value="models" onClick={() => setActiveTab('models')}>
            {t('ai.nav.models')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="providers">
          <Providers />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeys />
        </TabsContent>
        <TabsContent value="models">
          <Models />
        </TabsContent>
      </Tabs>
    </div>
  );
}
