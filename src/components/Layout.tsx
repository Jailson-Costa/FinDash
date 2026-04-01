import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Receipt, LogOut, Bell, X, Menu, Download, Share, Target, Settings, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AppLock from './AppLock';
import { isBiometricsEnabled, registerBiometrics, disableBiometrics, isWebAuthnSupported, isInIframe } from '../lib/biometrics';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(isBiometricsEnabled());
  const [bioError, setBioError] = useState('');
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if it's iOS and not already installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }

    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleToggleBiometrics = async () => {
    setBioError('');
    if (biometricsEnabled) {
      disableBiometrics();
      setBiometricsEnabled(false);
    } else {
      try {
        await registerBiometrics(user?.email || 'Usuário');
        setBiometricsEnabled(true);
      } catch (err: any) {
        setBioError(err.message || 'Erro ao configurar biometria.');
      }
    }
  };

  if (!user) {
    return <Outlet />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Lançamentos', path: '/transacoes', icon: Receipt },
    { name: 'Metas', path: '/metas', icon: Target },
  ];

  const mockNotifications = [
    { id: 1, text: 'Gasto "Aluguel" vence em 2 dias.', date: 'Hoje' },
    { id: 2, text: 'Você atingiu 80% da sua meta de gastos pessoais.', date: 'Ontem' },
  ];

  return (
    <AppLock>
      <div className="min-h-screen bg-slate-50 flex font-sans">
        {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 border-r border-slate-800 flex flex-col text-slate-300
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">FinDash</h1>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold border border-slate-700 flex-shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">{user.email}</p>
              <p className="text-xs text-slate-500">Plano Grátis</p>
            </div>
          </div>
          
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center w-full px-3 py-2 mb-2 text-sm font-medium text-indigo-400 rounded-lg hover:bg-slate-800 hover:text-indigo-300 transition-colors"
            >
              <Download className="mr-3 h-5 w-5" />
              Baixar App
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center w-full px-3 py-2 mb-2 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Settings className="mr-3 h-5 w-5" />
            Configurações
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-400 rounded-lg hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* iOS Install Prompt Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4 pb-10 sm:p-0">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <button 
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Instalar FinDash</h3>
              <p className="text-slate-600 text-sm mb-6">
                Instale este aplicativo na sua tela de início para acesso rápido e fácil.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-700 space-y-3">
                <p className="flex items-center">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-3 font-semibold text-xs">1</span>
                  Toque em <Share className="h-4 w-4 mx-1 inline text-blue-500" /> Compartilhar
                </p>
                <p className="flex items-center">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mr-3 font-semibold text-xs">2</span>
                  Role para baixo e toque em <br/> <strong className="ml-1">"Adicionar à Tela de Início"</strong>
                </p>
              </div>
              <button 
                onClick={() => setShowIOSPrompt(false)}
                className="mt-6 w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Configurações</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4">
                      <Fingerprint className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Bloqueio por Biometria</h4>
                      <p className="text-xs text-slate-500">Exigir digital/Face ID ao abrir o app</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={biometricsEnabled} 
                      onChange={handleToggleBiometrics} 
                      disabled={!isWebAuthnSupported() || isInIframe()} 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {isInIframe() && (
                  <p className="text-xs text-amber-600 mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <strong>Atenção:</strong> A biometria não funciona dentro desta tela de visualização. Para testar este recurso, clique no ícone de <strong>Abrir em nova aba</strong> no canto superior direito.
                  </p>
                )}
                {!isWebAuthnSupported() && !isInIframe() && (
                  <p className="text-xs text-amber-600 mt-4 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    Seu dispositivo ou navegador não suporta biometria.
                  </p>
                )}
                {bioError && (
                  <p className="text-xs text-rose-600 mt-4 bg-rose-50 p-3 rounded-lg border border-rose-100">
                    {bioError}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 relative shadow-sm z-10">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="mr-4 lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 truncate">
              {navItems.find(item => item.path === location.pathname)?.name || 'FinDash'}
            </h2>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-semibold text-slate-800">Notificações</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map((notification) => (
                    <div key={notification.id} className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors cursor-pointer">
                      <p className="text-sm text-slate-700 leading-snug">{notification.text}</p>
                      <p className="text-xs text-slate-400 mt-1.5 font-medium">{notification.date}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <p className="text-xs text-slate-500 text-center">
                    Ver todas as notificações
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-40">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      </div>
    </AppLock>
  );
}
