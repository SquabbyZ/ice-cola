import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useQuotaStore } from '@/stores/quota';
import { toast } from 'sonner';
import { Save, Eye, EyeOff, Key, TrendingUp, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { ApiKeyService } from '@/services/apikey-service';
import { getServiceContainer } from '@/services/service-container';

const Settings: React.FC = () => {
  const { config, status, loadConfig, updateConfig, refreshStatus } = useQuotaStore();
  
  // Gateway 服务和 API Key 服务
  const [apiKeyService, setApiKeyService] = useState<ApiKeyService | null>(null);
  
  useEffect(() => {
    const client = getServiceContainer().gatewayClient;
    const rpc = new GatewayRpcService(client);
    const apiKeySvc = new ApiKeyService(rpc);
    setApiKeyService(apiKeySvc);
  }, []);
  
  // API Keys 状态
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    google: '',
    minimax: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    minimax: false,
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    minimax: false,
  });
  const [testResults, setTestResults] = useState<Record<string, { valid?: boolean; error?: string; loading?: boolean }>>({});
  // 追踪已保存的 API Key 状态
  const [savedApiKeys, setSavedApiKeys] = useState<Set<string>>(new Set());
  // 追踪是否显示掩码（已保存状态）
  const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});

  // 加载已保存的 API Key 状态
  useEffect(() => {
    if (apiKeyService) {
      const loadSavedStatus = async () => {
        try {
          const providers = ['openai', 'anthropic', 'google', 'minimax'];
          for (const provider of providers) {
            const hasKey = await apiKeyService.hasApiKey(provider);
            console.log(`📦 ${provider} has API Key:`, hasKey);
            if (hasKey) {
              setSavedApiKeys(prev => new Set(prev).add(provider));
              // 如果已保存，显示掩码状态
              setShowMasked(prev => ({ ...prev, [provider]: true }));
            }
          }
        } catch (error) {
          console.error('加载已保存 API Key 状态失败:', error);
        }
      };
      loadSavedStatus();
    }
  }, [apiKeyService]);

  // 加载配额配置
  useEffect(() => {
    loadConfig();
    refreshStatus();
  }, []);

  // 保存 API Key
  const handleSaveApiKey = async (provider: string, value: string) => {
    if (!value.trim()) return;
    
    console.log(`💾 Saving API key for ${provider}...`);
    setSaving(prev => ({ ...prev, [provider]: true }));
    
    try {
      if (!apiKeyService) {
        throw new Error('API Key 服务未初始化');
      }
      
      // 调用真实的保存逻辑
      await apiKeyService.saveApiKey(provider, value);
      console.log(`✅ API key saved successfully for ${provider}`);
      
      // 标记该 provider 的 key 已保存
      setSavedApiKeys(prev => new Set(prev).add(provider));
      // 切换到掩码显示状态
      setShowMasked(prev => ({ ...prev, [provider]: true }));
      // 清空输入框
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
      
      // 使用 Sonner toast
      toast.success("✅ 保存成功", {
        description: `${provider.toUpperCase()} API Key 已保存`,
      });
      
      // 重要提示：需要重启 Gateway
      setTimeout(() => {
        toast.warning("⚠️ 需要重启 Gateway", {
          description: "API Key 已保存到配置文件，但需要重启 Gateway 才能生效。请关闭并重新打开应用。",
          duration: 8000,
        });
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to save API key:', error);
      toast.error("❌ 保存失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  // 切换密码可见性
  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  // 测试 API Key
  const handleTestApiKey = async (provider: string) => {
    if (!apiKeyService) {
      toast.error("⚠️ 服务未就绪", {
        description: "API Key 服务尚未初始化，请稍后重试",
      });
      return;
    }
    
    setTestResults(prev => ({ ...prev, [provider]: { loading: true } as any }));
    
    try {
      const result = await apiKeyService.testApiKey(provider);
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: { valid: false, error: String(error) } 
      }));
    }
  };

  // 更新配额配置
  const handleUpdateQuota = async (updates: { monthlyBudget?: number; warningThreshold?: number; hardLimit?: boolean }) => {
    if (config) {
      await updateConfig(updates);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">


          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">设置</h1>
            <p className="text-gray-600">管理你的 API Keys、配额和其他偏好设置</p>
          </div>

          {/* API Keys 管理 */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['openai', 'anthropic', 'google', 'minimax'].map((provider) => (
                <div key={provider} className="space-y-2">
                  <Label className="capitalize flex items-center justify-between">
                    <span>{provider} API Key</span>
                    {testResults[provider] && (
                      <span className="text-xs flex items-center gap-1">
                        {testResults[provider].loading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        ) : testResults[provider].valid ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        {testResults[provider].loading ? '测试中...' : 
                         testResults[provider].valid ? '有效' : 
                         testResults[provider].error || '无效'}
                      </span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      {showMasked[provider] ? (
                        // 已保存状态：显示掩码
                        <div className="flex items-center h-10 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-600">
                          <span className="flex-1">••••••••••••••••</span>
                          <span className="text-xs text-green-600 ml-2">已保存</span>
                        </div>
                      ) : (
                        // 输入状态
                        <>
                          <Input
                            type={showKeys[provider] ? 'text' : 'password'}
                            value={apiKeys[provider]}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                            placeholder={`输入 ${provider.toUpperCase()} API Key`}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(provider)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showKeys[provider] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                    {showMasked[provider] ? (
                      // 已保存状态：显示修改按钮 + 测试按钮
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setShowMasked(prev => ({ ...prev, [provider]: false }));
                            setApiKeys(prev => ({ ...prev, [provider]: '' }));
                          }}
                        >
                          修改
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTestApiKey(provider)}
                          title="测试 API Key 是否有效"
                        >
                          测试
                        </Button>
                      </>
                    ) : (
                      // 输入状态：显示保存按钮 + 测试按钮
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSaveApiKey(provider, apiKeys[provider])}
                          disabled={saving[provider] || !apiKeys[provider].trim()}
                        >
                          {saving[provider] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTestApiKey(provider)}
                          disabled={!savedApiKeys.has(provider)}
                          title={!savedApiKeys.has(provider) ? '请先保存 API Key 后再测试' : '测试 API Key 是否有效'}
                        >
                          测试
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    🔒 API Key 将通过 Gateway 加密存储
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 配额设置 */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                用量配额
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {config && (
                <>
                  {/* 月度预算 */}
                  <div className="space-y-2">
                    <Label>月度预算上限 (USD)</Label>
                    <Input
                      type="number"
                      value={config.monthlyBudget}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateQuota({ monthlyBudget: parseFloat(e.target.value) })}
                      min={0}
                      step={0.01}
                      className="max-w-xs"
                    />
                  </div>

                  {/* 预警阈值 */}
                  <div className="space-y-3">
                    <Label>预警阈值 (%)</Label>
                    <Slider
                      value={[config.warningThreshold * 100]}
                      onValueChange={([value]: number[]) => handleUpdateQuota({ warningThreshold: value / 100 })}
                      min={50}
                      max={100}
                      step={5}
                      className="max-w-xs"
                    />
                    <p className="text-sm text-gray-500">
                      当用量达到 {config.warningThreshold * 100}% 时发出警告
                    </p>
                  </div>

                  {/* 硬限制 */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>硬限制</Label>
                      <p className="text-sm text-gray-500">
                        达到预算上限后自动停止请求
                      </p>
                    </div>
                    <Switch
                      checked={config.hardLimit}
                      onCheckedChange={(checked: boolean) => handleUpdateQuota({ hardLimit: checked })}
                    />
                  </div>

                  {/* 当前状态 */}
                  {status && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Shield className="w-4 h-4" />
                        <span>当前用量: ${status.currentCost.toFixed(2)} / ${status.budget.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 其他设置（占位） */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle>其他设置</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                更多设置选项将在后续版本中添加...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
