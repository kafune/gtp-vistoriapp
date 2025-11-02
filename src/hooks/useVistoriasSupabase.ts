import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface ChecklistTecnico {
  sistemaId: string;
  elementoId: string;
  tipo: string;
  manifestacoesIds: string[];
  observacoesTecnicas: string;
}

export interface GrupoVistoriaSupabase {
  id?: string;
  vistoria_id?: string;
  ambiente: string;
  grupo: string;
  item: string;
  status: string;
  parecer: string;
  ordem?: number;
  fotos?: FotoVistoriaSupabase[];
  // Novos campos para checklist técnico
  modo_checklist?: boolean;
  checklist_tecnico?: ChecklistTecnico;
}

export interface FotoVistoriaSupabase {
  id?: string;
  grupo_vistoria_id?: string;
  arquivo_nome: string;
  arquivo_url: string;
  descricao?: string;
  tamanho_bytes?: number;
  tipo_mime?: string;
}

export interface VistoriaSupabase {
  id?: string;
  condominio_id: string;
  user_id?: string;
  numero_interno: string;
  id_sequencial: number;
  data_vistoria: string;
  observacoes_gerais?: string;
  responsavel: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  grupos: GrupoVistoriaSupabase[];
  // Dados do condomínio para exibição
  condominio?: {
    id: string;
    nome: string;
  };
}

interface SupabaseGrupoResumo {
  id: string;
  vistoria_id: string;
  ambiente: string;
  grupo: string;
  item: string;
  status: string;
  parecer?: string | null;
  ordem?: number | null;
  modo_checklist?: boolean | null;
  checklist_tecnico?: ChecklistTecnico | string | null;
}

interface SupabaseVistoriaRow {
  id: string;
  condominio_id: string;
  user_id: string;
  numero_interno: string;
  id_sequencial: number;
  data_vistoria: string;
  observacoes_gerais?: string | null;
  responsavel: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  condominio?: { id: string; nome: string } | { id: string; nome: string }[] | null;
  grupos_vistoria?: SupabaseGrupoResumo[] | null;
}

export const useVistoriasSupabase = () => {
  const [vistorias, setVistorias] = useState<VistoriaSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const carregarVistorias = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log("Carregando vistorias do Supabase para usuário:", user.id);

      const { data: vistoriasData, error } = await supabase
        .from("vistorias")
        .select(
          `
          *,
          condominio:condominios(id, nome),
          grupos_vistoria(
            id,
            vistoria_id,
            ambiente,
            grupo,
            item,
            status,
            parecer,
            ordem,
            modo_checklist,
            checklist_tecnico
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar vistorias:", error);
        throw error;
      }

      console.log("Vistorias carregadas:", vistoriasData);

      // Transformar os dados para o formato esperado
      const vistoriasFormatadas: VistoriaSupabase[] = (vistoriasData || []).map(
        (vistoria: SupabaseVistoriaRow) => {
          const condominio =
            Array.isArray(vistoria.condominio) && vistoria.condominio.length > 0
              ? vistoria.condominio[0]
              : (vistoria.condominio ?? undefined);

          const grupos = (vistoria.grupos_vistoria || []).map((grupo): GrupoVistoriaSupabase => {
            const checklist =
              typeof grupo.checklist_tecnico === "string" && grupo.checklist_tecnico
                ? (JSON.parse(grupo.checklist_tecnico) as ChecklistTecnico)
                : (grupo.checklist_tecnico ?? undefined);

            return {
              id: grupo.id,
              vistoria_id: grupo.vistoria_id,
              ambiente: grupo.ambiente,
              grupo: grupo.grupo,
              item: grupo.item,
              status: grupo.status,
              parecer: grupo.parecer || "",
              ordem: grupo.ordem || 0,
              fotos: [],
              modo_checklist: Boolean(grupo.modo_checklist),
              checklist_tecnico: checklist,
            };
          });

          return {
            id: vistoria.id,
            condominio_id: vistoria.condominio_id,
            user_id: vistoria.user_id,
            numero_interno: vistoria.numero_interno,
            id_sequencial: vistoria.id_sequencial,
            data_vistoria: vistoria.data_vistoria,
            observacoes_gerais: vistoria.observacoes_gerais || undefined,
            responsavel: vistoria.responsavel,
            status: vistoria.status,
            created_at: vistoria.created_at,
            updated_at: vistoria.updated_at,
            condominio,
            grupos,
          };
        },
      );

      setVistorias(vistoriasFormatadas);
    } catch (error) {
      console.error("Erro ao carregar vistorias:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as vistorias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      carregarVistorias();
    }
  }, [user, carregarVistorias]);

  const salvarVistoria = async (
    dadosVistoria: Omit<VistoriaSupabase, "id" | "user_id" | "created_at" | "updated_at">,
  ) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Salvando vistoria:", dadosVistoria);

      // Preparar dados da vistoria sem os grupos
      const { grupos, ...dadosVistoriaSemGrupos } = dadosVistoria;
      const vistoriaParaSalvar = {
        ...dadosVistoriaSemGrupos,
        user_id: user.id,
      };

      // Inserir vistoria
      const { data: vistoriaData, error: vistoriaError } = await supabase
        .from("vistorias")
        .insert([vistoriaParaSalvar])
        .select()
        .single();

      if (vistoriaError) {
        console.error("Erro ao salvar vistoria:", vistoriaError);
        throw vistoriaError;
      }

      console.log("Vistoria salva:", vistoriaData);

      // Inserir grupos de vistoria
      if (grupos && grupos.length > 0) {
        const gruposParaSalvar = grupos.map(grupo => ({
          vistoria_id: vistoriaData.id,
          ambiente: grupo.ambiente,
          grupo: grupo.grupo,
          item: grupo.item,
          status: grupo.status,
          parecer: grupo.parecer || "",
          ordem: grupo.ordem || 0,
          // Campos do checklist técnico
          modo_checklist: grupo.modo_checklist || false,
          checklist_tecnico: grupo.checklist_tecnico
            ? JSON.stringify(grupo.checklist_tecnico)
            : null,
        }));

        const { data: gruposData, error: gruposError } = await supabase
          .from("grupos_vistoria")
          .insert(gruposParaSalvar)
          .select();

        if (gruposError) {
          console.error("Erro ao salvar grupos:", gruposError);
          throw gruposError;
        }

        console.log("Grupos salvos:", gruposData);
      }

      await carregarVistorias(); // Recarregar para obter dados atualizados

      toast({
        title: "Sucesso",
        description: `Vistoria ${dadosVistoria.numero_interno} salva com sucesso.`,
      });

      return vistoriaData;
    } catch (error) {
      console.error("Erro ao salvar vistoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a vistoria.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const obterProximoNumeroSequencial = async (condominioId: string): Promise<number> => {
    try {
      console.log("Obtendo próximo número sequencial para condomínio:", condominioId);

      // Usar a função do banco de dados que previne condições de corrida
      const { data, error } = await supabase.rpc("obter_proximo_numero_sequencial", {
        condominio_uuid: condominioId,
      });

      if (error) {
        console.error("Erro ao obter próximo número:", error);
        // Fallback para o método antigo em caso de erro
        const fallbackResult = await supabase
          .from("vistorias")
          .select("id_sequencial")
          .eq("condominio_id", condominioId)
          .order("id_sequencial", { ascending: false })
          .limit(1);

        const ultimoNumero =
          fallbackResult.data && fallbackResult.data.length > 0
            ? fallbackResult.data[0].id_sequencial
            : 0;
        return ultimoNumero + 1;
      }

      const proximoNumero = data || 1;
      console.log("Próximo número sequencial (atômico):", proximoNumero);
      return proximoNumero;
    } catch (error) {
      console.error("Erro ao obter próximo número:", error);
      return 1;
    }
  };

  const excluirVistoria = async (id: string) => {
    try {
      console.log("Excluindo vistoria:", id);

      const { error } = await supabase.from("vistorias").delete().eq("id", id);

      if (error) {
        console.error("Erro ao excluir vistoria:", error);
        throw error;
      }

      console.log("Vistoria excluída:", id);
      setVistorias(prev => prev.filter(v => v.id !== id));

      toast({
        title: "Sucesso",
        description: "Vistoria excluída com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir vistoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a vistoria.",
        variant: "destructive",
      });
    }
  };

  return {
    vistorias,
    loading,
    salvarVistoria,
    obterProximoNumeroSequencial,
    excluirVistoria,
    recarregar: carregarVistorias,
  };
};
