# 💋 Kisser

Uma rede social interativa para mapear e visualizar conexões românticas entre pessoas. O Kisser permite que usuários documentem relacionamentos de forma colaborativa, criando uma rede visual dinâmica de conexões.

## Funcionalidades

### Principais Features
- **Rede Visual Interativa**: Visualização em grafo das conexões entre pessoas usando Cytoscape.js
- **Sistema de Autenticação**: Login/cadastro seguro via Supabase Auth
- **Moderação de Conteúdo**: Sistema de aprovação para todas as conexões adicionadas
- **Busca Inteligente**: Pesquise pessoas e filtre suas conexões específicas
- **Perfis com Instagram**: Integração com perfis do Instagram
- **Interface Responsiva**: Design adaptável para desktop e mobile

### Sistema de Usuários
- **Usuários Comuns**: Podem adicionar conexões e visualizar a rede
- **Administradores**: Painel admin para aprovar/rejeitar conexões
- **Sistema de Perfis**: Gerenciamento de dados pessoais

### Visualização da Rede
- **Grafo Interativo**: Clique em qualquer pessoa para destacar suas conexões
- **Busca por Pessoa**: Digite um nome para ver apenas as conexões dessa pessoa
- **Nodes Proporcionais**: Tamanho dos nós baseado no número de conexões
- **Cores Dinâmicas**: Sistema de cores para destacar conexões selecionadas

## Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Tailwind CSS** para estilização
- **Lucide React** para ícones
- **Cytoscape.js** para visualização de grafos
- **shadcn/ui** para componentes

### Backend & Database
- **Supabase** para autenticação e banco de dados
- **PostgreSQL** como banco de dados

### Principais Dependências
```json
{
  "cytoscape": "^3.x",
  "@supabase/supabase-js": "^2.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x"
}
```

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/kisser.git
cd kisser
```

### 2. Instale as Dependências
```bash
npm install
# ou
yarn install
```

### 3. Configuração do Supabase

#### 3.1 Crie um Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e a chave anônima do projeto

#### 3.2 Configure as Variáveis de Ambiente
Crie um arquivo `.env.local`:
```env
SUPABASE_URL=URL_DB
SUPABASE_PUBLISHABLE_KEY=PUBLIC_KEY_DB

```

#### 3.3 Estrutura do Banco de Dados
Execute os seguintes comandos SQL no editor do Supabase:

```sql
-- Tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  type TEXT DEFAULT 'user' CHECK (type IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de nomes/pessoas
CREATE TABLE names (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  instagram TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de conexões
CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  name1 TEXT NOT NULL,
  name2 TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_by TEXT,
  created_at TEXT,
  UNIQUE(name1, name2),
  UNIQUE(name2, name1)
);

-- Políticas RLS para acesso público às conexões aprovadas
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE names ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública de conexões aprovadas
CREATE POLICY "Conexões aprovadas são públicas" ON connections
  FOR SELECT USING (status = 'accepted');

-- Permite leitura pública de nomes
CREATE POLICY "Nomes são públicos" ON names
  FOR SELECT USING (true);

-- Permite inserção para usuários autenticados
CREATE POLICY "Usuários podem adicionar conexões" ON connections
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem adicionar nomes" ON names
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 4. Execute o Projeto
```bash
npm run dev
# ou
yarn dev
```

O projeto estará disponível em `http://localhost:PORT`

## Estrutura do Projeto

```
src/
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   ├── Auth.tsx           # Sistema de autenticação
│   ├── AddConnection.tsx  # Formulário para adicionar conexões
│   ├── NetworkGraph.tsx   # Componente do grafo de rede
│   └── Profile.tsx        # Perfil do usuário
├── integrations/
│   └── supabase/
│       └── client.ts      # Cliente Supabase
├── hooks/
│   └── use-toast.ts       # Hook para notificações
└── pages/
    └── Index.tsx          # Página principal
```

## Como Usar

### Para Usuários Comuns

1. **Cadastro/Login**: Crie uma conta ou faça login
2. **Adicionar Conexão**: 
   - Clique em "Adicionar"
   - Preencha os nomes e Instagrams das duas pessoas
   - Aguarde aprovação do admin
3. **Explorar a Rede**:
   - Clique em qualquer pessoa para ver suas conexões
   - Use a busca para filtrar por pessoa específica

### Para Administradores

1. **Acesso ao Painel**: Clique em "Painel Admin" (disponível para usuários admin)
2. **Gerenciar Conexões**: Aprove ou rejeite conexões pendentes
3. **Monitoramento**: Monitore o conteúdo adicionado pelos usuários

## Configurações Avançadas

### Tornando-se Administrador
Para tornar um usuário administrador, execute no SQL do Supabase:
```sql
UPDATE users SET type = 'admin' WHERE email = 'email@exemplo.com';
```

### Customização Visual
As cores e estilos podem ser personalizados em:
- `tailwind.config.js` para cores do tema
- `NetworkGraph.tsx` para estilos do grafo

### Configuração de Produção
Para deploy em produção:
1. Configure as variáveis de ambiente no seu provedor
2. Ajuste as políticas RLS conforme necessário
3. Configure domínio personalizado no Supabase

## Resolução de Problemas

### Problemas Comuns

**Erro: "Row Level Security"**
- Verifique se as políticas RLS estão configuradas corretamente
- Confirme se o usuário tem as permissões necessárias

**Grafo não carrega**
- Verifique se há conexões aprovadas no banco
- Confirme se a conexão com Supabase está funcionando

**Login não funciona**
- Verifique as variáveis de ambiente
- Confirme a configuração de autenticação no Supabase