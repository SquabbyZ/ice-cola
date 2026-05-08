import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-50/30">
      {/* Top Status Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-auto bg-zinc-50/20">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;