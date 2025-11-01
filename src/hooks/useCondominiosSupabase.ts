import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CondominioSupabase {
  id: string;
  nome: string;
  endereco: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  telefone_responsavel?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useCondominiosSupabase = () => {
  const [condominios, setCondominios] = useState<CondominioSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const carregarCondominios = useCallback(async () => {
    try {
      console.log("Carregando condomínios do Supabase...");

      const { data, error } = await supabase
        .from("condominios")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao carregar condomínios:", error);
        throw error;
      }

      console.log("Condomínios carregados:", data);
      setCondominios(data || []);
    } catch (error) {
      console.error("Erro ao carregar condomínios:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os condomínios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarCondominios();
  }, [carregarCondominios]);

  const adicionarCondominio = async (
    dadosCondominio: Omit<CondominioSupabase, "id" | "created_at" | "updated_at" | "ativo">,
  ) => {
    try {
      console.log("Adicionando condomínio:", dadosCondominio);

      // Criar objeto com apenas os campos necessários
      const novoCondominio = {
        nome: dadosCondominio.nome?.trim() || "",
        endereco: dadosCondominio.endereco?.trim() || "",
        cidade: dadosCondominio.cidade?.trim() || null,
        estado: dadosCondominio.estado?.trim() || "SP",
        cep: dadosCondominio.cep?.trim() || null,
        telefone: dadosCondominio.telefone?.trim() || null,
        email: dadosCondominio.email?.trim() || null,
        responsavel: dadosCondominio.responsavel?.trim() || null,
        telefone_responsavel: dadosCondominio.telefone_responsavel?.trim() || null,
        ativo: true,
      };

      console.log("Dados preparados para inserção:", novoCondominio);

      const { data, error } = await supabase
        .from("condominios")
        .insert([novoCondominio])
        .select()
        .single();

      if (error) {
        console.error("Erro detalhado ao adicionar condomínio:", error);
        toast({
          title: "Erro",
          description: `Erro ao adicionar condomínio: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }

      console.log("Condomínio adicionado com sucesso:", data);
      setCondominios(prev => [...prev, data]);

      toast({
        title: "Sucesso",
        description: "Condomínio adicionado com sucesso.",
      });

      return data;
    } catch (error) {
      console.error("Erro final ao adicionar condomínio:", error);
      throw error;
    }
  };

  const atualizarCondominio = async (id: string, dadosAtualizados: Partial<CondominioSupabase>) => {
    try {
      console.log("Atualizando condomínio:", id, dadosAtualizados);

      const { data, error } = await supabase
        .from("condominios")
        .update(dadosAtualizados)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar condomínio:", error);
        throw error;
      }

      console.log("Condomínio atualizado:", data);
      setCondominios(prev => prev.map(cond => (cond.id === id ? data : cond)));

      toast({
        title: "Sucesso",
        description: "Condomínio atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar condomínio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o condomínio.",
        variant: "destructive",
      });
    }
  };

  const removerCondominio = async (id: string) => {
    try {
      console.log("Removendo condomínio:", id);

      const { error } = await supabase.from("condominios").update({ ativo: false }).eq("id", id);

      if (error) {
        console.error("Erro ao remover condomínio:", error);
        throw error;
      }

      console.log("Condomínio removido:", id);
      setCondominios(prev => prev.filter(cond => cond.id !== id));

      toast({
        title: "Sucesso",
        description: "Condomínio removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover condomínio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o condomínio.",
        variant: "destructive",
      });
    }
  };

  return {
    condominios,
    loading,
    adicionarCondominio,
    atualizarCondominio,
    removerCondominio,
    recarregar: carregarCondominios,
  };
};
