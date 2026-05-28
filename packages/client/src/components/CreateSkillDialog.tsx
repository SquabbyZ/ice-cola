import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AIGenerationPanel from '@/components/AIGenerationPanel';

interface CreateSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    content: string;
    icon: string;
    category: string;
    tags: string[];
    version: string;
  }) => Promise<void>;
}

const CATEGORIES = [
  { value: 'development', label: '开发' },
  { value: 'productivity', label: '生产力' },
  { value: 'tools', label: '工具' },
  { value: 'writing', label: '写作' },
  { value: 'analytics', label: '分析' },
];

export const CreateSkillDialog: React.FC<CreateSkillDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    content: '',
    icon: '',
    category: 'development',
    tags: '',
    version: '1.0.0',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  if (!open) return null;

  const handleAIApply = (config: Record<string, unknown>) => {
    setForm((prev) => ({
      ...prev,
      name: (config.name as string) || prev.name,
      description: (config.description as string) || prev.description,
      content: (config.content as string) || prev.content,
      icon: (config.icon as string) || prev.icon,
      category: (config.category as string) || prev.category,
      tags: Array.isArray(config.tags) ? (config.tags as string[]).join(', ') : prev.tags,
      version: (config.version as string) || prev.version,
    }));
    setShowAIPanel(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        content: form.content.trim(),
        icon: form.icon.trim() || '🛠️',
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        version: form.version.trim() || '1.0.0',
      });
      setForm({ name: '', description: '', content: '', icon: '', category: 'development', tags: '', version: '1.0.0' });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">创建 Skill</h3>
              <p className="text-xs text-zinc-500">创建一个新的个人 Skill</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI 生成
            </Button>
            <button onClick={() => { onClose(); setShowAIPanel(false); }} className="p-2 rounded-lg hover:bg-zinc-100">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 relative">
          {showAIPanel && (
            <div className="absolute inset-0 z-10 bg-white">
              <AIGenerationPanel
                type="skill"
                onApply={handleAIApply}
                onClose={() => setShowAIPanel(false)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例如：代码审查助手"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">描述 *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="描述这个 Skill 的功能和用途"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">版本</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">图标</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="🛠️"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">分类</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">标签（逗号分隔）</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="code, review, programming"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">内容</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm"
              placeholder="Skill 的指令内容..."
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name.trim() || !form.description.trim() || isSubmitting}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isSubmitting ? '创建中...' : '创建'}
          </Button>
        </div>
      </div>
    </div>
  );
};
