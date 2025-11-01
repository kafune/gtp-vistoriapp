-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Helper function to keep updated_at in sync
create or replace function public.fn_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Table that stores every IA/user generated description for a photo
create table if not exists public.foto_patologia_feedback (
  id uuid primary key default gen_random_uuid(),
  foto_id uuid,
  grupo_vistoria_id uuid,
  vistoria_id uuid,
  descricao text not null,
  origem text not null default 'ia' check (origem in ('ia', 'usuario')),
  modelo text,
  temperatura numeric,
  confianca numeric,
  tags text[],
  validada boolean not null default false,
  usuario_id uuid,
  parent_feedback_id uuid references public.foto_patologia_feedback(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_foto_patologia_feedback_foto on public.foto_patologia_feedback(foto_id);
create index if not exists idx_foto_patologia_feedback_grupo on public.foto_patologia_feedback(grupo_vistoria_id);
create index if not exists idx_foto_patologia_feedback_vistoria on public.foto_patologia_feedback(vistoria_id);
create index if not exists idx_foto_patologia_feedback_validada on public.foto_patologia_feedback(validada);

-- Trigger to keep updated_at fresh
drop trigger if exists trg_foto_patologia_feedback_updated on public.foto_patologia_feedback;
create trigger trg_foto_patologia_feedback_updated
before update on public.foto_patologia_feedback
for each row
execute procedure public.fn_set_updated_at();

-- Embeddings table that stores vectorized representations of validated descriptions
create table if not exists public.foto_patologia_embeddings (
  feedback_id uuid primary key references public.foto_patologia_feedback(id) on delete cascade,
  embedding vector(1536),
  contexto text,
  created_at timestamptz not null default now()
);

create index if not exists idx_foto_patologia_embeddings_ctx on public.foto_patologia_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Function to enable semantic search on validated descriptions
create or replace function public.match_patologia_feedback(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.0
)
returns table(
  feedback_id uuid,
  descricao text,
  similarity float,
  origem text,
  contexto text,
  vistoria_id uuid,
  grupo_vistoria_id uuid,
  tags text[]
)
language plpgsql
as $$
begin
  return query
  select
    f.id,
    f.descricao,
    1 - (e.embedding <=> query_embedding) as similarity,
    f.origem,
    coalesce(e.contexto, ''),
    f.vistoria_id,
    f.grupo_vistoria_id,
    f.tags
  from public.foto_patologia_embeddings e
  join public.foto_patologia_feedback f on f.id = e.feedback_id
  where f.validada is true
    and (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
  order by e.embedding <-> query_embedding
  limit match_count;
end;
$$;
