import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UsuarioCondominio {
  id: string;
  user_id: string;
  condominio_id: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    role: string;
  };
  condominio?: {
    id: string;
    nome: string;
  };
}

export const useUsuarioCondominios = () => {
  const [associacoes, setAssociacoes] = useState<UsuarioCondominio[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregarAssociacoes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("usuario_condominios")
        .select(
          `
          *,
          profiles!usuario_condominios_user_id_fkey (
            id,
            nome,
            email,
            role
          ),
          condominios (
            id,
            nome
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const associacoesFormatadas = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        condominio_id: item.condominio_id,
        usuario: item.profiles
          ? {
              id: item.profiles.id,
              nome: item.profiles.nome,
              email: item.profiles.email,
              role: item.profiles.role,
            }
          : undefined,
        condominio: item.condominios
          ? {
              id: item.condominios.id,
              nome: item.condominios.nome,
            }
          : undefined,
      }));

      setAssociacoes(associacoesFormatadas);
    } catch (error) {
      console.error("Erro ao carregar associações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as associações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarAssociacoes();
  }, [carregarAssociacoes]);

  const criarAssociacao = async (userId: string, condominioId: string) => {
    try {
      const { error } = await supabase.from("usuario_condominios").insert({
        user_id: userId,
        condominio_id: condominioId,
      });

      if (error) {
        throw error;
      }

      await carregarAssociacoes();

      toast({
        title: "Sucesso",
        description: "Usuário associado ao condomínio com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao criar associação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível associar o usuário ao condomínio.",
        variant: "destructive",
      });
    }
  };

  const removerAssociacao = async (id: string) => {
    try {
      const { error } = await supabase.from("usuario_condominios").delete().eq("id", id);

      if (error) {
        throw error;
      }

      await carregarAssociacoes();

      toast({
        title: "Sucesso",
        description: "Associação removida com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover associação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a associação.",
        variant: "destructive",
      });
    }
  };

  const obterCondominiosUsuario = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("usuario_condominios")
        .select(
          `
          condominio_id,
          condominios (
            id,
            nome
          )
        `,
        )
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return data?.map(item => item.condominios).filter(Boolean) || [];
    } catch (error) {
      console.error("Erro ao obter condomínios do usuário:", error);
      return [];
    }
  };

  return {
    associacoes,
    loading,
    criarAssociacao,
    removerAssociacao,
    obterCondominiosUsuario,
    recarregar: carregarAssociacoes,
  };
};
