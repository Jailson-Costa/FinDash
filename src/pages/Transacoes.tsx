import React, { useState, useEffect } from 'react';
import { supabase, Transacao, Categoria } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Edit2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, getDay, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const formatCurrency = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (!v) return '';
  const num = (parseInt(v, 10) / 100).toFixed(2);
  return num.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

const parseCurrency = (value: string) => {
  if (!value) return 0;
  return parseFloat(value.replace(/\./g, '').replace(',', '.'));
};

export default function Transacoes() {
  const { user } = useAuth();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tipo, setTipo] = useState<'pessoal' | 'profissional'>('pessoal');
  const [natureza, setNatureza] = useState<'ganho' | 'gasto'>('gasto');
  const [nota, setNota] = useState('');

  // Filters
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<Date | null>(new Date());
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<'all' | 'pessoal' | 'profissional'>('all');

  const fetchData = async () => {
    if (!user) return;
    try {
      const [transacoesResponse, categoriasResponse] = await Promise.all([
        supabase
          .from('transacoes')
          .select('*')
          .eq('usuario_id', user.id)
          .order('data', { ascending: false }),
        supabase
          .from('categorias')
          .select('*')
          .eq('usuario_id', user.id)
          .order('nome', { ascending: true })
      ]);

      if (transacoesResponse.error) throw transacoesResponse.error;
      if (categoriasResponse.error) throw categoriasResponse.error;

      setTransacoes(transacoesResponse.data || []);
      setCategorias(categoriasResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const transacoesSub = supabase
      .channel('transacoes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes', filter: `usuario_id=eq.${user?.id}` }, fetchData)
      .subscribe();

    const categoriasSub = supabase
      .channel('categorias_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias', filter: `usuario_id=eq.${user?.id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(transacoesSub);
      supabase.removeChannel(categoriasSub);
    };
  }, [user]);

  // Reset category when changing nature
  useEffect(() => {
    setCategoria('');
    setIsAddingCategoria(false);
    setNovaCategoria('');
  }, [natureza]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let categoriaFinal = categoria;

      // If adding a new category, save it first
      if (isAddingCategoria && novaCategoria.trim()) {
        const nomeCategoria = novaCategoria.trim();
        
        // Verifica se a categoria já existe para evitar duplicatas
        const categoriaExistente = categoriasFiltradas.find(
          (c) => c.nome.toLowerCase() === nomeCategoria.toLowerCase()
        );

        if (categoriaExistente) {
          categoriaFinal = categoriaExistente.nome;
        } else {
          // Salva a nova categoria no banco de dados para sempre
          const { data: catData, error: catError } = await supabase
            .from('categorias')
            .insert([
              {
                nome: nomeCategoria,
                natureza,
                usuario_id: user.id
              }
            ])
            .select()
            .single();

          if (catError) throw catError;
          categoriaFinal = catData.nome;
        }
      }

      if (!categoriaFinal) {
        alert('Por favor, selecione ou crie uma categoria.');
        return;
      }

      const payload = {
        descricao,
        categoria: categoriaFinal,
        valor: parseCurrency(valor),
        data,
        tipo,
        natureza,
        nota,
        usuario_id: user.id,
      };

      if (editingId) {
        const { error } = await supabase.from('transacoes').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transacoes').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding transacao:', error);
      alert('Erro ao adicionar transação.');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDescricao('');
    setCategoria('');
    setNovaCategoria('');
    setIsAddingCategoria(false);
    setValor('');
    setData(format(new Date(), 'yyyy-MM-dd'));
    setTipo('pessoal');
    setNatureza('gasto');
    setNota('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      const { error } = await supabase.from('transacoes').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting transacao:', error);
      alert('Erro ao excluir lançamento.');
    }
  };

  const handleEditClick = (t: Transacao) => {
    setEditingId(t.id);
    setDescricao(t.descricao);
    setCategoria(t.categoria);
    setValor(formatCurrency(t.valor.toFixed(2)));
    setData(t.data);
    setTipo(t.tipo);
    setNatureza(t.natureza);
    setNota(t.nota || '');
    setIsAddingCategoria(false);
    setNovaCategoria('');
    setIsModalOpen(true);
  };

  const categoriasFiltradas = categorias.filter(c => c.natureza === natureza);

  const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredTransacoes = transacoes.filter(t => {
    const tDate = parseISO(t.data);
    const matchMonth = isSameMonth(tDate, currentMonth);
    
    let matchDate = true;
    if (selectionStart && selectionEnd) {
      matchDate = tDate >= startOfDay(selectionStart) && tDate <= endOfDay(selectionEnd);
    } else if (selectionStart) {
      matchDate = isSameDay(tDate, selectionStart);
    }
    
    const matchCategory = selectedCategory === 'all' || t.categoria === selectedCategory;
    const matchTipo = selectedTipo === 'all' || t.tipo === selectedTipo;
    return matchMonth && matchDate && matchCategory && matchTipo;
  });

  const categoriasNoMes = Array.from(
    new Set(transacoes.filter(t => isSameMonth(parseISO(t.data), currentMonth)).map(t => t.categoria))
  ).sort();

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const onDateClick = (day: Date) => {
    if (selectionStart && selectionEnd && isSameDay(selectionStart, selectionEnd) && isSameDay(day, selectionStart)) {
      // Toggle off if clicking the single selected day
      setSelectionStart(null);
      setSelectionEnd(null);
    } else if (!selectionStart || (selectionStart && selectionEnd)) {
      // Start new range
      setSelectionStart(day);
      setSelectionEnd(null);
    } else {
      // Complete range
      if (isBefore(day, selectionStart)) {
        setSelectionEnd(selectionStart);
        setSelectionStart(day);
      } else {
        setSelectionEnd(day);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Lançamentos</h2>
      </div>

      {/* Calendar Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
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

        {/* Calendar Grid */}
        <div className="w-full max-w-md">
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
      </div>

      {/* Selected Date Header & Filters */}
      <div className="flex flex-col gap-4 mt-8 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {selectionStart && selectionEnd && !isSameDay(selectionStart, selectionEnd) ? (
            <h4 className="text-2xl font-bold text-slate-800 flex items-baseline">
              {format(selectionStart, 'd')} a {format(selectionEnd, 'd')}
              <span className="text-sm font-semibold text-slate-500 ml-2 uppercase tracking-wider">
                {format(selectionStart, 'MMM', { locale: ptBR }).replace('.', '')}
              </span>
            </h4>
          ) : selectionStart ? (
            <h4 className="text-2xl font-bold text-slate-800 flex items-baseline">
              {format(selectionStart, 'd')}
              <span className="text-sm font-semibold text-slate-500 ml-2 uppercase tracking-wider">
                {format(selectionStart, 'EEE', { locale: ptBR }).replace('.', '')}.
              </span>
            </h4>
          ) : (
            <h4 className="text-xl font-bold text-slate-800">Todo o mês</h4>
          )}

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
        
        {/* Categories Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full pb-2 sm:pb-0 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedCategory === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Todas Categorias
          </button>
          {categoriasNoMes.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedCategory === cat ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-slate-500">Carregando...</div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                <AnimatePresence>
                  {filteredTransacoes.map((t) => (
                    <motion.tr 
                      key={t.id} 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {format(new Date(t.data), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      <div className="flex items-center">
                        {t.natureza === 'ganho' ? (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-500 mr-2.5 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-rose-500 mr-2.5 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{t.descricao}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {t.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${t.tipo === 'pessoal' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        {t.tipo === 'pessoal' ? 'Pessoal' : 'Profissional'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${t.natureza === 'ganho' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.natureza === 'ganho' ? '+' : '-'} R$ {formatValue(t.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditClick(t)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
                {filteredTransacoes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center opacity-60">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                          <span className="text-3xl">😕</span>
                        </div>
                        <p className="font-medium text-slate-700 text-base">Toque para adicionar um lançamento a este dia.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => {
          resetForm();
          setIsModalOpen(true);
        }}
        className="fixed bottom-8 right-8 bg-white text-slate-800 p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all z-40 border border-slate-100 flex items-center justify-center"
      >
        <Plus className="h-8 w-8" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            key="modal-wrapper"
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div 
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-slate-100"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-xl font-semibold leading-6 text-slate-800 mb-6">
                  {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  <div className="flex space-x-6 mb-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300"
                        checked={natureza === 'gasto'}
                        onChange={() => setNatureza('gasto')}
                      />
                      <span className="ml-2 text-sm font-medium text-slate-700">Gasto</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        checked={natureza === 'ganho'}
                        onChange={() => setNatureza('ganho')}
                      />
                      <span className="ml-2 text-sm font-medium text-slate-700">Ganho</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                    <input
                      type="text"
                      required
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: Salário, Aluguel, Internet..."
                      className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={valor}
                        onChange={(e) => setValor(formatCurrency(e.target.value))}
                        placeholder="0,00"
                        className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                      <input
                        type="date"
                        required
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                      <select
                        required={!isAddingCategoria}
                        value={isAddingCategoria ? 'NEW' : categoria}
                        onChange={(e) => {
                          if (e.target.value === 'NEW') {
                            setIsAddingCategoria(true);
                            setCategoria('');
                          } else {
                            setIsAddingCategoria(false);
                            setCategoria(e.target.value);
                          }
                        }}
                        className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                      >
                        <option value="" disabled>Selecione...</option>
                        {categoriasFiltradas.map((cat) => (
                          <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                        ))}
                        <option value="NEW" className="font-semibold text-indigo-600">+ Nova categoria</option>
                      </select>
                      
                      {isAddingCategoria && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                          className="flex rounded-lg shadow-sm overflow-hidden"
                        >
                          <input
                            type="text"
                            required
                            value={novaCategoria}
                            onChange={(e) => setNovaCategoria(e.target.value)}
                            placeholder="Nome da nova categoria..."
                            className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none rounded-l-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCategoria(false);
                              setNovaCategoria('');
                              setCategoria('');
                            }}
                            className="inline-flex items-center px-3 py-2.5 border border-l-0 border-slate-300 rounded-r-lg bg-white text-slate-500 text-sm hover:bg-slate-50 font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as 'pessoal' | 'profissional')}
                        className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                      >
                        <option value="pessoal">Pessoal</option>
                        <option value="profissional">Profissional</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      Salvar Lançamento
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
