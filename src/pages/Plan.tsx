import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Plus, Target, MoreVertical, AlertCircle } from 'lucide-react';

interface Meta {
  id: string;
  usuario_id: string;
  titulo: string;
  valor_alvo: number;
  valor_atual: number;
  data_limite: string | null;
  categoria: string;
}

export default function Plan() {
  const { user } = useAuth();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: metasData, error: metasError } = await supabase
          .from('metas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false });

        if (metasError) throw metasError;
        setMetas(metasData || []);
      } catch (error) {
        console.error('Error fetching plan data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-screen">Carregando...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-slate-50 min-h-screen pb-24 px-6 pt-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Meu Plano</h2>
        <button className="h-10 w-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-800 transition-colors">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Main Goal Highlight */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Metas Principais</h3>
          <span className="text-sm font-medium text-indigo-600 cursor-pointer">Ver Todas</span>
        </div>

        {metas.length > 0 ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center mr-3">
                  <Target className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{metas[0].titulo}</h4>
                  <p className="text-xs text-slate-500">Ver Detalhes</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <h2 className="text-3xl font-bold text-slate-800 mb-1">
                R$ {formatValue(metas[0].valor_atual)}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                de R$ {formatValue(metas[0].valor_alvo)}
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
              <div 
                className="h-2.5 rounded-full bg-rose-500" 
                style={{ width: `${Math.min((metas[0].valor_atual / metas[0].valor_alvo) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-4">
              <span>Seu Progresso</span>
              <span className="text-slate-800 font-bold">
                R$ {formatValue(metas[0].valor_alvo - metas[0].valor_atual)} Restantes
              </span>
            </div>

            <div className="bg-orange-50 text-orange-700 p-3 rounded-xl flex items-start text-xs font-medium">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              Você está 30% atrasado no cronograma.
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-slate-800 mb-2">Nenhuma meta definida</h4>
            <p className="text-sm text-slate-500 mb-6">Crie sua primeira meta financeira para começar a poupar.</p>
            <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-medium text-sm hover:bg-indigo-700 transition-colors">
              Criar Meta
            </button>
          </div>
        )}
      </div>

      {/* Budgets / Other Goals */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Orçamentos</h3>
          <span className="text-sm font-medium text-indigo-600 cursor-pointer">Ver Todos</span>
        </div>

        <div className="space-y-4">
          {metas.slice(1).map((meta, index) => {
            const percentage = Math.min((meta.valor_atual / meta.valor_alvo) * 100, 100);
            const colors = ['bg-indigo-50 text-indigo-600', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-600'];
            const colorClass = colors[index % colors.length];

            return (
              <div key={meta.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${colorClass}`}>
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{meta.titulo}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      <span className="text-slate-800 font-bold">R$ {formatValue(meta.valor_atual)}</span> de R$ {formatValue(meta.valor_alvo)}
                    </p>
                  </div>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
                  {percentage.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
