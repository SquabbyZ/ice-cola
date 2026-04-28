import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useInvitations, useRevokeInvitation } from '../hooks/useInvitations';

const Invitations: React.FC = () => {
  const { data: invitations = [], isLoading, error } = useInvitations();
  const revokeInvitation = useRevokeInvitation();

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }
    try {
      await revokeInvitation.mutateAsync(invitationId);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Invitations</h2>
        <p className="text-gray-600">Manage team invitations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations that are waiting to be accepted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">Loading invitations...</p>
          ) : error ? (
            <p className="text-red-500">{(error as Error).message}</p>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No pending invitations.</p>
              <p className="text-sm text-gray-400 mt-1">
                Go to Users page to send new invitations.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        {invitation.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        disabled={revokeInvitation.isPending}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        {revokeInvitation.isPending ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invitations;