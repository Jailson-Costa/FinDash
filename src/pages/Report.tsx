import React, { useEffect, useState } from 'react';
import { supabase, Transacao } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';

export default function Report() {
  const { user } = useAuth();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: transacoesData, error: transacoesError } = await supabase
          .from('transacoes')
          .select('*')
          .eq('usuario_id', user.id)
          .order('data', { ascending: false });

        if (transacoesError) throw transacoesError;
        setTransacoes(transacoesData || []);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredTransacoes = transacoes.filter(t => t.natureza === (activeTab === 'expenses' ? 'gasto' : 'ganho'));
  const total = filteredTransacoes.reduce((acc, curr) => acc + curr.valor, 0);

  const porCategoria = filteredTransacoes.reduce((acc, curr) => {
    acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(porCategoria)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const COLORS = ['#8b5cf6', '#f97316', '#0ea5e9', '#10b981', '#f43f5e', '#eab308'];

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
        <h2 className="text-2xl font-bold text-slate-800">Relatório</h2>
        <div className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100 cursor-pointer">
          <span className="text-sm font-medium text-slate-600 mr-1">Nov 2025</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-200/50 p-1 rounded-full flex mb-8">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${
            activeTab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Despesas
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${
            activeTab === 'income' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Receitas
        </button>
      </div>

      {/* Chart Area */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">
            {activeTab === 'expenses' ? 'Relatório de Despesas' : 'Relatório de Receitas'}
          </h3>
        </div>

        <div className="h-64 relative flex items-center justify-center">
          {total > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={8}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `R$ ${formatValue(Number(value))}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-500 font-medium mb-1">Total</span>
                <span className="text-xl font-bold text-slate-800">R$ {formatValue(total)}</span>
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-sm">Sem dados para este período.</div>
          )}
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-800">Todas as Categorias</h3>
          <span className="text-sm font-medium text-slate-500">R$ {formatValue(total)}</span>
        </div>

        {pieData.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={item.name} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500">{percentage}% do total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">R$ {formatValue(item.value)}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full" 
                  style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
