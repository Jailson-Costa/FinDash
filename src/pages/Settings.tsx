import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Bell, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-slate-50 min-h-screen pb-24 px-6 pt-8"
    >
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Configurações</h2>

      {/* Profile Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl mr-4 border-2 border-white shadow-sm">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{user?.email?.split('@')[0]}</h3>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Premium Banner */}
      <div className="bg-gradient-to-r from-amber-200 to-yellow-400 rounded-3xl p-6 shadow-md mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center mb-1">
              <Crown className="h-5 w-5 text-amber-800 mr-2" />
              <h3 className="font-bold text-amber-900 text-lg">FinDash Pro</h3>
            </div>
            <p className="text-sm text-amber-800 font-medium">Desbloqueie insights com IA e relatórios avançados.</p>
          </div>
          <button className="bg-amber-900 text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-amber-800 transition-colors whitespace-nowrap ml-4">
            Assinar
          </button>
        </div>
      </div>

      {/* Settings Options */}
      <div className="space-y-6">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Conta</h4>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mr-4 text-slate-600">
                  <User className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-700">Informações Pessoais</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mr-4 text-slate-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-700">Contas e Cartões</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mr-4 text-slate-600">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-700">Segurança</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Preferências</h4>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mr-4 text-slate-600">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-700">Notificações</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mr-4 text-slate-600">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <span className="font-medium text-slate-700">Ajuda e Suporte</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex items-center justify-center text-rose-600 font-bold hover:bg-rose-50 transition-colors mt-8"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sair da Conta
        </button>
      </div>
    </motion.div>
  );
}
