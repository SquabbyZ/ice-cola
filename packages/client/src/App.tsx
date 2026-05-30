import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Extensions from './pages/Extensions';
import Experts from './pages/Experts';
import Tasks from './pages/Tasks';
import Skills from './pages/Skills';
import MCP from './pages/MCP';
import Workorders from './pages/Workorders';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Invite from './pages/Invite';
import Lingqi from './pages/Lingqi';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/invite" element={<Invite />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="extensions" element={<Extensions />} />
          <Route path="experts" element={<Experts />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="skills" element={<Skills />} />
          <Route path="mcp" element={<MCP />} />
          <Route path="workorders" element={<Workorders />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="lingqi" element={<Lingqi />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
};

export default App;
