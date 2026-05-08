import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Invitations from './pages/Invitations';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AcceptInvite from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import AiSettings from './pages/ai/ApiKeys';
import Marketplace from './pages/Marketplace';
import ApprovalCenter from './pages/ApprovalCenter';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
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
              <ProtectedRoute>
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
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};

export default App;