import React from 'react';
import { Clock, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillVersion } from '@/stores/skillsStore';

interface SkillVersionHistoryProps {
  versions: SkillVersion[];
  currentVersion: string;
  onPreview: (version: SkillVersion) => void;
  onRevert: (versionId: string) => void;
  onClose: () => void;
}

export const SkillVersionHistory: React.FC<SkillVersionHistoryProps> = ({
  versions,
  currentVersion,
  onPreview,
  onRevert,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">版本历史</h3>
              <p className="text-xs text-gray-500">{versions.length} 个版本</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                version.version === currentVersion
                  ? 'border-indigo-200 bg-indigo-50/50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${version.version === currentVersion ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  <span className="font-semibold text-gray-900 font-mono">v{version.version}</span>
                  {version.version === currentVersion && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">当前</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{new Date(version.createdAt).toLocaleDateString('zh-CN')}</div>
              </div>
              <p className="text-sm text-gray-500 mb-3">由 {version.createdByName || '未知'} 创建</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPreview(version)}>
                  <Eye className="w-3.5 h-3.5" /> 预览
                </Button>
                {version.version !== currentVersion && (
                  <Button size="sm" variant="ghost" className="gap-1.5 text-indigo-600" onClick={() => onRevert(version.id)}>
                    <RotateCcw className="w-3.5 h-3.5" /> 回退到此版本
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};