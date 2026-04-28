import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { teamService } from '@/services/team-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Mail, CheckCircle, XCircle } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-500">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (!token || isValidToken === false || !invitationInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <CardTitle>Invalid Invitation</CardTitle>
                <CardDescription>This invitation link is invalid or has expired.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {invitationInfo?.message || 'Please contact your team administrator for a new invitation.'}
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Team Invitation</CardTitle>
              <CardDescription>You've been invited to join a team</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invitation Info */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Team</span>
              <span className="font-semibold ml-auto">{invitationInfo.teamName}</span>
            </div>
            {invitationInfo.inviterName && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Invited by</span>
                <span className="font-semibold ml-auto">{invitationInfo.inviterName}</span>
              </div>
            )}
            {invitationInfo.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">To email</span>
                <span className="font-semibold ml-auto">{invitationInfo.email}</span>
              </div>
            )}
          </div>

          {/* Actions based on auth state */}
          {isAuthenticated ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700">
                  Logged in as {user?.email}
                </span>
              </div>
              <Button
                onClick={handleAcceptInvitation}
                className="w-full"
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-amber-700">
                  Please log in first to accept this invitation
                </span>
              </div>
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Log In to Accept
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}

export default Invite;