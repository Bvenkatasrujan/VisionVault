import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VerifyEmail } from '../pages/VerifyEmail';

export const ProtectedRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-sm">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check provider & verification status
  const isGoogleUser = userProfile?.provider === 'google' || 
    (currentUser.providerData && currentUser.providerData[0]?.providerId === 'google.com');

  // If email/password user and email is NOT verified, present Verification Screen
  if (!isGoogleUser && !currentUser.emailVerified) {
    return <VerifyEmail />;
  }

  return children;
};
