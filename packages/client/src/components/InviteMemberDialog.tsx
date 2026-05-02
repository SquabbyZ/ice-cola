import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Send, CheckCircle, XCircle } from 'lucide-react';
import { teamService } from '@/services/team-service';
import { toast } from 'sonner';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

interface InviteResult {
  success: boolean;
  email?: string;
  message?: string;
}

const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  open,
  onOpenChange,
  teamId,
  teamName,
}) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);

  const handleSendInvite = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      await teamService.sendTeamInvite(teamId, email.trim());
      setResult({
        success: true,
        email: email.trim(),
        message: 'Invitation sent successfully',
      });
      toast.success('Invitation sent successfully');
      setEmail('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send invitation';
      setResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setResult(null);
  };

  const handleCancel = () => {
    handleClose();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join {teamName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {result ? (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? 'Invitation Sent' : 'Invitation Failed'}
                </p>
                {result.success ? (
                  <p className="text-sm text-green-600">
                    An invitation email has been sent to {result.email}
                  </p>
                ) : (
                  <p className="text-sm text-red-600">{result.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                  disabled={isSending}
                />
              </div>
              <p className="text-xs text-gray-500">
                The invited person will receive an email with a link to join your team.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setResult(null)}
                className="flex-1"
              >
                Send Another
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Done
              </Button>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={handleSendInvite} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;