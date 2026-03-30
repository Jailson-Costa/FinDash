-- Create Usuarios (Profiles) table
CREATE TABLE usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security for usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Create Policies for usuarios
CREATE POLICY "Users can view their own profile" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON usuarios FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create Categorias table
CREATE TABLE categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  natureza TEXT NOT NULL CHECK (natureza IN ('ganho', 'gasto')),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Transacoes table
CREATE TABLE transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pessoal', 'profissional')),
  natureza TEXT NOT NULL CHECK (natureza IN ('ganho', 'gasto')),
  nota TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own categorias" ON categorias FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users can insert their own categorias" ON categorias FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users can update their own categorias" ON categorias FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Users can delete their own categorias" ON categorias FOR DELETE USING (auth.uid() = usuario_id);

CREATE POLICY "Users can view their own transacoes" ON transacoes FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users can insert their own transacoes" ON transacoes FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users can update their own transacoes" ON transacoes FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Users can delete their own transacoes" ON transacoes FOR DELETE USING (auth.uid() = usuario_id);

-- Enable Realtime
alter publication supabase_realtime add table categorias;
alter publication supabase_realtime add table transacoes;
