import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  ativo: boolean;
  role: "admin" | "sindico";
  email_copia_1?: string;
  email_copia_2?: string;
  email_copia_3?: string;
}

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar usuários do Supabase
  const carregarUsuarios = useCallback(async () => {
    try {
      // Carregar todos os usuários (RLS permite para admins)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) {
        throw error;
      }

      const usuariosFormatados = data.map(profile => ({
        id: profile.id,
        nome: profile.nome,
        email: profile.email,
        telefone: profile.telefone || "",
        cargo: profile.cargo || "Vistoriador",
        ativo: profile.ativo,
        role: profile.role || "sindico",
        email_copia_1: profile.email_copia_1 || "",
        email_copia_2: profile.email_copia_2 || "",
        email_copia_3: profile.email_copia_3 || "",
      }));

      setUsuarios(usuariosFormatados);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const adicionarUsuario = async (
    dadosUsuario: Omit<Usuario, "id">,
    condominioId?: string,
    password?: string,
  ): Promise<{ userId?: string; tempPassword?: string; error?: Error }> => {
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        userId?: string;
        tempPassword?: string;
        warning?: string;
        warningDetails?: string;
        error?: string;
      }>("criar-usuario", {
        body: {
          dadosUsuario: {
            ...dadosUsuario,
            condominioId,
            password,
          },
          condominioId,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Falha ao criar usuário");
      }

      await carregarUsuarios();

      const tempPassword = data?.tempPassword;

      toast({
        title: "Sucesso",
        description: tempPassword
          ? `Usuário criado. Senha temporária: ${tempPassword}`
          : "Usuário criado com sucesso.",
      });

      if (data?.warning) {
        toast({
          title: "Aviso",
          description: data.warning,
        });
      }

      return { userId: data?.userId, tempPassword };
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o usuário.",
        variant: "destructive",
      });
      return {
        error: error instanceof Error ? error : new Error("Erro desconhecido ao adicionar usuário"),
      };
    }
  };

  const atualizarUsuario = async (id: string, dadosAtualizados: Partial<Usuario>) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: dadosAtualizados.nome,
          telefone: dadosAtualizados.telefone,
          cargo: dadosAtualizados.cargo,
          ativo: dadosAtualizados.ativo,
          role: dadosAtualizados.role,
          email_copia_1: dadosAtualizados.email_copia_1,
          email_copia_2: dadosAtualizados.email_copia_2,
          email_copia_3: dadosAtualizados.email_copia_3,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      await carregarUsuarios();

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    }
  };

  const removerUsuario = async (id: string) => {
    try {
      // Em vez de deletar o perfil (que pode quebrar referências),
      // vamos apenas desativar o usuário
      const { error } = await supabase.from("profiles").update({ ativo: false }).eq("id", id);

      if (error) {
        throw error;
      }

      await carregarUsuarios();

      toast({
        title: "Sucesso",
        description: "Usuário desativado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    }
  };

  const obterUsuariosAtivos = () => {
    return usuarios.filter(usuario => usuario.ativo);
  };

  // Associar usuário a condomínio
  const associarCondominio = async (userId: string, condominioId: string) => {
    try {
      const { error } = await supabase.from("usuario_condominios").insert({
        user_id: userId,
        condominio_id: condominioId,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Usuário associado ao condomínio com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao associar usuário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível associar o usuário ao condomínio.",
        variant: "destructive",
      });
    }
  };

  // Remover associação usuário-condomínio
  const removerAssociacao = async (userId: string, condominioId: string) => {
    try {
      const { error } = await supabase
        .from("usuario_condominios")
        .delete()
        .eq("user_id", userId)
        .eq("condominio_id", condominioId);

      if (error) {
        throw error;
      }

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

  // Obter condomínios do usuário
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
    usuarios,
    loading,
    adicionarUsuario,
    atualizarUsuario,
    removerUsuario,
    obterUsuariosAtivos,
    associarCondominio,
    removerAssociacao,
    obterCondominiosUsuario,
    recarregar: carregarUsuarios,
  };
};
