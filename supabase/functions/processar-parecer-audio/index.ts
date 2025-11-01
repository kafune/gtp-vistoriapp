import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParecerAudioRequest {
  audioBase64: string;
  mimeType?: string;
  contexto?: {
    ambiente?: string;
    grupo?: string;
    item?: string;
    status?: string;
    condominioNome?: string;
    responsavel?: string;
  };
  textoManual?: string;
}

interface ParecerResponse {
  transcricao: string;
  parecerRefinado: string;
}

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const TRANSCRIPTION_MODEL = "whisper-1";
const REFINEMENT_MODEL = "gpt-4o-mini";

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

const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const construirPromptRefino = (contexto?: ParecerAudioRequest["contexto"]) => {
  const partes: string[] = [];
  if (contexto?.ambiente) partes.push(`Ambiente: ${contexto.ambiente}`);
  if (contexto?.grupo) partes.push(`Sistema/Grupo: ${contexto.grupo}`);
  if (contexto?.item) partes.push(`Item: ${contexto.item}`);
  if (contexto?.status) partes.push(`Status: ${contexto.status}`);
  if (contexto?.condominioNome) partes.push(`Condomínio: ${contexto.condominioNome}`);
  if (contexto?.responsavel) partes.push(`Responsável: ${contexto.responsavel}`);

  return partes.length > 0 ? partes.join(" | ") : "Sem contexto adicional informado";
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
            "Serviço de IA não configurado. Cadastre a chave em Configurações ou utilize a variável OPENAI_API_KEY.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { audioBase64, mimeType, contexto, textoManual }: ParecerAudioRequest = await req.json();

    if (!audioBase64 && !textoManual) {
      return new Response(
        JSON.stringify({ error: "Forneça áudio em base64 ou texto para refino." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    let transcricao = textoManual?.trim() ?? "";

    if (!transcricao && audioBase64) {
      const audioBytes = base64ToUint8Array(audioBase64);
      const fileType = mimeType ?? "audio/webm";
      const extensao = fileType.includes("mp3") ? "mp3" : fileType.includes("ogg") ? "ogg" : "webm";

      const audioFile = new File([audioBytes], `parecer.${extensao}`, { type: fileType });

      const formData = new FormData();
      formData.append("model", TRANSCRIPTION_MODEL);
      formData.append("temperature", "0");
      formData.append("response_format", "json");
      formData.append("file", audioFile);

      const transcriptionRes = await fetch(OPENAI_TRANSCRIPTION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!transcriptionRes.ok) {
        const errText = await transcriptionRes.text();
        console.error("Erro na transcrição de áudio:", errText);
        throw new Error("Não foi possível transcrever o áudio enviado.");
      }

      const transcriptionData = await transcriptionRes.json();
      transcricao = transcriptionData.text?.trim?.() ?? "";
    }

    if (!transcricao) {
      return new Response(
        JSON.stringify({ error: "Não foi possível obter texto do áudio enviado." }),
        {
          status: 422,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const contextoPrompt = construirPromptRefino(contexto);
    const systemPrompt = `Você é um engenheiro civil responsável por redigir pareceres técnicos de vistorias prediais.

Regras:
- Reescreva o texto de entrada com linguagem técnica, concisa e objetiva.
- Destaque materiais, condições estruturais, riscos e recomendações.
- Evite adjetivos genéricos ("muito", "bastante") e informalidades.
- Mantenha o texto em português, no presente descritivo.
- Se houver recomendações críticas, deixe-as claras no final.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          `Contexto: ${contextoPrompt}`,
          "",
          "Texto do parecer dictado:",
          transcricao,
          "",
          "Reescreva o texto acima seguindo as regras. Retorne apenas o texto refinado.",
        ].join("\n"),
      },
    ];

    const refinementRes = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: REFINEMENT_MODEL,
        temperature: 0.2,
        max_tokens: 400,
        messages,
      }),
    });

    if (!refinementRes.ok) {
      const errText = await refinementRes.text();
      console.error("Erro ao refinar parecer:", errText);
      throw new Error("Não foi possível refinar o parecer com IA.");
    }

    const refinementData = await refinementRes.json();
    const parecerRefinado = refinementData.choices?.[0]?.message?.content?.trim?.() ?? "";

    const resposta: ParecerResponse = {
      transcricao,
      parecerRefinado: parecerRefinado || transcricao,
    };

    return new Response(JSON.stringify(resposta), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Erro na função processar-parecer-audio:", error);
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
