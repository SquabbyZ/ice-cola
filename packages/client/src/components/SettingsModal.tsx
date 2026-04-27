import React, { useState, useEffect } from 'react';
import { X, Settings, Brain, Key, Database, HelpCircle, User, ChevronLeft, ExternalLink, Eye, EyeOff, Save, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      toast.error('Gateway 未连接', { description: '请检查后端服务是否启动' });
      return;
    }

    setSaving(prev => ({ ...prev, [provider]: true }));

    try {
      await apiKeyService.saveApiKey(provider, value.trim());
      setShowMasked(prev => ({ ...prev, [provider]: true }));
      setSavedKeys(prev => ({ ...prev, [provider]: true }));
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
      toast.success(`${provider.toUpperCase()} API Key 已保存`);

      setTimeout(() => {
        toast.warning("⚠️ 需要重启 Gateway", {
          description: "API Key 已保存到配置文件，但需要重启 Gateway 才能生效。",
          duration: 5000,
        });
      }, 1000);
    } catch (error) {
      toast.error('保存失败', { description: error instanceof Error ? error.message : String(error) });
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
      toast.success('配额配置已更新');
    } catch (error) {
      toast.error('更新失败', { description: error instanceof Error ? error.message : String(error) });
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
    { id: 'account', icon: User, label: '账户' },
    { id: 'system', icon: Settings, label: '系统' },
    { id: 'memory', icon: Brain, label: '记忆' },
    { id: 'model', icon: Key, label: '模型' },
    { id: 'claw', icon: Settings, label: 'Claw' },
    { id: 'data', icon: Database, label: '数据' },
    { id: 'help', icon: HelpCircle, label: '帮助' },
  ];

  const renderSystemSettings = () => (
    <div className="space-y-6">
      {/* 语言 */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <p className="font-medium text-gray-900">显示语言</p>
          <p className="text-sm text-gray-500 mt-0.5">设置应用程序界面的显示语言</p>
        </div>
        <select className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option>中文(简体)</option>
          <option>English</option>
        </select>
      </div>

      {/* 字体大小 */}
      <div className="py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-medium text-gray-900">字体大小</p>
            <p className="text-sm text-gray-500 mt-0.5">调整界面文字大小</p>
          </div>
          <span className="text-sm text-gray-500">默认</span>
        </div>
        <Slider defaultValue={[50]} max={100} min={25} step={5} className="max-w-xs" />
      </div>

      {/* 开关设置 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-gray-900">简洁模式</p>
            <p className="text-sm text-gray-500 mt-0.5">简化对话界面显示</p>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="font-medium text-gray-900">非高风险自动安装</p>
            <p className="text-sm text-gray-500 mt-0.5">检测结果为非高风险时自动继续安装</p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="font-medium text-gray-900">防休眠</p>
            <p className="text-sm text-gray-500 mt-0.5">防止电脑进入休眠状态</p>
          </div>
          <Switch />
        </div>
      </div>
    </div>
  );

  const renderMemorySettings = () => (
    <div className="space-y-6">
      <p className="text-gray-600 text-sm">
        记忆让 Claw 记住你的偏好和习惯，对话越多，它就越懂你。
      </p>

      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div>
          <p className="font-medium text-gray-900">生成对话记忆</p>
          <p className="text-sm text-gray-500 mt-0.5">允许从对话中提取并记住相关上下文</p>
        </div>
        <Switch defaultChecked />
      </div>

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="font-medium text-gray-900">从其他AI导入记忆</p>
          <p className="text-sm text-gray-500 mt-0.5">一键同步使用习惯</p>
        </div>
        <Button variant="outline" size="sm">开始导入</Button>
      </div>
    </div>
  );

  const renderModelSettings = () => (
    <div className="space-y-6">
      {/* API Keys 配置 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h3>
        <div className="space-y-4">
          {API_PROVIDERS.map((provider) => (
            <Card key={provider.id} className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                    <span className="font-medium text-gray-900">{provider.name}</span>
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
                      {testResults[provider.id].loading ? '测试中...' :
                       testResults[provider.id].valid ? '有效' :
                       testResults[provider.id].error || '无效'}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {showMasked[provider.id] ? (
                      <div className="flex items-center h-10 px-3 rounded-md border border-gray-200 bg-white text-gray-600">
                        <span className="flex-1 font-mono text-sm">••••••••••••••••</span>
                        <span className="text-xs text-green-600 ml-2">已保存</span>
                      </div>
                    ) : (
                      <>
                        <Input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={apiKeys[provider.id] || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))
                          }
                          placeholder={`输入 ${provider.name} API Key`}
                          className="pr-10 h-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>

                  {showMasked[provider.id] ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setShowMasked(prev => ({ ...prev, [provider.id]: false }))}>
                        修改
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTestApiKey(provider.id)}>
                        测试
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleSaveApiKey(provider.id)} disabled={saving[provider.id] || !apiKeys[provider.id]?.trim()}>
                        {saving[provider.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleTestApiKey(provider.id)} disabled={!savedKeys[provider.id]}>
                        测试
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
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">配额设置</h3>
          <Button
            size="sm"
            onClick={handleSaveQuotaConfig}
            disabled={!hasQuotaChanges}
          >
            保存配置
          </Button>
        </div>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4 space-y-4">
            {config && (
              <>
                <div className="space-y-2">
                  <Label>月度预算上限 (USD)</Label>
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
                    <Label>预警阈值</Label>
                    <span className="text-sm text-gray-500">{Math.round(quotaForm.warningThreshold * 100)}%</span>
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
                    <Label>硬限制</Label>
                    <p className="text-xs text-gray-500">达到预算上限后自动停止请求</p>
                  </div>
                  <Switch
                    checked={quotaForm.hardLimit}
                    onCheckedChange={(checked: boolean) => {
                      setQuotaForm(prev => ({ ...prev, hardLimit: checked }));
                    }}
                  />
                </div>

                {status && (
                  <div className="pt-3 border-t border-gray-200 text-sm text-gray-600">
                    当前用量: ${status.currentCost.toFixed(2)} / ${status.budget.toFixed(2)}
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">集成设置</h3>

      {[
        { name: '微信小程序', desc: '接入微信小程序', badge: null },
        { name: '微信 ClawBot', desc: '扫码连接 ClawBot', badge: '推荐' },
        { name: '企微 AIBot', desc: '企微机器人集成', badge: null },
        { name: 'QQ 机器人', desc: 'QQ 机器人集成', badge: null },
        { name: '飞书', desc: '飞书应用集成', badge: null },
        { name: '钉钉', desc: '钉钉机器人集成', badge: null },
      ].map((item, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <span className="text-lg">💬</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{item.name}</p>
                {item.badge && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{item.badge}</span>
                )}
              </div>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            配置 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ))}

      <div className="border-t border-gray-200 pt-4 mt-6">
        <h4 className="font-medium text-gray-900 mb-3">会话管理</h4>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">自动新起会话</p>
            <p className="text-sm text-gray-500">超过设定时间未对话，自动开启新对话</p>
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
          <button onClick={() => setDataSubTab('list')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ChevronLeft className="w-4 h-4" /> 已分享的文件
          </button>
          <div className="py-12 text-center text-gray-400">
            暂无分享文件
          </div>
        </div>
      );
    }

    if (dataSubTab === 'archived') {
      return (
        <div>
          <button onClick={() => setDataSubTab('list')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ChevronLeft className="w-4 h-4" /> 已归档任务
          </button>
          <div className="py-12 text-center text-gray-400">
            暂无已归档任务
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {[
          { icon: '📄', title: '我分享的文件', desc: '管理已分享的文件' },
          { icon: '📦', title: '已归档任务', desc: '查看和管理归档任务' },
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDataSubTab(index === 0 ? 'shared' : 'archived')}>
              管理
            </Button>
          </div>
        ))}
      </div>
    );
  };

  const renderHelp = () => (
    <div className="space-y-3">
      {[
        { title: '帮助文档', icon: '📖' },
        { title: '意见反馈', icon: '💬' },
        { title: '关于我们', icon: 'ℹ️' },
      ].map((item, index) => (
        <button key={index} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium text-gray-900">{item.title}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'account': return <div className="text-gray-500 text-center py-12">账户管理功能开发中...</div>;
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-[900px] h-[650px] rounded-xl shadow-2xl flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 左侧菜单 */}
        <div className="w-56 bg-gray-50/50 border-r border-gray-200 p-3">
          <div className="text-lg font-semibold text-gray-900 px-3 py-2 mb-4">设置</div>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if (item.id === 'data') setDataSubTab('list'); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === item.id
                    ? 'bg-white text-gray-900 shadow-sm font-medium border border-gray-200'
                    : 'text-gray-600 hover:bg-gray-100'
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {menuItems.find((item) => item.id === activeTab)?.label}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
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