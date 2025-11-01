import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PatologiaResumo, registrarPatologiaFeedback } from "@/services/patologiaIA";

export interface FotoUpload {
  file: File;
  descricao: string;
  iaFeedbackId?: string | null;
  iaResumo?: PatologiaResumo | null;
  foiEditado?: boolean;
}

export interface FotoSalva {
  id: string;
  arquivo_nome: string;
  arquivo_url: string;
  descricao: string;
  tamanho_bytes: number;
  tipo_mime: string;
}

export interface UploadProgress {
  current: number;
  total: number;
  currentFileName: string;
  percentage: number;
}

export const useFotosSupabase = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFotos = async (
    grupoVistoriaId: string,
    fotos: FotoUpload[],
    options?: {
      vistoriaId?: string;
      ambiente?: string;
      grupo?: string;
      item?: string;
      status?: string;
      condominioId?: string;
      condominioNome?: string;
    },
  ): Promise<FotoSalva[]> => {
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    if (fotos.length === 0) {
      return [];
    }

    setUploading(true);
    setUploadProgress({
      current: 0,
      total: fotos.length,
      currentFileName: "",
      percentage: 0,
    });

    const fotosUploadadas: FotoSalva[] = [];

    try {
      console.log(`Fazendo upload de ${fotos.length} fotos para o grupo ${grupoVistoriaId}`);

      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        const timestamp = Date.now();
        const nomeArquivo = `${user.id}/${grupoVistoriaId}/${timestamp}_${i}_${foto.file.name}`;

        // Atualizar progresso
        setUploadProgress({
          current: i + 1,
          total: fotos.length,
          currentFileName: foto.file.name,
          percentage: Math.round(((i + 1) / fotos.length) * 100),
        });

        console.log(`Uploading foto ${i + 1}:`, nomeArquivo);

        // Upload do arquivo para o storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("fotos-vistoria")
          .upload(nomeArquivo, foto.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro no upload:", uploadError);
          throw uploadError;
        }

        // Obter URL pública do arquivo
        const { data: urlData } = supabase.storage.from("fotos-vistoria").getPublicUrl(nomeArquivo);

        // Salvar metadados no banco
        const { data: fotoData, error: dbError } = await supabase
          .from("fotos_vistoria")
          .insert({
            grupo_vistoria_id: grupoVistoriaId,
            arquivo_nome: foto.file.name,
            arquivo_url: urlData.publicUrl,
            descricao: foto.descricao,
            tamanho_bytes: foto.file.size,
            tipo_mime: foto.file.type,
          })
          .select()
          .single();

        if (dbError) {
          console.error("Erro ao salvar metadados:", dbError);
          // Tentar remover arquivo do storage se falhou salvar no banco
          await supabase.storage.from("fotos-vistoria").remove([nomeArquivo]);
          throw dbError;
        }

        fotosUploadadas.push({
          id: fotoData.id,
          arquivo_nome: fotoData.arquivo_nome,
          arquivo_url: fotoData.arquivo_url,
          descricao: fotoData.descricao || "",
          tamanho_bytes: fotoData.tamanho_bytes || 0,
          tipo_mime: fotoData.tipo_mime || "",
        });

        try {
          if (foto.descricao && foto.descricao.trim().length > 0) {
            await registrarPatologiaFeedback({
              fotoId: fotoData.id,
              grupoVistoriaId,
              vistoriaId: options?.vistoriaId,
              usuarioId: user.id,
              descricao: foto.descricao,
              origem: foto.iaFeedbackId ? "ia" : "usuario",
              feedbackId: foto.iaFeedbackId ?? undefined,
              foiEditado: foto.foiEditado,
              resumo: foto.iaResumo ?? undefined,
              ambiente: options?.ambiente,
              grupo: options?.grupo,
              item: options?.item,
              status: options?.status,
              condominioId: options?.condominioId,
              condominioNome: options?.condominioNome,
            });
          }
        } catch (registroError) {
          console.error("Erro ao registrar feedback da descrição de patologia:", registroError);
        }

        console.log(`Foto ${i + 1} salva com sucesso:`, fotoData);
      }

      toast({
        title: "Sucesso",
        description: `${fotos.length} foto(s) enviada(s) com sucesso.`,
      });

      return fotosUploadadas;
    } catch (error) {
      console.error("Erro no upload de fotos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar as fotos.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const removerFoto = async (fotoId: string, arquivoUrl: string) => {
    try {
      // Extrair caminho do arquivo da URL
      const url = new URL(arquivoUrl);
      const pathSegments = url.pathname.split("/");
      const nomeArquivo = pathSegments.slice(-3).join("/"); // user_id/grupo_id/arquivo

      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from("fotos-vistoria")
        .remove([nomeArquivo]);

      if (storageError) {
        console.error("Erro ao remover do storage:", storageError);
      }

      // Remover do banco
      const { error: dbError } = await supabase.from("fotos_vistoria").delete().eq("id", fotoId);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Sucesso",
        description: "Foto removida com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    uploadFotos,
    removerFoto,
    uploading,
    uploadProgress,
  };
};
