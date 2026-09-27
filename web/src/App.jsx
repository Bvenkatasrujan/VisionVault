import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { SplashScreen } from './components/SplashScreen';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Dashboard } from './pages/Dashboard';
import { FileManager } from './pages/FileManager';
import { Devices } from './pages/Devices';
import { Settings } from './pages/Settings';

function DashboardLayout({ isUploadOpen, setIsUploadOpen, searchQuery, setSearchQuery }) {
  return (
    <div className="min-h-screen bg-[#0a0f1d] flex flex-col">
      <Navbar 
        onOpenUpload={() => setIsUploadOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Vault Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout 
                  isUploadOpen={isUploadOpen} 
                  setIsUploadOpen={setIsUploadOpen}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={<Dashboard onOpenUpload={() => setIsUploadOpen(true)} />} 
            />
            <Route 
              path="/files" 
              element={
                <FileManager 
                  onOpenUpload={() => setIsUploadOpen(true)}
                  externalSearchQuery={searchQuery}
                />
              } 
            />
            <Route path="/devices" element={<Devices />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
