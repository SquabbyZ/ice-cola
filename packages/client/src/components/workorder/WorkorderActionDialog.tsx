import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WorkorderActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject';
  workorderName: string;
  onConfirm: (comment?: string) => void;
}

export const WorkorderActionDialog: React.FC<WorkorderActionDialogProps> = ({
  open,
  onOpenChange,
  action,
  workorderName,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (action === 'reject' && comment.trim().length < 10) {
      setError('请输入至少10个字符的拒绝原因');
      return;
    }
    setError('');
    onConfirm(comment.trim() || undefined);
    setComment('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComment('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    if (error && action === 'reject' && value.trim().length >= 10) {
      setError('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent open={open} onClose={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? '确认通过' : '确认拒绝'}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve'
              ? `确定要通过工单 "${workorderName}" 吗？`
              : `确定要拒绝工单 "${workorderName}" 吗？`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {action === 'approve' ? '备注（可选）' : '拒绝原因（必填）'}
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={action === 'approve' ? '添加备注...' : '请输入拒绝原因，至少10个字符...'}
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {action === 'approve' ? '通过' : '拒绝'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};