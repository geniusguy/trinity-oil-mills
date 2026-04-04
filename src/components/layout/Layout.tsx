'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-4 sm:py-6">
            <div
              className={`tom-dashboard-forms mx-auto w-full px-3 sm:px-4 lg:px-5 xl:px-6 2xl:px-8 transition-all duration-300 ${
                sidebarCollapsed
                  ? 'max-w-full'
                  : // Sidebar is w-64 (16rem) on lg+; use nearly full main column on wide screens (less empty gutter).
                    'max-w-7xl xl:max-w-[min(100rem,calc(100vw-17rem))] 2xl:max-w-[min(110rem,calc(100vw-17rem))]'
              }`}
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

