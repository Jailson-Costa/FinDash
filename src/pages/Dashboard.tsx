import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Transacao } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useMetas } from '../lib/useMetas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Receipt, ArrowRight, Wallet, Home, Briefcase, TrendingUp, TrendingDown, Target, AlertCircle, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameMonth, isSameWeek, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const { metas } = useMetas();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<'all' | 'pessoal' | 'profissional'>('all');
  
  // Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(startOfMonth(new Date()));
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(endOfMonth(new Date()));

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

  const typeFilteredTransacoes = transacoes.filter(t => selectedTipo === 'all' || t.tipo === selectedTipo);

  const periodTransacoes = typeFilteredTransacoes.filter(t => {
    const tDate = parseISO(t.data);
    let matchDate = true;
    if (selectionStart && selectionEnd) {
      matchDate = tDate >= startOfDay(selectionStart) && tDate <= endOfDay(selectionEnd);
    } else if (selectionStart) {
      matchDate = isSameDay(tDate, selectionStart);
    }
    return matchDate;
  });

  const totalGanhos = periodTransacoes.filter(t => t.natureza === 'ganho').reduce((acc, curr) => acc + curr.valor, 0);
  const totalGastos = periodTransacoes.filter(t => t.natureza === 'gasto').reduce((acc, curr) => acc + curr.valor, 0);
  const saldo = totalGanhos - totalGastos;

  const saldoSemana = typeFilteredTransacoes
    .filter(t => {
      // Create a date object that represents the local date of the transaction
      const [year, month, day] = t.data.split('-').map(Number);
      const tDate = new Date(year, month - 1, day);
      return isSameWeek(tDate, new Date(), { weekStartsOn: 0 });
    })
    .reduce((acc, curr) => curr.natureza === 'ganho' ? acc + curr.valor : acc - curr.valor, 0);

  const gastosPorCategoria = periodTransacoes
    .filter(t => t.natureza === 'gasto')
    .reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
      return acc;
    }, {} as Record<string, number>);

  const pieDataGastos = Object.entries(gastosPorCategoria)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const ganhosPorCategoria = periodTransacoes
    .filter(t => t.natureza === 'ganho')
    .reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + curr.valor;
      return acc;
    }, {} as Record<string, number>);

  const pieDataGanhos = Object.entries(ganhosPorCategoria)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);

  const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currentMonthStr = format(selectionStart || new Date(), 'yyyy-MM');
  const currentMonthMetas = metas.filter(m => m.mes === currentMonthStr);

  const getGastoAtual = (meta: any) => {
    return typeFilteredTransacoes
      .filter(t => {
        const tDate = parseISO(t.data);
        const matchMonth = format(tDate, 'yyyy-MM') === meta.mes;
        const matchCategory = meta.categoria === 'total' || t.categoria === meta.categoria;
        return t.natureza === 'gasto' && matchMonth && matchCategory;
      })
      .reduce((acc, curr) => acc + curr.valor, 0);
  };

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    if (selectionStart && selectionEnd && isSameDay(selectionStart, selectionEnd) && isSameDay(day, selectionStart)) {
      setSelectionStart(null);
      setSelectionEnd(null);
    } else if (!selectionStart || (selectionStart && selectionEnd)) {
      setSelectionStart(day);
      setSelectionEnd(null);
    } else {
      if (isBefore(day, selectionStart)) {
        setSelectionEnd(selectionStart);
        setSelectionStart(day);
      } else {
        setSelectionEnd(day);
      }
    }
  };

  const formatDateRange = () => {
    if (selectionStart && selectionEnd && !isSameDay(selectionStart, selectionEnd)) {
      return `${format(selectionStart, 'dd/MM')} - ${format(selectionEnd, 'dd/MM')}`;
    } else if (selectionStart) {
      return format(selectionStart, 'dd/MM/yyyy');
    }
    return 'Todo o período';
  };

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
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Calendar Filter */}
          <div className="w-full sm:w-auto">
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors p-2 shadow-sm font-medium"
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              {formatDateRange()}
            </button>
          </div>

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
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                  <dt className="text-sm font-medium text-slate-500 truncate">Saldo do Período</dt>
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
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${saldoSemana >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <Wallet className={`h-6 w-6 ${saldoSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 truncate">Saldo da Semana</dt>
                  <dd className={`text-2xl font-bold mt-1 ${saldoSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    R$ {formatValue(saldoSemana)}
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

      {/* Metas Progress */}
      {currentMonthMetas.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <Target className="h-5 w-5 mr-2 text-indigo-500" />
              Metas do Mês
            </h3>
            <Link to="/metas" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition-colors">
              Gerenciar <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentMonthMetas.map(meta => {
              const gastoAtual = getGastoAtual(meta);
              const progresso = Math.min((gastoAtual / meta.valor) * 100, 100);
              const isOverLimit = gastoAtual > meta.valor;

              return (
                <div key={meta.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      {meta.categoria === 'total' ? 'Gasto Total' : meta.categoria}
                    </span>
                    <span className={`text-sm font-semibold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>
                      R$ {formatValue(gastoAtual)} / R$ {formatValue(meta.valor)}
                      {isOverLimit && <AlertCircle className="inline ml-1 h-4 w-4 text-rose-500" />}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${isOverLimit ? 'bg-rose-500' : progresso > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${progresso}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-right">
                    {Math.round(progresso)}% atingido
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

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

      {/* Calendar Modal */}
      <AnimatePresence>
        {isCalendarOpen && (
          <motion.div 
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCalendarOpen(false)}
          >
            <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
              </div>

              <motion.div 
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-10 inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full border border-slate-100 p-6"
              >
                <div className="flex justify-between items-center w-full mb-6">
                  <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest">
                    {format(currentMonth, 'MMM', { locale: ptBR }).replace('.', '')}.
                  </h3>
                  <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>

                <div className="w-full">
                  <div className="grid grid-cols-7 gap-y-4 text-center mb-2">
                    {WEEKDAYS.map((day, i) => (
                      <div key={`weekday-${i}`} className={`text-xs font-semibold ${i === 0 ? 'text-red-500' : 'text-slate-500'}`}>
                        {day}
                      </div>
                    ))}
                    {days.map(day => {
                      const isStart = selectionStart && isSameDay(day, selectionStart);
                      const isEnd = selectionEnd && isSameDay(day, selectionEnd);
                      const isSelected = isStart || isEnd || (selectionStart && !selectionEnd && isSameDay(day, selectionStart));
                      const isInRange = selectionStart && selectionEnd && isAfter(day, selectionStart) && isBefore(day, selectionEnd);
                      const isSunday = getDay(day) === 0;
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      
                      return (
                        <div key={day.toString()} className="flex justify-center items-center h-10 relative">
                          {isInRange && <div className="absolute inset-y-0 inset-x-0 bg-slate-100 -z-10" />}
                          {isStart && selectionEnd && !isSameDay(selectionStart, selectionEnd) && <div className="absolute inset-y-0 right-0 w-1/2 bg-slate-100 -z-10" />}
                          {isEnd && selectionStart && !isSameDay(selectionStart, selectionEnd) && <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-100 -z-10" />}
                          
                          <button
                            onClick={() => onDateClick(day)}
                            className={`w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-medium transition-all z-10
                              ${isSelected ? 'border-2 border-slate-800 text-slate-900 shadow-sm bg-white' : ''}
                              ${!isSelected && isSunday ? 'text-red-500' : ''}
                              ${!isSelected && !isSunday ? 'text-slate-700' : ''}
                              ${!isCurrentMonth ? 'opacity-30' : ''}
                              ${!isSelected ? 'hover:bg-slate-50' : ''}
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto"
                  >
                    Aplicar
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
