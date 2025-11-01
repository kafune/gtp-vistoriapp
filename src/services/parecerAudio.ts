import { supabase } from "@/integrations/supabase/client";

export interface ParecerAudioContexto {
  ambiente?: string;
  grupo?: string;
  item?: string;
  status?: string;
  condominioNome?: string;
  responsavel?: string;
}

export interface ParecerAudioResponse {
  transcricao: string;
  parecerRefinado: string;
}

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Não foi possível converter o áudio para base64."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const processarParecerAudio = async (params: {
  audioBase64?: string;
  mimeType?: string;
  textoManual?: string;
  contexto?: ParecerAudioContexto;
}): Promise<ParecerAudioResponse> => {
  const { data, error } = await supabase.functions.invoke("processar-parecer-audio", {
    body: params,
  });

  if (error) {
    console.error("Erro ao processar parecer por áudio:", error);
    throw new Error(error.message || "Falha ao processar o áudio para parecer técnico.");
  }

  return data as ParecerAudioResponse;
};
