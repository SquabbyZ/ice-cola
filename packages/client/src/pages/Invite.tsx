import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { teamService } from '@/services/team-service';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Mail, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationInfo {
  valid: boolean;
  teamId?: string;
  teamName?: string;
  inviterName?: string;
  email?: string;
  expiresAt?: string;
  message?: string;
}

const Invite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user, isAuthenticated } = useAuthStore();

  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsLoading(false);
        return;
      }

      try {
        const data = await teamService.getInvitationByToken(token);
        setIsValidToken(true);
        setInvitationInfo(data);
      } catch (error: any) {
        setIsValidToken(false);
        setInvitationInfo({
          valid: false,
          message: error.response?.data?.message || 'Invalid or expired invitation',
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token || !invitationInfo?.teamId) return;

    setIsAccepting(true);
    try {
      await teamService.acceptInvitation(token);
      toast.success('Invitation accepted! Welcome to the team.');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50/50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-500">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (!token || isValidToken === false || !invitationInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-zinc-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zinc-300/10 rounded-full blur-3xl" />
        </div>

        <div className="bento-tile p-8 w-full max-w-md relative z-10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-red-100/50 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">Invalid Invitation</h2>
              <p className="text-sm text-zinc-500">This invitation link is invalid or has expired.</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 mb-6">
            {invitationInfo?.message || 'Please contact your team administrator for a new invitation.'}
          </p>

          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl border-zinc-200/50 hover:bg-zinc-100"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-zinc-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zinc-300/10 rounded-full blur-3xl" />
      </div>

      <div className="bento-tile p-8 w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
            <Users className="w-7 h-7 text-zinc-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Team Invitation</h2>
            <p className="text-sm text-zinc-500">You've been invited to join a team</p>
          </div>
        </div>

        {/* Invitation Info */}
        <div className="p-5 bg-zinc-50/50 rounded-2xl space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-500">Team</span>
            <span className="font-semibold text-zinc-900 ml-auto">{invitationInfo.teamName}</span>
          </div>
          {invitationInfo.inviterName && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">Invited by</span>
              <span className="font-semibold text-zinc-900 ml-auto">{invitationInfo.inviterName}</span>
            </div>
          )}
          {invitationInfo.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">To email</span>
              <span className="font-semibold text-zinc-900 ml-auto truncate max-w-[180px]">{invitationInfo.email}</span>
            </div>
          )}
        </div>

        {/* Actions based on auth state */}
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">
                Logged in as {user?.email}
              </span>
            </div>
            <Button
              onClick={handleAcceptInvitation}
              className="w-full btn-ice h-12 rounded-xl"
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100/50">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700">
                Please log in first to accept this invitation
              </span>
            </div>
            <Button
              onClick={() => navigate('/login')}
              className="w-full btn-ice h-12 rounded-xl"
            >
              Log In to Accept
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invite;