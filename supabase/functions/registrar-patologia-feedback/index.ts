import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegistrarRequest {
  fotoId: string;
  grupoVistoriaId?: string;
  vistoriaId?: string;
  usuarioId?: string;
  descricao: string;
  origem?: "ia" | "usuario";
  feedbackId?: string;
  foiEditado?: boolean;
  resumo?: {
    patologias?: string[];
    gravidade?: string;
    recomendacoes?: string;
    confianca?: number;
  };
  ambiente?: string;
  grupo?: string;
  item?: string;
  status?: string;
  condominioId?: string;
  condominioNome?: string;
}

const OPENAI_API_URL = "https://api.openai.com/v1";
const EMBEDDING_MODEL = "text-embedding-3-large";

const normalizeApiKey = (valor: unknown): string | null => {
  if (!valor) return null;

  if (typeof valor === "string") {
    const trimmed = valor.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return parsed.trim();
      }
      return normalizeApiKey(parsed);
    } catch {
      return trimmed.replace(/^"(.*)"$/, "$1");
    }
  }

  if (typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    if (obj == null) return null;
    if ("valor" in obj) return normalizeApiKey(obj.valor);
    if ("apiKey" in obj) return normalizeApiKey(obj.apiKey);
    if ("key" in obj) return normalizeApiKey(obj.key);
  }

  return null;
};

const buscarApiKeyConfiguracoes = async (supabase: SupabaseClient): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("configuracoes_sistema")
      .select("valor")
      .eq("chave", "api_key_openai")
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar api_key_openai nas configurações:", error);
      return null;
    }

    return normalizeApiKey(data?.valor ?? null);
  } catch (err) {
    console.error("Falha ao consultar configuracoes_sistema:", err);
    return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      apiKey = (await buscarApiKeyConfiguracoes(supabase)) ?? undefined;
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Serviço de IA não configurado. Cadastre a chave em Configurações ou variável OPENAI_API_KEY.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const payload: RegistrarRequest = await req.json();
    if (!payload.fotoId || !payload.descricao) {
      return new Response(
        JSON.stringify({
          error: "fotoId e descrição são obrigatórios.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const contextoPartes = [
      payload.ambiente ? `Ambiente: ${payload.ambiente}` : null,
      payload.grupo ? `Sistema: ${payload.grupo}` : null,
      payload.item ? `Elemento: ${payload.item}` : null,
      payload.status ? `Status: ${payload.status}` : null,
      payload.condominioNome ? `Condomínio: ${payload.condominioNome}` : null,
      payload.resumo?.gravidade ? `Gravidade: ${payload.resumo?.gravidade}` : null,
    ].filter(Boolean) as string[];

    const contextoString = [
      contextoPartes.join(" | "),
      payload.descricao,
      payload.resumo?.recomendacoes ? `Recomendações: ${payload.resumo.recomendacoes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const embeddingRes = await fetch(`${OPENAI_API_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: contextoString,
        model: EMBEDDING_MODEL,
      }),
    });

    if (!embeddingRes.ok) {
      const err = await embeddingRes.text();
      console.error("Erro ao gerar embedding validado:", err);
      throw new Error("Falha ao gerar embedding da descrição validada");
    }

    const embeddingData = await embeddingRes.json();
    const embedding = embeddingData.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error("Embedding inválido retornado pela API");
    }

    if (payload.feedbackId && payload.foiEditado) {
      const { error: updateIaError } = await supabase
        .from("foto_patologia_feedback")
        .update({
          metadata: {
            ...(payload.resumo ?? {}),
            substituido_por_usuario: true,
          },
        })
        .eq("id", payload.feedbackId);

      if (updateIaError) {
        console.error("Erro ao marcar feedback IA como substituído:", updateIaError);
      }
    }

    const metadataPayload = {
      ...(payload.resumo ?? {}),
      ambiente: payload.ambiente,
      grupo: payload.grupo,
      item: payload.item,
      status: payload.status,
      condominioId: payload.condominioId,
      condominioNome: payload.condominioNome,
    };

    let targetFeedbackId = payload.feedbackId ?? null;
    let targetOrigem = payload.origem ?? "usuario";

    if (payload.feedbackId && payload.foiEditado !== true) {
      const { data: updated, error: updateExistingError } = await supabase
        .from("foto_patologia_feedback")
        .update({
          descricao: payload.descricao,
          tags: payload.resumo?.patologias ?? null,
          confianca: payload.resumo?.confianca ?? null,
          validada: true,
          usuario_id: payload.usuarioId ?? null,
          metadata: metadataPayload,
        })
        .eq("id", payload.feedbackId)
        .select()
        .single();

      if (updateExistingError) {
        console.error("Erro ao atualizar feedback existente como validado:", updateExistingError);
        throw updateExistingError;
      }

      targetFeedbackId = updated?.id ?? payload.feedbackId;
      targetOrigem = updated?.origem ?? targetOrigem;
    }

    let feedbackRecord = null;

    if (!targetFeedbackId || payload.foiEditado === true) {
      const { data: inserted, error: insertError } = await supabase
        .from("foto_patologia_feedback")
        .insert({
          foto_id: payload.fotoId,
          grupo_vistoria_id: payload.grupoVistoriaId ?? null,
          vistoria_id: payload.vistoriaId ?? null,
          descricao: payload.descricao,
          origem: payload.foiEditado ? "usuario" : targetOrigem,
          usuario_id: payload.usuarioId ?? null,
          tags: payload.resumo?.patologias ?? null,
          confianca: payload.resumo?.confianca ?? null,
          validada: true,
          parent_feedback_id: payload.feedbackId ?? null,
          metadata: metadataPayload,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Erro ao registrar feedback validado:", insertError);
        throw insertError;
      }

      feedbackRecord = inserted;
      targetFeedbackId = inserted.id;
      targetOrigem = inserted.origem ?? targetOrigem;
    }

    if (!feedbackRecord && targetFeedbackId) {
      const { data: fetched } = await supabase
        .from("foto_patologia_feedback")
        .select()
        .eq("id", targetFeedbackId)
        .single();
      feedbackRecord = fetched;
    }

    const contextoEmbedding = [contextoPartes.join(" | "), payload.descricao]
      .filter(Boolean)
      .join("\n");

    const { error: embedError } = await supabase.from("foto_patologia_embeddings").upsert({
      feedback_id: targetFeedbackId,
      embedding,
      contexto: contextoEmbedding,
    });

    if (embedError) {
      console.error("Erro ao salvar embedding validado:", embedError);
    }

    return new Response(
      JSON.stringify({
        feedbackId: targetFeedbackId,
        mensagem: "Descrição validada registrada com sucesso.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("Erro na função registrar-patologia-feedback:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
