import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Settings, Brain, Key, Database, HelpCircle, User, ChevronLeft, Eye, EyeOff, Save, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { ApiKeyService } from '@/services/apikey-service';
import { gatewayClient } from '@/lib/gateway-client';
import { useQuotaStore } from '@/stores/quota';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'account' | 'system' | 'memory' | 'model' | 'claw' | 'data' | 'help';

const API_PROVIDERS = [
  { id: 'minimax', name: 'MiniMax', color: 'bg-orange-500' },
  { id: 'openai', name: 'OpenAI', color: 'bg-green-500' },
  { id: 'anthropic', name: 'Anthropic', color: 'bg-orange-600' },
  { id: 'google', name: 'Google', color: 'bg-blue-500' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');
  const [dataSubTab, setDataSubTab] = useState<'list' | 'shared' | 'archived'>('list');

  // API Key 管理状态
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { valid?: boolean; error?: string; detail?: string; loading?: boolean }>>({});

  // Quota store
  const { config, status, loadConfig, updateConfig } = useQuotaStore();

  // Gateway 服务
  const gatewayRpc = new GatewayRpcService(gatewayClient);
  const apiKeyService = new ApiKeyService(gatewayRpc);

  // 加载已保存的 API Key 状态
  useEffect(() => {
    if (!isOpen) return;

    const loadSavedKeys = async () => {
      for (let i = 0; i < 50; i++) {
        if (gatewayClient.isConnected()) break;
        await new Promise(r => setTimeout(r, 100));
      }

      try {
        for (const provider of API_PROVIDERS) {
          const hasKey = await apiKeyService.hasApiKey(provider.id);
          if (hasKey) {
            setSavedKeys(prev => ({ ...prev, [provider.id]: true }));
            setShowMasked(prev => ({ ...prev, [provider.id]: true }));
          }
        }
      } catch (error) {
        console.error('Failed to load saved API keys:', error);
      }
    };

    loadSavedKeys();
    loadConfig();
  }, [isOpen]);

  // 保存 API Key
  const handleSaveApiKey = async (provider: string) => {
    const value = apiKeys[provider];
    if (!value?.trim()) return;

    if (!gatewayClient.isConnected()) {
      toast.error(t('common.gatewayNotConnected'), { description: t('common.restartGatewayDesc') });
      return;
    }

    setSaving(prev => ({ ...prev, [provider]: true }));

    try {
      await apiKeyService.saveApiKey(provider, value.trim());
      setShowMasked(prev => ({ ...prev, [provider]: true }));
      setSavedKeys(prev => ({ ...prev, [provider]: true }));
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
      toast.success(`${provider.toUpperCase()} API Key ${t('common.saved')}`);

      setTimeout(() => {
        toast.warning(`⚠️ ${t('common.restartGateway')}`, {
          description: t('common.restartGatewayDesc'),
          duration: 5000,
        });
      }, 1000);
    } catch (error) {
      toast.error(t('common.error'), { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  // 测试 API Key
  const handleTestApiKey = async (provider: string) => {
    if (!savedKeys[provider] || !gatewayClient.isConnected()) return;

    setTestResults(prev => ({ ...prev, [provider]: { loading: true } as any }));

    try {
      const result = await apiKeyService.testApiKey(provider);
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider]: { valid: false, error: String(error) } }));
    }
  };

  // 更新配额配置
  const handleUpdateQuota = async (updates: { monthlyBudget?: number; warningThreshold?: number; hardLimit?: boolean }) => {
    try {
      await updateConfig(updates);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'), { description: error instanceof Error ? error.message : String(error) });
    }
  };

  // 配额表单状态
  const [quotaForm, setQuotaForm] = useState({
    monthlyBudget: 50,
    warningThreshold: 0.8,
    hardLimit: true,
  });

  // 同步 config 到表单
  useEffect(() => {
    if (config) {
      setQuotaForm({
        monthlyBudget: config.monthlyBudget,
        warningThreshold: config.warningThreshold,
        hardLimit: config.hardLimit,
      });
    }
  }, [config]);

  // 检查表单是否有变更
  const hasQuotaChanges = config && (
    quotaForm.monthlyBudget !== config.monthlyBudget ||
    quotaForm.warningThreshold !== config.warningThreshold ||
    quotaForm.hardLimit !== config.hardLimit
  );

  // 保存配额配置
  const handleSaveQuotaConfig = async () => {
    await handleUpdateQuota(quotaForm);
  };

  if (!isOpen) return null;

  const menuItems: { id: SettingsTab; icon: React.FC<any>; label: string }[] = [
    { id: 'account', icon: User, label: t('settingsModal.tabs.account') },
    { id: 'system', icon: Settings, label: t('settingsModal.tabs.system') },
    { id: 'memory', icon: Brain, label: t('settingsModal.tabs.memory') },
    { id: 'model', icon: Key, label: t('settingsModal.tabs.model') },
    { id: 'claw', icon: Settings, label: t('settingsModal.tabs.claw') },
    { id: 'data', icon: Database, label: t('settingsModal.tabs.data') },
    { id: 'help', icon: HelpCircle, label: t('settingsModal.tabs.help') },
  ];

  const renderSystemSettings = () => (
    <div className="space-y-6">
      {/* 语言 */}
      <div className="flex items-center justify-between py-3 border-b border-zinc-100">
        <div>
          <p className="font-medium text-zinc-900">{t('settingsModal.system.displayLanguage')}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.system.displayLanguageDesc')}</p>
        </div>
        <select className="px-3 py-2 border border-zinc-200 rounded-lg bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option>中文(简体)</option>
          <option>English</option>
        </select>
      </div>

      {/* 字体大小 */}
      <div className="py-3 border-b border-zinc-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-medium text-zinc-900">{t('settingsModal.system.fontSize')}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.system.fontSizeDesc')}</p>
          </div>
          <span className="text-sm text-zinc-500">{t('settingsModal.system.default')}</span>
        </div>
        <Slider defaultValue={[50]} max={100} min={25} step={5} className="max-w-xs" />
      </div>

      {/* 开关设置 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-zinc-900">{t('settingsModal.system.conciseMode')}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.system.conciseModeDesc')}</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-zinc-100">
          <div>
            <p className="font-medium text-zinc-900">{t('settingsModal.system.autoInstall')}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.system.autoInstallDesc')}</p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-zinc-100">
          <div>
            <p className="font-medium text-zinc-900">{t('settingsModal.system.antiSleep')}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.system.antiSleepDesc')}</p>
          </div>
          <Switch />
        </div>
      </div>
    </div>
  );

  const renderMemorySettings = () => (
    <div className="space-y-6">
      <p className="text-zinc-600 text-sm">
        {t('settingsModal.memory.desc')}
      </p>

      <div className="flex items-center justify-between py-3 border-b border-zinc-100">
        <div>
          <p className="font-medium text-zinc-900">{t('settingsModal.memory.generateConversationMemory')}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.memory.generateConversationMemoryDesc')}</p>
        </div>
        <Switch defaultChecked />
      </div>

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="font-medium text-zinc-900">{t('settingsModal.memory.importFromOtherAI')}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{t('settingsModal.memory.importFromOtherAIDesc')}</p>
        </div>
        <Button variant="outline" size="sm">{t('settingsModal.memory.startImport')}</Button>
      </div>
    </div>
  );

  const renderModelSettings = () => (
    <div className="space-y-6">
      {/* API Keys 配置 */}
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-4">{t('settingsModal.model.apiKeys')}</h3>
        <div className="space-y-4">
          {API_PROVIDERS.map((provider) => (
            <Card key={provider.id} className="bg-zinc-50 border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                    <span className="font-medium text-zinc-900">{provider.name}</span>
                  </div>
                  {testResults[provider.id] && (
                    <span className="text-xs flex items-center gap-1">
                      {testResults[provider.id].loading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      ) : testResults[provider.id].valid ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      {testResults[provider.id].loading ? t('settingsModal.model.testing') :
                       testResults[provider.id].valid ? t('settingsModal.model.valid') :
                       testResults[provider.id].error || t('settingsModal.model.invalid')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {showMasked[provider.id] ? (
                      <div className="flex items-center h-10 px-3 rounded-md border border-zinc-200 bg-white text-zinc-600">
                        <span className="flex-1 font-mono text-sm">••••••••••••••••</span>
                        <span className="text-xs text-green-600 ml-2">{t('settingsModal.model.saved')}</span>
                      </div>
                    ) : (
                      <>
                        <Input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={apiKeys[provider.id] || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))
                          }
                          placeholder={t('settingsModal.model.enterApiKey', { provider: provider.name })}
                          className="pr-10 h-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
                        >
                          {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>

                  {showMasked[provider.id] ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setShowMasked(prev => ({ ...prev, [provider.id]: false }))}>
                        {t('settingsModal.model.edit')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTestApiKey(provider.id)}>
                        {t('settingsModal.model.test')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleSaveApiKey(provider.id)} disabled={saving[provider.id] || !apiKeys[provider.id]?.trim()}>
                        {saving[provider.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTestApiKey(provider.id)} disabled={!savedKeys[provider.id]}>
                        {t('settingsModal.model.test')}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 配额设置 */}
      <div className="border-t border-zinc-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900">{t('settingsModal.model.quotaSettings')}</h3>
          <Button
            size="sm"
            onClick={handleSaveQuotaConfig}
            disabled={!hasQuotaChanges}
          >
            {t('settingsModal.model.saveConfig')}
          </Button>
        </div>
        <Card className="bg-zinc-50 border-zinc-200">
          <CardContent className="p-4 space-y-4">
            {config && (
              <>
                <div className="space-y-2">
                  <Label>{t('settingsModal.model.monthlyBudgetLabel')}</Label>
                  <Input
                    type="number"
                    value={quotaForm.monthlyBudget}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = parseFloat(e.target.value) || 0;
                      setQuotaForm(prev => ({ ...prev, monthlyBudget: value }));
                    }}
                    min={0}
                    step={1}
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('settingsModal.model.warningThreshold')}</Label>
                    <span className="text-sm text-zinc-500">{Math.round(quotaForm.warningThreshold * 100)}%</span>
                  </div>
                  <div className="pt-2">
                    <Slider
                      value={[quotaForm.warningThreshold * 100]}
                      onValueChange={([value]: number[]) => {
                        setQuotaForm(prev => ({ ...prev, warningThreshold: value / 100 }));
                      }}
                      min={50}
                      max={100}
                      step={5}
                      className="w-full max-w-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label>{t('settingsModal.model.hardLimit')}</Label>
                    <p className="text-xs text-zinc-500">{t('settingsModal.model.hardLimitDesc')}</p>
                  </div>
                  <Switch
                    checked={quotaForm.hardLimit}
                    onCheckedChange={(checked: boolean) => {
                      setQuotaForm(prev => ({ ...prev, hardLimit: checked }));
                    }}
                  />
                </div>

                {status && (
                  <div className="pt-3 border-t border-zinc-200 text-sm text-zinc-600">
                    {t('settingsModal.model.currentUsage', { cost: status.currentCost.toFixed(2), budget: status.budget.toFixed(2) })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderClawSettings = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">{t('settingsModal.claw.integrations')}</h3>

      {[
        { name: t('settingsModal.claw.wechatMiniProgram'), desc: t('settingsModal.claw.wechatMiniProgramDesc'), badge: null },
        { name: t('settingsModal.claw.wechatClawBot'), desc: t('settingsModal.claw.wechatClawBotDesc'), badge: t('settingsModal.claw.recommended') },
        { name: t('settingsModal.claw.weworkAIBot'), desc: t('settingsModal.claw.weworkAIBotDesc'), badge: null },
        { name: t('settingsModal.claw.qqBot'), desc: t('settingsModal.claw.qqBotDesc'), badge: null },
        { name: t('settingsModal.claw.feishu'), desc: t('settingsModal.claw.feishuDesc'), badge: null },
        { name: t('settingsModal.claw.dingtalk'), desc: t('settingsModal.claw.dingtalkDesc'), badge: null },
      ].map((item, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-zinc-200">
              <span className="text-lg">💬</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-zinc-900">{item.name}</p>
                {item.badge && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{item.badge}</span>
                )}
              </div>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            {t('settingsModal.claw.configure')} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ))}

      <div className="border-t border-zinc-200 pt-4 mt-6">
        <h4 className="font-medium text-zinc-900 mb-3">{t('settingsModal.claw.sessionManagement')}</h4>
        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
          <div>
            <p className="font-medium text-zinc-900">{t('settingsModal.claw.autoNewSession')}</p>
            <p className="text-sm text-zinc-500">{t('settingsModal.claw.autoNewSessionDesc')}</p>
          </div>
          <Switch />
        </div>
      </div>
    </div>
  );

  const renderDataManagement = () => {
    if (dataSubTab === 'shared') {
      return (
        <div>
          <button onClick={() => setDataSubTab('list')} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4">
            <ChevronLeft className="w-4 h-4" /> {t('settingsModal.data.sharedFilesTitle')}
          </button>
          <div className="py-12 text-center text-zinc-400">
            {t('settingsModal.data.noSharedFiles')}
          </div>
        </div>
      );
    }

    if (dataSubTab === 'archived') {
      return (
        <div>
          <button onClick={() => setDataSubTab('list')} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4">
            <ChevronLeft className="w-4 h-4" /> {t('settingsModal.data.archivedTasksTitle')}
          </button>
          <div className="py-12 text-center text-zinc-400">
            {t('settingsModal.data.noArchivedTasks')}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {[
          { icon: '📄', title: t('settingsModal.data.sharedFiles'), desc: t('settingsModal.data.sharedFilesDesc') },
          { icon: '📦', title: t('settingsModal.data.archivedTasks'), desc: t('settingsModal.data.archivedTasksDesc') },
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-medium text-zinc-900">{item.title}</p>
                <p className="text-sm text-zinc-500">{item.desc}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDataSubTab(index === 0 ? 'shared' : 'archived')}>
              {t('settingsModal.data.manage')}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderHelp = () => (
    <div className="space-y-3">
      {[
        { title: t('settingsModal.help.helpDocs'), icon: '📖' },
        { title: t('settingsModal.help.feedback'), icon: '💬' },
        { title: t('settingsModal.help.aboutUs'), icon: 'ℹ️' },
      ].map((item, index) => (
        <button key={index} className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium text-zinc-900">{item.title}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account': return <div className="text-zinc-500 text-center py-12">{t('settingsModal.account.inDevelopment')}</div>;
      case 'system': return renderSystemSettings();
      case 'memory': return renderMemorySettings();
      case 'model': return renderModelSettings();
      case 'claw': return renderClawSettings();
      case 'data': return renderDataManagement();
      case 'help': return renderHelp();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-[900px] h-[650px] rounded-xl shadow-2xl flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 左侧菜单 */}
        <div className="w-56 bg-zinc-50/50 border-r border-zinc-200 p-3">
          <div className="text-lg font-semibold text-zinc-900 px-3 py-2 mb-4">{t('settings.title')}</div>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (item.id === 'data') setDataSubTab('list'); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === item.id
                    ? 'bg-white text-zinc-900 shadow-sm font-medium border border-zinc-200'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">
              {menuItems.find((item) => item.id === activeTab)?.label}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;