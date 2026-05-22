import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ApiKeys from './ApiKeys';
import Models from './Models';
import Providers from './Providers';

export default function AISettings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('providers');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('ai.settings.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('ai.settings.description')}</p>
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
