'use client';

import React, { useEffect, useState } from 'react';
import { getQueueCount, setupOnlineFlush, flushQueue } from '@/lib/offlineQueue';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '../ui';

interface HeaderProps {
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onToggleSidebar }) => {
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  useEffect(() => {
    setupOnlineFlush();
    const updateCount = async () => setQueueCount(await getQueueCount());
    updateCount();
    const onUpdate = (e: any) => setQueueCount(e.detail?.count || 0);
    window.addEventListener('offline-queue-update' as any, onUpdate);
    return () => window.removeEventListener('offline-queue-update' as any, onUpdate);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-700"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-700"
              title="Toggle Sidebar"
            >
              <span className="sr-only">Toggle sidebar</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>
          )}
          
          <div className="ml-4 lg:ml-0 flex items-center gap-3">
            <img 
              src="/Trinity-Oil-favicon-152x152.png" 
              alt="Trinity Oil Mills" 
              className="h-8 w-8 object-contain rounded lg:hidden"
            />
            <h1 className="text-xl font-semibold text-gray-900">
              TOM management
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Offline queue indicator */}
          <button onClick={() => flushQueue()} title="Sync queued actions" className={`p-2 rounded-md ${queueCount > 0 ? 'text-amber-700 bg-amber-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
            <span className="sr-only">Sync</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0019 5" />
            </svg>
            {queueCount > 0 && (
              <span className="ml-1 text-xs font-semibold">{queueCount}</span>
            )}
          </button>
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md">
            <span className="sr-only">View notifications</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 text-sm rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700"
            >
              <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{session?.user?.role}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500">{session?.user?.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{session?.user?.role}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

