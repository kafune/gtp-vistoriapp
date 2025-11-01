import { supabase } from "@/integrations/supabase/client";

export interface PatologiaResumo {
  patologias: string[];
  gravidade: string;
  recomendacoes: string;
  confianca: number;
}

export interface PatologiaSugestao {
  descricao: string;
  resumo: PatologiaResumo;
  feedbackId: string | null;
  exemplos: Array<{
    feedback_id: string;
    descricao: string;
    similarity: number;
    origem: string;
    contexto: string;
    tags: string[] | null;
  }>;
}

export interface PatologiaContexto {
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

export interface RegistrarFeedbackPayload {
  fotoId: string;
  grupoVistoriaId?: string;
  vistoriaId?: string;
  usuarioId?: string;
  descricao: string;
  origem?: "ia" | "usuario";
  feedbackId?: string | null;
  foiEditado?: boolean;
  resumo?: PatologiaResumo;
  ambiente?: string;
  grupo?: string;
  item?: string;
  status?: string;
  condominioId?: string;
  condominioNome?: string;
}

export const generatePatologiaDescricao = async (
  contexto: PatologiaContexto,
): Promise<PatologiaSugestao> => {
  const { data, error } = await supabase.functions.invoke("descrever-patologia", {
    body: contexto,
  });

  if (error) {
    console.error("Erro ao chamar função descrever-patologia:", error);
    throw new Error(error.message || "Falha ao gerar descrição automática.");
  }

  return data as PatologiaSugestao;
};

export const registrarPatologiaFeedback = async (payload: RegistrarFeedbackPayload) => {
  const { data, error } = await supabase.functions.invoke("registrar-patologia-feedback", {
    body: payload,
  });

  if (error) {
    console.error("Erro ao registrar feedback de patologia:", error);
    throw new Error(error.message || "Falha ao registrar feedback da descrição.");
  }

  return data as { feedbackId: string; mensagem: string };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
