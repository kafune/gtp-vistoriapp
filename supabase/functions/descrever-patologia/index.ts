import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatologiaRequest {
  fotoId?: string;
  fotoUrl?: string;
  imageBase64?: string;
  grupoVistoriaId?: string;
  vistoriaId?: string;
  usuarioId?: string;
  ambiente?: string;
  grupo?: string;
  item?: string;
  status?: string;
  condominioId?: string;
  condominioNome?: string;
  responsavel?: string;
  modo?: string;
  descricaoAtual?: string;
}

interface MatchResult {
  feedback_id: string;
  descricao: string;
  similarity: number;
  origem: string;
  contexto: string;
  vistoria_id: string;
  grupo_vistoria_id: string;
  tags: string[] | null;
}

const OPENAI_API_URL = "https://api.openai.com/v1";
const OPENAI_MODEL = "gpt-4o-mini";
const EMBEDDING_MODEL = "text-embedding-3-large";

const systemPrompt = `
Você é um engenheiro especialista em patologias prediais.
Analise a imagem fornecida e produza um diagnóstico técnico preciso.

Requisitos da resposta:
- Formato JSON válido com as chaves:
  descricao: descrição técnica em até 280 caracteres, sem iniciar com "A imagem mostra".
  patologias: lista de patologias identificadas (strings).
  gravidade: uma das ["Baixa","Média","Alta","Crítica"].
  recomendacoes: recomendações em até 200 caracteres.
  confianca: número entre 0 e 1 indicando confiança do diagnóstico.
- Utilize linguagem objetiva e termo técnico.
- Considere o contexto fornecido da vistoria para refinar a análise.
- Se não houver patologia aparente, ainda assim descreva o estado geral e marque gravidade "Baixa".
`;

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

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const downloadImageAsBase64 = async (
  url: string,
  timeoutMs = 20000,
): Promise<{ base64: string; mimeType: string } | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.error("Falha ao baixar imagem:", response.status, response.statusText);
      return null;
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = toBase64(new Uint8Array(arrayBuffer));
    return { base64, mimeType: contentType };
  } catch (error) {
    console.error("Erro ao baixar imagem para IA:", error);
    return null;
  } finally {
    clearTimeout(timeoutId);
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
      console.error("OPENAI_API_KEY não configurada nem encontrada em configuracoes_sistema");
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

    const {
      fotoId,
      fotoUrl,
      imageBase64,
      grupoVistoriaId,
      vistoriaId,
      usuarioId,
      ambiente,
      grupo,
      item,
      status,
      condominioId,
      condominioNome,
      responsavel,
      modo,
      descricaoAtual,
    }: PatologiaRequest = await req.json();

    if (!fotoUrl && !imageBase64) {
      return new Response(
        JSON.stringify({
          error: "Foto não informada. Envie fotoUrl ou imageBase64.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const contextParts = [
      ambiente ? `Ambiente: ${ambiente}` : null,
      grupo ? `Sistema: ${grupo}` : null,
      item ? `Elemento: ${item}` : null,
      status ? `Status: ${status}` : null,
      condominioNome ? `Condomínio: ${condominioNome}` : null,
      responsavel ? `Responsável: ${responsavel}` : null,
      modo ? `Modo de análise: ${modo}` : null,
    ].filter(Boolean) as string[];

    const contextSummary = contextParts.length > 0 ? contextParts.join(" | ") : "Sem contexto";

    const embeddingPayload = {
      input: [contextSummary, descricaoAtual ? `Descrição atual: ${descricaoAtual}` : ""].join(
        "\n",
      ),
      model: EMBEDDING_MODEL,
    };

    const embeddingRes = await fetch(`${OPENAI_API_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(embeddingPayload),
    });

    if (!embeddingRes.ok) {
      const err = await embeddingRes.text();
      console.error("Erro ao gerar embedding:", err);
      throw new Error("Falha ao gerar embedding para contexto");
    }

    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    let exemplos: MatchResult[] = [];
    if (Array.isArray(queryEmbedding)) {
      const { data: matches, error: matchError } = await supabase.rpc("match_patologia_feedback", {
        query_embedding: queryEmbedding,
        match_count: 4,
        similarity_threshold: 0.65,
      });

      if (matchError) {
        console.error("Erro ao buscar exemplos semelhantes:", matchError);
      } else if (Array.isArray(matches)) {
        exemplos = matches as MatchResult[];
      }
    }

    const exemplosTexto = exemplos
      .map((ex, index) => {
        const tagStr =
          ex.tags && ex.tags.length > 0
            ? `Patologias: ${ex.tags.join(", ")}`
            : "Patologias: não informadas";
        return `EXEMPLO ${index + 1} (similaridade ${(ex.similarity * 100).toFixed(1)}%):
${ex.descricao}
${tagStr}`;
      })
      .join("\n\n");

    let imagemIncorporada: { base64: string; mimeType: string } | null = null;
    if (!imageBase64 && fotoUrl) {
      imagemIncorporada = await downloadImageAsBase64(fotoUrl);
    }

    const userContent = [
      {
        type: "text",
        text: [
          "Contexto da vistoria:",
          contextSummary,
          "",
          exemplosTexto ? `Exemplos similares validados:\n${exemplosTexto}` : "",
          "",
          "Retorne apenas JSON válido conforme especificação. Não inclua texto adicional.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      {
        type: "text",
        text: descricaoAtual
          ? `Descrição atual fornecida pelo usuário (apenas referência, pode ser melhorada): ${descricaoAtual}`
          : "Nenhuma descrição fornecida pelo usuário.",
      },
    ];

    if (imagemIncorporada || imageBase64) {
      const base64Data = imagemIncorporada
        ? `data:${imagemIncorporada.mimeType};base64,${imagemIncorporada.base64}`
        : `data:image/jpeg;base64,${imageBase64}`;
      userContent.push({
        type: "image_url",
        image_url: {
          url: base64Data,
        },
      });
    } else if (fotoUrl) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: fotoUrl,
        },
      });
    }

    const temperature = modo === "detalhado" ? 0.35 : 0.25;

    const completionPayload = {
      model: OPENAI_MODEL,
      temperature,
      max_tokens: 350,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    };

    const completionRes = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(completionPayload),
    });

    if (!completionRes.ok) {
      const err = await completionRes.text();
      console.error("Erro na geração de descrição:", err);
      throw new Error("Falha ao gerar descrição automática");
    }

    const completionData = await completionRes.json();
    const content = completionData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta da IA vazia");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_err) {
      console.warn("Falha ao parsear JSON, retornando bruto");
      parsed = {
        descricao: content,
        patologias: [],
        gravidade: "Média",
        recomendacoes: "",
        confianca: 0.5,
      };
    }

    const descricaoFinal = parsed.descricao?.trim?.() || parsed.descricao || "";
    const patologias: string[] = Array.isArray(parsed.patologias) ? parsed.patologias : [];
    const gravidade: string = parsed.gravidade || "Média";
    const recomendacoes: string = parsed.recomendacoes || "";
    const confianca: number = typeof parsed.confianca === "number" ? parsed.confianca : 0.5;

    const { data: feedback, error: feedbackError } = await supabase
      .from("foto_patologia_feedback")
      .insert({
        foto_id: fotoId ?? null,
        grupo_vistoria_id: grupoVistoriaId ?? null,
        vistoria_id: vistoriaId ?? null,
        descricao: descricaoFinal,
        origem: "ia",
        modelo: OPENAI_MODEL,
        temperatura: temperature,
        confianca,
        tags: patologias,
        usuario_id: usuarioId ?? null,
        metadata: {
          recomendacoes,
          gravidade,
          contexto: contextSummary,
          exemplos_utilizados: exemplos.map(ex => ({
            id: ex.feedback_id,
            similarity: ex.similarity,
          })),
        },
      })
      .select()
      .single();

    if (feedbackError) {
      console.error("Não foi possível registrar feedback da IA:", feedbackError);
    }

    return new Response(
      JSON.stringify({
        descricao: descricaoFinal,
        resumo: {
          patologias,
          gravidade,
          recomendacoes,
          confianca,
        },
        feedbackId: feedback?.id ?? null,
        exemplos,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("Erro na função descrever-patologia:", error);
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
