import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden pavilion-page">
      <TopBar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />

        <main className="relative min-h-0 flex-1 overflow-auto">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(180,122,34,0.12),transparent_28rem)]" />
          <div className="relative min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;