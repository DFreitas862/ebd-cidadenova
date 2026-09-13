# 📖 EBD Manager (Gerenciador da Escola Bíblica Dominical)

Sistema web frontend modernizado para a gestão completa da Escola Bíblica Dominical (EBD). Desenvolvido para facilitar o cadastro de classes, controle de alunos, registro de frequência (chamada), controle de ofertas, visitantes e acompanhamento de métricas mensais de desempenho.

---

## 🚀 Tecnologias Utilizadas

- **HTML5**, **CSS3** e **JavaScript (Vanilla)** estruturado em Single Page Application (SPA).
- **Supabase** (Banco de dados PostgreSQL e SDK v2) para persistência em nuvem em tempo real.
- **Netlify** para hospedagem e deploy contínuo.

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

O sistema utiliza quatro tabelas relacionais principais. Você pode executar o script SQL abaixo no **SQL Editor** do seu painel do Supabase para configurar o banco:

```sql
-- Tabela de Classes
create table classes (
  id text primary key,
  nome text not null,
  dia text not null,
  horario text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Alunos (vinculada à classe)
create table alunos (
  id text primary key,
  classe_id text references classes(id) on delete cascade,
  nome text not null,
  telefone text,
  data_nascimento date,
  eh_professor boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Aulas
create table aulas (
  id text primary key,
  classe_id text references classes(id) on delete cascade,
  data date not null,
  tema text not null,
  professor_id text references alunos(id),
  visitantes int default 0,
  oferta numeric(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Presenças (Chamada)
create table presencas (
  id text primary key,
  aula_id text references aulas(id) on delete cascade,
  aluno_id text references alunos(id) on delete cascade,
  status text not null
);
