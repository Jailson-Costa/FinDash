import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Transacao } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Receipt, ArrowRight, Wallet, Home, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user } = useAuth();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<'all' | 'pessoal' | 'profissional'>('all');

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
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const transacoesSubscription = supabase
      .channel('transacoes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes', filter: `usuario_id=eq.${user.id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(transacoesSubscription);
    };
  }, [user]);

  const filteredTransacoes = transacoes.filter(t => selectedTipo === 'all' || t.tipo === selectedTipo);

  const totalGanhos = filteredTransacoes.filter(t => t.natureza === 'ganho').reduce((acc, curr) => acc + curr.valor, 0);
  const totalGastos = filteredTransacoes.filter(t => t.natureza === 'gasto').reduce((acc, curr) => acc + curr.valor, 0);
  const saldo = totalGanhos - totalGastos;

  const gastosPorCategoria = filteredTransacoes
    .filter(t => t.natureza === 'gasto')
    .reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
      return acc;
    }, {} as Record<string, number>);

  const pieDataGastos = Object.entries(gastosPorCategoria)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const ganhosPorCategoria = filteredTransacoes
    .filter(t => t.natureza === 'ganho')
    .reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
      return acc;
    }, {} as Record<string, number>);

  const pieDataGanhos = Object.entries(ganhosPorCategoria)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const COLORS = [
    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', 
    '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', 
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-full">Carregando dashboard...</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
        
        {/* Tipo Filter */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setSelectedTipo('all')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedTipo === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedTipo('pessoal')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedTipo === 'pessoal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pessoal
          </button>
          <button
            onClick={() => setSelectedTipo('profissional')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedTipo === 'profissional' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Profissional
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${saldo >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <Wallet className={`h-6 w-6 ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Saldo Atual</dt>
                  <dd className={`text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    R$ {formatValue(saldo)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-indigo-50">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Total de Ganhos</dt>
                  <dd className="text-2xl font-bold mt-1 text-slate-800">R$ {formatValue(totalGanhos)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-rose-50">
                <TrendingDown className="h-6 w-6 text-rose-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Total de Gastos</dt>
                  <dd className="text-2xl font-bold mt-1 text-slate-800">R$ {formatValue(totalGastos)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Gastos */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Gastos por Categoria</h3>
          <div className="h-72 min-h-[288px] min-w-0">
            {totalGastos > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pieDataGastos}
                  layout="vertical"
                  margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${formatValue(Number(value))}`, 'Valor']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {pieDataGastos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(value: any) => `R$ ${formatValue(Number(value))}`} style={{ fill: '#64748b', fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Nenhum gasto registrado.
              </div>
            )}
          </div>
        </motion.div>

        {/* Chart Ganhos */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Ganhos por Categoria</h3>
          <div className="h-72 min-h-[288px] min-w-0">
            {totalGanhos > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pieDataGanhos}
                  layout="vertical"
                  margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${formatValue(Number(value))}`, 'Valor']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {pieDataGanhos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(value: any) => `R$ ${formatValue(Number(value))}`} style={{ fill: '#64748b', fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Nenhum ganho registrado.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col"
      >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Últimos Lançamentos</h3>
            <Link to="/transacoes" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors">
              Ver todos <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="flow-root flex-1">
            <ul className="-my-5 divide-y divide-slate-100">
              {transacoes.slice(0, 5).map((t) => (
                <li key={t.id} className="py-4 hover:bg-slate-50 transition-colors rounded-lg px-2 -mx-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {t.natureza === 'ganho' ? (
                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                          <TrendingDown className="h-5 w-5 text-rose-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {t.descricao}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {new Date(t.data).toLocaleDateString('pt-BR')} • {t.categoria}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.natureza === 'ganho' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {t.natureza === 'ganho' ? '+' : '-'} R$ {formatValue(t.valor)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {transacoes.length === 0 && (
                <li className="py-8 text-sm text-slate-400 text-center">
                  Nenhum lançamento recente.
                </li>
              )}
            </ul>
          </div>
        </motion.div>
    </motion.div>
  );
}
