import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Categoria = {
  id: string;
  nome: string;
  natureza: 'ganho' | 'gasto';
  usuario_id: string;
  created_at?: string;
};

export type Transacao = {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  tipo: 'pessoal' | 'profissional';
  natureza: 'ganho' | 'gasto';
  nota: string;
  usuario_id: string;
  created_at?: string;
};
