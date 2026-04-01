import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Lock, LogOut } from 'lucide-react';
import { verifyBiometrics, isBiometricsEnabled, isInIframe } from '../lib/biometrics';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const LOCK_TIMEOUT = 60000; // 1 minute

export default function AppLock({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checkLock = useCallback(() => {
    if (!isBiometricsEnabled() || isInIframe()) return;
    
    const lastActive = localStorage.getItem('last_active_time');
    const now = Date.now();
    
    if (!lastActive || now - parseInt(lastActive, 10) > LOCK_TIMEOUT) {
      setIsLocked(true);
    } else {
      localStorage.setItem('last_active_time', now.toString());
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    if (isBiometricsEnabled() && !isInIframe()) {
      setIsLocked(true);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('last_active_time', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        checkLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkLock]);

  const handleUnlock = async () => {
    try {
      setError('');
      await verifyBiometrics();
      setIsLocked(false);
      localStorage.setItem('last_active_time', Date.now().toString());
    } catch (err: any) {
      setError('Não foi possível verificar a biometria. Tente novamente.');
    }
  };

  // Auto-prompt on lock
  useEffect(() => {
    if (isLocked) {
      handleUnlock();
    }
  }, [isLocked]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <>
      {children}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-700">
            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-10 w-10 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">App Bloqueado</h2>
            <p className="text-slate-400 mb-8">
              Use sua biometria para acessar o FinDash.
            </p>

            {error && (
              <p className="text-rose-400 text-sm mb-6 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            <button
              onClick={handleUnlock}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center transition-colors mb-4"
            >
              <Fingerprint className="mr-2 h-5 w-5" />
              Desbloquear
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-colors"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </>
  );
}
