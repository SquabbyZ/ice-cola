import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import OwnerRegistration from './pages/OwnerRegistration';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Invitations from './pages/Invitations';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AcceptInvite from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import AiSettings from './pages/ai/AISettings';
import Marketplace from './pages/Marketplace';
import ApprovalCenter from './pages/ApprovalCenter';
import RedemptionCodes from './pages/RedemptionCodes';
import RedemptionCodeDetail from './pages/RedemptionCodeDetail';
import LingqiLedger from './pages/LingqiLedger';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register-owner" element={<OwnerRegistration />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="invitations"
            element={
              <ProtectedRoute>
                <Invitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute roles={['OWNER', 'ADMIN']}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="ai/settings"
            element={
              <ProtectedRoute roles={['OWNER', 'ADMIN']}>
                <AiSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="marketplace"
            element={
              <ProtectedRoute>
                <Marketplace />
              </ProtectedRoute>
            }
          />
          <Route
            path="approval-center"
            element={
              <ProtectedRoute>
                <ApprovalCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="redemption-codes"
            element={
              <ProtectedRoute roles={['OWNER', 'ADMIN']}>
                <RedemptionCodes />
              </ProtectedRoute>
            }
          />
          <Route
            path="redemption-codes/:id"
            element={
              <ProtectedRoute roles={['OWNER', 'ADMIN']}>
                <RedemptionCodeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="lingqi-ledger"
            element={
              <ProtectedRoute roles={['OWNER', 'ADMIN']}>
                <LingqiLedger />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;