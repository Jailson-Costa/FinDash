import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase, Categoria, Transacao } from '../lib/supabase';
import { useMetas, Meta } from '../lib/useMetas';
import { Plus, Trash2, Edit2, Target, AlertCircle } from 'lucide-react';
import { format, parseISO, isSameMonth } from 'date-fns';
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

const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Metas() {
  const { user } = useAuth();
  const { metas, addMeta, updateMeta, deleteMeta } = useMetas();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [categoria, setCategoria] = useState('total');
  const [valor, setValor] = useState('');
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [categoriasResponse, transacoesResponse] = await Promise.all([
          supabase
            .from('categorias')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('natureza', 'gasto')
            .order('nome', { ascending: true }),
          supabase
            .from('transacoes')
            .select('*')
            .eq('usuario_id', user.id)
            .eq('natureza', 'gasto')
        ]);

        if (categoriasResponse.error) throw categoriasResponse.error;
        if (transacoesResponse.error) throw transacoesResponse.error;

        setCategorias(categoriasResponse.data || []);
        setTransacoes(transacoesResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!user) return;

    const valorNum = parseCurrency(valor);
    if (valorNum <= 0) {
      setErrorMsg('O valor da meta deve ser maior que zero.');
      return;
    }

    if (editingId) {
      updateMeta(editingId, { categoria, valor: valorNum, mes });
    } else {
      // Check if goal already exists for this category and month
      const exists = metas.find(m => m.categoria === categoria && m.mes === mes);
      if (exists) {
        setErrorMsg('Já existe uma meta para esta categoria neste mês.');
        return;
      }
      addMeta({ categoria, valor: valorNum, mes });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setCategoria('total');
    setValor('');
    setMes(format(new Date(), 'yyyy-MM'));
    setErrorMsg(null);
  };

  const handleEditClick = (meta: Meta) => {
    setEditingId(meta.id);
    setCategoria(meta.categoria);
    setValor(formatCurrency(meta.valor.toFixed(2)));
    setMes(meta.mes);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMeta(itemToDelete);
      setItemToDelete(null);
    }
  };

  const getGastoAtual = (meta: Meta) => {
    const [ano, mesNum] = meta.mes.split('-');
    const dataMeta = new Date(parseInt(ano), parseInt(mesNum) - 1);
    
    return transacoes
      .filter(t => {
        const tDate = parseISO(t.data);
        const matchMonth = isSameMonth(tDate, dataMeta);
        const matchCategory = meta.categoria === 'total' || t.categoria === meta.categoria;
        return matchMonth && matchCategory;
      })
      .reduce((acc, curr) => acc + curr.valor, 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">Carregando metas...</div>;
  }

  // Sort metas by month (descending) and then by category
  const sortedMetas = [...metas].sort((a, b) => {
    if (a.mes !== b.mes) return b.mes.localeCompare(a.mes);
    if (a.categoria === 'total') return -1;
    if (b.categoria === 'total') return 1;
    return a.categoria.localeCompare(b.categoria);
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Metas de Gastos</h2>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200">
          <p className="text-slate-600">
            Defina limites de gastos mensais para categorias específicas ou para o total de gastos. Acompanhe seu progresso para manter sua saúde financeira.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mês</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Gasto Atual</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              <AnimatePresence>
                {sortedMetas.map((meta) => {
                  const gastoAtual = getGastoAtual(meta);
                  const progresso = Math.min((gastoAtual / meta.valor) * 100, 100);
                  const isOverLimit = gastoAtual > meta.valor;
                  const [ano, mesNum] = meta.mes.split('-');
                  const mesFormatado = format(new Date(parseInt(ano), parseInt(mesNum) - 1), 'MMM yyyy', { locale: ptBR });

                  return (
                    <motion.tr 
                      key={meta.id} 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                        {mesFormatado}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${meta.categoria === 'total' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {meta.categoria === 'total' ? 'Gasto Total' : meta.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                        R$ {formatValue(meta.valor)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>
                        R$ {formatValue(gastoAtual)}
                        {isOverLimit && <AlertCircle className="inline ml-1.5 h-4 w-4 text-rose-500" />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-48">
                        <div className="flex items-center">
                          <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2">
                            <div 
                              className={`h-2.5 rounded-full ${isOverLimit ? 'bg-rose-500' : progresso > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${progresso}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-medium ${isOverLimit ? 'text-rose-600' : 'text-slate-600'}`}>
                            {Math.round(progresso)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditClick(meta)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(meta.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {metas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center opacity-60">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Target className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-700 text-base">Nenhuma meta definida.</p>
                      <p className="text-slate-500 mt-1">Clique no botão + para criar sua primeira meta.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

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
                    {editingId ? 'Editar Meta' : 'Nova Meta'}
                  </h3>
                  
                  {errorMsg && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mês</label>
                      <input
                        type="month"
                        required
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                        className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                      <select
                        required
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="mt-1 block w-full border border-slate-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50"
                      >
                        <option value="total">Gasto Total (Todas as categorias)</option>
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valor Limite (R$)</label>
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
                        Salvar Meta
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <motion.div 
            key="delete-modal"
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setItemToDelete(null)}
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
                className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full border border-slate-100"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-slate-900">
                        Excluir Meta
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-slate-500">
                          Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(null)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    Cancelar
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
