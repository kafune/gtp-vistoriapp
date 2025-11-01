import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface GrupoTemplate {
  id?: string;
  template_id?: string;
  ambiente: string;
  grupo: string;
  item: string;
  ordem: number;
}

export interface TemplateVistoria {
  id?: string;
  nome: string;
  descricao?: string;
  condominio_id?: string;
  user_id?: string;
  is_publico: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  grupos?: GrupoTemplate[];
  // Dados do condomínio para exibição
  condominio?: {
    id: string;
    nome: string;
  };
}

export const useTemplatesVistoria = () => {
  const [templates, setTemplates] = useState<TemplateVistoria[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const carregarTemplates = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log("Carregando templates de vistoria para usuário:", user.id);

      const { data: templatesData, error } = await supabase
        .from("templates_vistoria")
        .select(
          `
          *,
          condominio:condominios(id, nome),
          grupos_template(*)
        `,
        )
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar templates:", error);
        throw error;
      }

      console.log("Templates carregados:", templatesData);

      // Transformar os dados para o formato esperado
      const templatesFormatados: TemplateVistoria[] = (templatesData || []).map(template => ({
        id: template.id,
        nome: template.nome,
        descricao: template.descricao,
        condominio_id: template.condominio_id,
        user_id: template.user_id,
        is_publico: template.is_publico,
        ativo: template.ativo,
        created_at: template.created_at,
        updated_at: template.updated_at,
        condominio: Array.isArray(template.condominio)
          ? template.condominio[0]
          : template.condominio,
        grupos: (template.grupos_template || [])
          .map(grupo => ({
            id: grupo.id,
            template_id: grupo.template_id,
            ambiente: grupo.ambiente,
            grupo: grupo.grupo,
            item: grupo.item,
            ordem: grupo.ordem || 0,
          }))
          .sort((a, b) => a.ordem - b.ordem),
      }));

      setTemplates(templatesFormatados);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      carregarTemplates();
    }
  }, [user, carregarTemplates]);

  const criarTemplate = async (
    dadosTemplate: Omit<TemplateVistoria, "id" | "user_id" | "created_at" | "updated_at">,
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
      console.log("Criando template:", dadosTemplate);

      // Preparar dados do template sem os grupos
      const { grupos, ...dadosTemplateSemGrupos } = dadosTemplate;
      const templateParaSalvar = {
        ...dadosTemplateSemGrupos,
        user_id: user.id,
      };

      // Inserir template
      const { data: templateData, error: templateError } = await supabase
        .from("templates_vistoria")
        .insert([templateParaSalvar])
        .select()
        .single();

      if (templateError) {
        console.error("Erro ao salvar template:", templateError);
        throw templateError;
      }

      console.log("Template salvo:", templateData);

      // Inserir grupos do template
      if (grupos && grupos.length > 0) {
        const gruposParaSalvar = grupos.map(grupo => ({
          template_id: templateData.id,
          ambiente: grupo.ambiente,
          grupo: grupo.grupo,
          item: grupo.item,
          ordem: grupo.ordem || 0,
        }));

        const { data: gruposData, error: gruposError } = await supabase
          .from("grupos_template")
          .insert(gruposParaSalvar)
          .select();

        if (gruposError) {
          console.error("Erro ao salvar grupos do template:", gruposError);
          throw gruposError;
        }

        console.log("Grupos do template salvos:", gruposData);
      }

      await carregarTemplates(); // Recarregar para obter dados atualizados

      toast({
        title: "Sucesso",
        description: `Template "${dadosTemplate.nome}" criado com sucesso.`,
      });

      return templateData;
    } catch (error) {
      console.error("Erro ao criar template:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o template.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const atualizarTemplate = async (id: string, dadosAtualizados: Partial<TemplateVistoria>) => {
    try {
      console.log("Atualizando template:", id, dadosAtualizados);

      const { grupos, ...dadosTemplateSemGrupos } = dadosAtualizados;

      // Atualizar dados do template
      const { error: templateError } = await supabase
        .from("templates_vistoria")
        .update(dadosTemplateSemGrupos)
        .eq("id", id);

      if (templateError) {
        console.error("Erro ao atualizar template:", templateError);
        throw templateError;
      }

      // Se há grupos para atualizar
      if (grupos) {
        // Deletar grupos existentes
        const { error: deleteError } = await supabase
          .from("grupos_template")
          .delete()
          .eq("template_id", id);

        if (deleteError) {
          console.error("Erro ao deletar grupos existentes:", deleteError);
          throw deleteError;
        }

        // Inserir novos grupos
        if (grupos.length > 0) {
          const gruposParaSalvar = grupos.map(grupo => ({
            template_id: id,
            ambiente: grupo.ambiente,
            grupo: grupo.grupo,
            item: grupo.item,
            ordem: grupo.ordem || 0,
          }));

          const { error: gruposError } = await supabase
            .from("grupos_template")
            .insert(gruposParaSalvar);

          if (gruposError) {
            console.error("Erro ao salvar novos grupos:", gruposError);
            throw gruposError;
          }
        }
      }

      await carregarTemplates();

      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar template:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o template.",
        variant: "destructive",
      });
    }
  };

  const excluirTemplate = async (id: string) => {
    try {
      console.log("Excluindo template:", id);

      // Em vez de deletar, marcar como inativo
      const { error } = await supabase
        .from("templates_vistoria")
        .update({ ativo: false })
        .eq("id", id);

      if (error) {
        console.error("Erro ao excluir template:", error);
        throw error;
      }

      console.log("Template excluído:", id);
      setTemplates(prev => prev.filter(t => t.id !== id));

      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir template:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o template.",
        variant: "destructive",
      });
    }
  };

  const obterTemplateCompleto = async (id: string): Promise<TemplateVistoria | null> => {
    try {
      const { data, error } = await supabase
        .from("templates_vistoria")
        .select(
          `
          *,
          condominio:condominios(id, nome),
          grupos_template(*)
        `,
        )
        .eq("id", id)
        .eq("ativo", true)
        .single();

      if (error || !data) {
        console.error("Erro ao carregar template completo:", error);
        return null;
      }

      return {
        id: data.id,
        nome: data.nome,
        descricao: data.descricao,
        condominio_id: data.condominio_id,
        user_id: data.user_id,
        is_publico: data.is_publico,
        ativo: data.ativo,
        created_at: data.created_at,
        updated_at: data.updated_at,
        condominio: Array.isArray(data.condominio) ? data.condominio[0] : data.condominio,
        grupos: (data.grupos_template || [])
          .map(grupo => ({
            id: grupo.id,
            template_id: grupo.template_id,
            ambiente: grupo.ambiente,
            grupo: grupo.grupo,
            item: grupo.item,
            ordem: grupo.ordem || 0,
          }))
          .sort((a, b) => a.ordem - b.ordem),
      };
    } catch (error) {
      console.error("Erro ao obter template completo:", error);
      return null;
    }
  };

  // Filtrar templates
  const obterTemplatesPublicos = () => {
    return templates.filter(template => template.is_publico);
  };

  const obterTemplatesProprios = () => {
    return templates.filter(template => template.user_id === user?.id);
  };

  const obterTemplatesPorCondominio = (condominioId?: string) => {
    if (!condominioId) return templates;
    return templates.filter(
      template => !template.condominio_id || template.condominio_id === condominioId,
    );
  };

  return {
    templates,
    loading,
    criarTemplate,
    atualizarTemplate,
    excluirTemplate,
    obterTemplateCompleto,
    obterTemplatesPublicos,
    obterTemplatesProprios,
    obterTemplatesPorCondominio,
    recarregar: carregarTemplates,
  };
};
