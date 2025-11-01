import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BaseConhecimento {
  id: string;
  titulo: string;
  tipo_documento: string;
  categoria?: string;
  conteudo_extraido: string;
  palavras_chave: string[];
  arquivo_url?: string;
  tamanho_bytes?: number;
  usuario_id: string;
  created_at: string;
  updated_at: string;
}

export interface NovaBaseConhecimento {
  titulo: string;
  tipo_documento: string;
  categoria?: string;
  conteudo_extraido: string;
  palavras_chave: string[];
  arquivo_url?: string;
  tamanho_bytes?: number;
}

interface ExtracaoPDFResultado {
  conteudo_extraido: string;
  palavras_chave: string[];
  resumo?: string;
  topicos_principais?: string[];
  normas_referencias?: string[];
}

export const useBaseConhecimento = () => {
  const [baseConhecimento, setBaseConhecimento] = useState<BaseConhecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const carregarBaseConhecimento = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("base_conhecimento")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBaseConhecimento(data || []);
    } catch (error) {
      console.error("Erro ao carregar base de conhecimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a base de conhecimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const adicionarConhecimento = async (
    novoConhecimento: NovaBaseConhecimento,
  ): Promise<BaseConhecimento | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("base_conhecimento")
        .insert({
          ...novoConhecimento,
          usuario_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setBaseConhecimento(prev => [data, ...prev]);

      toast({
        title: "Sucesso",
        description: "Base de conhecimento adicionada com sucesso!",
      });

      return data;
    } catch (error) {
      console.error("Erro ao adicionar conhecimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o conhecimento.",
        variant: "destructive",
      });
      return null;
    }
  };

  const atualizarConhecimento = async (
    id: string,
    dados: Partial<NovaBaseConhecimento>,
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("base_conhecimento")
        .update(dados)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setBaseConhecimento(prev => prev.map(item => (item.id === id ? data : item)));

      toast({
        title: "Sucesso",
        description: "Conhecimento atualizado com sucesso!",
      });

      return true;
    } catch (error) {
      console.error("Erro ao atualizar conhecimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o conhecimento.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removerConhecimento = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("base_conhecimento").delete().eq("id", id);

      if (error) throw error;

      setBaseConhecimento(prev => prev.filter(item => item.id !== id));

      toast({
        title: "Sucesso",
        description: "Conhecimento removido com sucesso!",
      });

      return true;
    } catch (error) {
      console.error("Erro ao remover conhecimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o conhecimento.",
        variant: "destructive",
      });
      return false;
    }
  };

  const uploadPDF = async (arquivo: File): Promise<string | null> => {
    try {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const fileExt = arquivo.name.split(".").pop();
      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("conhecimento-pdfs")
        .upload(fileName, arquivo);

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("conhecimento-pdfs").getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload do PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do PDF.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const extrairConteudoPDF = async (
    arquivoUrl: string,
    titulo: string,
    categoria: string,
    tipo_documento: string,
  ): Promise<ExtracaoPDFResultado | null> => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        data: ExtracaoPDFResultado;
        error?: string;
      }>("extrair-pdf", {
        body: {
          file_url: arquivoUrl,
          titulo,
          categoria,
          tipo_documento,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Erro na extração");
      }

      return data.data;
    } catch (error) {
      console.error("Erro ao extrair conteúdo do PDF:", error);
      toast({
        title: "Erro na Extração",
        description:
          "Não foi possível extrair o conteúdo automaticamente. Você pode adicionar manualmente.",
        variant: "destructive",
      });
      return null;
    }
  };

  const buscarConhecimentoRelevante = async (
    contexto: string,
    categoria?: string,
  ): Promise<BaseConhecimento[]> => {
    try {
      let query = supabase.from("base_conhecimento").select("*");

      if (categoria) {
        query = query.eq("categoria", categoria);
      }

      // Busca por palavras-chave que contenham termos do contexto
      const termos = contexto
        .toLowerCase()
        .split(" ")
        .filter(t => t.length > 3);
      if (termos.length > 0) {
        query = query.overlaps("palavras_chave", termos);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(5);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Erro ao buscar conhecimento relevante:", error);
      return [];
    }
  };

  useEffect(() => {
    carregarBaseConhecimento();
  }, [carregarBaseConhecimento]);

  return {
    baseConhecimento,
    loading,
    uploading,
    carregarBaseConhecimento,
    adicionarConhecimento,
    atualizarConhecimento,
    removerConhecimento,
    uploadPDF,
    extrairConteudoPDF,
    buscarConhecimentoRelevante,
  };
};
