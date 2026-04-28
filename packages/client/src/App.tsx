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
import { Toaster } from '@/components/ui/sonner';

const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="extensions" element={<Extensions />} />
          <Route path="experts" element={<Experts />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="skills" element={<Skills />} />
          <Route path="mcp" element={<MCP />} />
          <Route path="workorders" element={<Workorders />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
};

export default App;
