import React, { useState } from 'react';
import { LogOut, QrCode, User as UserIcon, Menu, AlertTriangle } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, title }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                <span className="hidden sm:inline">Smart Attendance</span>
                <span className="sm:hidden">Attendance</span>
              </span>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{user?.role}</span>
              </div>
              
              <div className="md:hidden h-8 w-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-100">
                {user?.name.charAt(0)}
              </div>

              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              <button
                onClick={handleLogoutClick}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm animate-fade-in p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 ring-1 ring-gray-200">
             <div className="p-6 text-center">
               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 animate-bounce-slight">
                 <AlertTriangle className="h-6 w-6 text-red-600" />
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Out?</h3>
               <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out of your account?</p>
               <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setShowLogoutConfirm(false)}
                   className="w-full px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmLogout}
                   className="w-full px-4 py-2 bg-red-600 text-white border border-transparent rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                 >
                   Logout
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 sm:hidden">
            Welcome back, {user?.name}
          </p>
        </header>
        <main className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          {children}
        </main>
      </div>
    </div>
  );
};