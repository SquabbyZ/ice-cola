import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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

  const handleConfirm = () => {
    if (action === 'reject' && comment.trim().length < 10) {
      return;
    }
    onConfirm(comment.trim() || undefined);
    setComment('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComment('');
    }
    onOpenChange(newOpen);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={action === 'approve' ? '确认通过' : '确认拒绝'}
      description={
        action === 'approve'
          ? `确定要通过工单 "${workorderName}" 吗？`
          : `确定要拒绝工单 "${workorderName}" 吗？`
      }
      confirmText={action === 'approve' ? '通过' : '拒绝'}
      cancelText="取消"
      onConfirm={handleConfirm}
      variant={action === 'reject' ? 'destructive' : 'default'}
    />
  );
};