import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleAccept = () => {
    // TODO: Implement invitation acceptance
    console.log('Accepting invitation with token:', token);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>You've been invited to join a team</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You have been invited to join a team. Click below to accept the invitation.
              </p>
              <Button onClick={handleAccept} className="w-full">
                Accept Invitation
              </Button>
            </div>
          ) : (
            <p className="text-sm text-red-500">Invalid invitation link.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;