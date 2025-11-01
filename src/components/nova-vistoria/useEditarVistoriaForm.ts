import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  VistoriaSupabase,
  GrupoVistoriaSupabase,
  useVistoriasSupabase,
} from "@/hooks/useVistoriasSupabase";
import { useCondominiosSupabase } from "@/hooks/useCondominiosSupabase";
import { useFotosSupabase, FotoUpload } from "@/hooks/useFotosSupabase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PatologiaResumo, registrarPatologiaFeedback } from "@/services/patologiaIA";

export const useEditarVistoriaForm = (vistoriaId: string, onBack?: () => void) => {
  const { toast } = useToast();
  const { condominios } = useCondominiosSupabase();
  const { recarregar } = useVistoriasSupabase();
  const { uploadFotos, uploading, uploadProgress } = useFotosSupabase();
  const { user } = useAuth();

  const [formData, setFormData] = useState<VistoriaSupabase>({
    condominio_id: "",
    numero_interno: "",
    id_sequencial: 0,
    data_vistoria: new Date().toISOString().split("T")[0],
    observacoes_gerais: "",
    responsavel: "",
    status: "Em Andamento",
    grupos: [
      {
        ambiente: "",
        grupo: "",
        item: "",
        status: "",
        parecer: "",
        ordem: 0,
      },
    ],
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grupoFotos, setGrupoFotos] = useState<{ [key: number]: FotoUpload[] }>({});
  const [gruposOriginais, setGruposOriginais] = useState<GrupoVistoriaSupabase[]>([]);
  const [fotosExistentesAtualizadas, setFotosExistentesAtualizadas] = useState<{
    [key: number]: Array<{
      id: string;
      descricao: string;
      iaFeedbackId?: string | null;
      iaResumo?: PatologiaResumo | null;
      foiEditado?: boolean;
    }>;
  }>({});

  // Função para carregar dados atualizados da vistoria
  const carregarVistoria = useCallback(async () => {
    try {
      console.log("Carregando vistoria para edição:", vistoriaId);

      const { data: vistoriaData, error } = await supabase
        .from("vistorias")
        .select(
          `
          *,
          condominio:condominios(id, nome),
          grupos_vistoria(
            *,
            fotos_vistoria(*)
          )
        `,
        )
        .eq("id", vistoriaId)
        .single();

      if (error) {
        console.error("Erro ao carregar vistoria:", error);
        throw error;
      }

      console.log("Vistoria carregada:", vistoriaData);

      // Formatar dados para o formulário
      const grupos = (vistoriaData.grupos_vistoria || []).map(grupo => ({
        id: grupo.id,
        vistoria_id: grupo.vistoria_id,
        ambiente: grupo.ambiente,
        grupo: grupo.grupo,
        item: grupo.item,
        status: grupo.status,
        parecer: grupo.parecer || "",
        ordem: grupo.ordem || 0,
        fotos: grupo.fotos_vistoria || [],
      }));

      const vistoriaFormatada: VistoriaSupabase = {
        id: vistoriaData.id,
        condominio_id: vistoriaData.condominio_id,
        user_id: vistoriaData.user_id,
        numero_interno: vistoriaData.numero_interno,
        id_sequencial: vistoriaData.id_sequencial,
        data_vistoria: vistoriaData.data_vistoria,
        observacoes_gerais: vistoriaData.observacoes_gerais,
        responsavel: vistoriaData.responsavel,
        status: vistoriaData.status,
        created_at: vistoriaData.created_at,
        updated_at: vistoriaData.updated_at,
        condominio: Array.isArray(vistoriaData.condominio)
          ? vistoriaData.condominio[0]
          : vistoriaData.condominio,
        grupos: grupos,
      };

      setFormData(vistoriaFormatada);
      setGruposOriginais(grupos);
    } catch (error) {
      console.error("Erro ao carregar vistoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a vistoria para edição.",
        variant: "destructive",
      });
    }
  }, [vistoriaId, toast]);

  // Carregar dados da vistoria
  useEffect(() => {
    if (vistoriaId) {
      setLoading(true);
      carregarVistoria().finally(() => setLoading(false));
    }
  }, [vistoriaId, carregarVistoria]);

  const handleInputChange = useCallback(
    (field: keyof VistoriaSupabase, value: string) => {
      if (field === "observacoes_gerais" && value.length > 150) {
        toast({
          title: "Limite de Caracteres Excedido",
          description: "As observações gerais devem ter no máximo 150 caracteres.",
          variant: "destructive",
        });
        return;
      }
      setFormData(prev => ({ ...prev, [field]: value }));
    },
    [toast],
  );

  const handleCondominioChange = useCallback((condominioId: string) => {
    setFormData(prev => ({ ...prev, condominio_id: condominioId }));
  }, []);

  const handleGrupoChange = useCallback(
    (grupoIndex: number, field: keyof GrupoVistoriaSupabase, value: string) => {
      if (field === "parecer" && value.length > 200) {
        toast({
          title: "Limite de Caracteres Excedido",
          description: "O parecer técnico deve ter no máximo 200 caracteres.",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        grupos: prev.grupos.map((grupo, index) =>
          index === grupoIndex ? { ...grupo, [field]: value } : grupo,
        ),
      }));
    },
    [toast],
  );

  const adicionarGrupo = useCallback(() => {
    const novoGrupo: GrupoVistoriaSupabase = {
      ambiente: "",
      grupo: "",
      item: "",
      status: "",
      parecer: "",
      ordem: formData.grupos.length,
    };
    setFormData(prev => ({
      ...prev,
      grupos: [...prev.grupos, novoGrupo],
    }));
  }, [formData.grupos.length]);

  const removerGrupo = useCallback(
    (grupoIndex: number) => {
      if (formData.grupos.length > 1) {
        setFormData(prev => ({
          ...prev,
          grupos: prev.grupos.filter((_, index) => index !== grupoIndex),
        }));
        setGrupoFotos(prev => {
          const newFotos = { ...prev };
          delete newFotos[grupoIndex];
          return newFotos;
        });
      }
    },
    [formData.grupos.length],
  );

  const handleFotosChange = useCallback(
    (grupoIndex: number, fotos: File[], fotosComDescricao?: FotoUpload[]) => {
      const fotosUpload =
        fotosComDescricao ||
        fotos.map(file => ({
          file,
          descricao: "",
          iaFeedbackId: null,
          iaResumo: null,
          foiEditado: false,
        }));
      setGrupoFotos(prev => ({
        ...prev,
        [grupoIndex]: fotosUpload as FotoUpload[],
      }));
    },
    [],
  );

  const handleFotosExistentesChange = useCallback(
    (
      grupoIndex: number,
      fotosAtualizadas: Array<{
        id: string;
        descricao: string;
        iaFeedbackId?: string | null;
        iaResumo?: PatologiaResumo | null;
        foiEditado?: boolean;
      }>,
    ) => {
      setFotosExistentesAtualizadas(prev => ({
        ...prev,
        [grupoIndex]: fotosAtualizadas.map(foto => ({
          id: foto.id,
          descricao: foto.descricao,
          iaFeedbackId: foto.iaFeedbackId ?? null,
          iaResumo: foto.iaResumo ?? null,
          foiEditado: foto.foiEditado ?? false,
        })),
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!formData.condominio_id) {
      toast({
        title: "Condomínio Obrigatório",
        description: "Por favor, selecione um condomínio.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.responsavel) {
      toast({
        title: "Responsável Obrigatório",
        description: "Por favor, selecione o responsável pela vistoria.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log("Atualizando vistoria...");

      // Atualizar dados da vistoria
      const { grupos, ...dadosVistoriaSemGrupos } = formData;
      const { error: vistoriaError } = await supabase
        .from("vistorias")
        .update({
          condominio_id: dadosVistoriaSemGrupos.condominio_id,
          data_vistoria: dadosVistoriaSemGrupos.data_vistoria,
          observacoes_gerais: dadosVistoriaSemGrupos.observacoes_gerais,
          responsavel: dadosVistoriaSemGrupos.responsavel,
          status: dadosVistoriaSemGrupos.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", vistoriaId);

      if (vistoriaError) {
        throw vistoriaError;
      }

      const condominioSelecionado = condominios.find(c => c.id === formData.condominio_id);

      // Atualizar ou criar grupos
      if (grupos && grupos.length > 0) {
        for (let i = 0; i < grupos.length; i++) {
          const grupo = grupos[i];
          const grupoOriginal = gruposOriginais[i];

          let grupoId = grupo.id;

          if (grupoOriginal && grupoOriginal.id) {
            // Atualizar grupo existente
            const { error: updateError } = await supabase
              .from("grupos_vistoria")
              .update({
                ambiente: grupo.ambiente,
                grupo: grupo.grupo,
                item: grupo.item,
                status: grupo.status,
                parecer: grupo.parecer || "",
                ordem: i,
              })
              .eq("id", grupoOriginal.id);

            if (updateError) {
              throw updateError;
            }
            grupoId = grupoOriginal.id;
          } else {
            // Criar novo grupo
            const { data: novoGrupo, error: createError } = await supabase
              .from("grupos_vistoria")
              .insert({
                vistoria_id: vistoriaId,
                ambiente: grupo.ambiente,
                grupo: grupo.grupo,
                item: grupo.item,
                status: grupo.status,
                parecer: grupo.parecer || "",
                ordem: i,
              })
              .select()
              .single();

            if (createError) {
              throw createError;
            }
            grupoId = novoGrupo.id;
          }

          // Upload das novas fotos para este grupo
          const novasFotos = grupoFotos[i];
          if (novasFotos && novasFotos.length > 0) {
            console.log(`Fazendo upload de ${novasFotos.length} novas fotos para grupo ${grupoId}`);
            await uploadFotos(grupoId, novasFotos, {
              vistoriaId,
              ambiente: grupo.ambiente,
              grupo: grupo.grupo,
              item: grupo.item,
              status: grupo.status,
              condominioId: condominioSelecionado?.id,
              condominioNome: condominioSelecionado?.nome,
            });
          }

          // Atualizar descrições das fotos existentes
          const fotosExistentesDoGrupo = fotosExistentesAtualizadas[i];
          if (fotosExistentesDoGrupo && fotosExistentesDoGrupo.length > 0) {
            console.log(
              `Atualizando descrições de ${fotosExistentesDoGrupo.length} fotos existentes para grupo ${grupoId}`,
            );
            for (const foto of fotosExistentesDoGrupo) {
              const { error: updateFotoError } = await supabase
                .from("fotos_vistoria")
                .update({ descricao: foto.descricao })
                .eq("id", foto.id);

              if (updateFotoError) {
                console.error("Erro ao atualizar descrição da foto:", updateFotoError);
              }

              try {
                if (foto.descricao && foto.descricao.trim().length > 0) {
                  await registrarPatologiaFeedback({
                    fotoId: foto.id,
                    grupoVistoriaId: grupoId,
                    vistoriaId,
                    usuarioId: user?.id,
                    descricao: foto.descricao,
                    origem: foto.iaFeedbackId ? "ia" : "usuario",
                    feedbackId: foto.iaFeedbackId ?? undefined,
                    foiEditado: foto.foiEditado,
                    resumo: foto.iaResumo ?? undefined,
                    ambiente: grupo.ambiente,
                    grupo: grupo.grupo,
                    item: grupo.item,
                    status: grupo.status,
                    condominioId: condominioSelecionado?.id,
                    condominioNome: condominioSelecionado?.nome,
                  });
                }
              } catch (registroErro) {
                console.error(
                  "Erro ao registrar feedback validado para foto existente:",
                  registroErro,
                );
              }
            }
          }
        }

        // Remover grupos que foram deletados (se houver menos grupos agora)
        if (gruposOriginais.length > grupos.length) {
          const gruposParaRemover = gruposOriginais.slice(grupos.length);
          for (const grupoRemover of gruposParaRemover) {
            if (grupoRemover.id) {
              const { error: deleteError } = await supabase
                .from("grupos_vistoria")
                .delete()
                .eq("id", grupoRemover.id);

              if (deleteError) {
                console.error("Erro ao remover grupo:", deleteError);
              }
            }
          }
        }
      }

      // Aguardar um pouco para garantir que todas as operações foram processadas
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recarregar os dados da vistoria para garantir que as mudanças sejam refletidas
      console.log("Recarregando dados da vistoria após salvar...");
      await carregarVistoria();

      // Recarregar lista de vistorias
      await recarregar();

      // Aguardar mais um pouco para garantir que os dados foram propagados
      await new Promise(resolve => setTimeout(resolve, 500));

      // Limpar fotos temporárias
      setGrupoFotos({});
      setFotosExistentesAtualizadas({});

      toast({
        title: "Sucesso",
        description: `Vistoria ${formData.numero_interno} atualizada com sucesso.`,
      });

      if (onBack) {
        // Aguardar antes de voltar para garantir que os dados estejam atualizados
        setTimeout(() => {
          onBack();
        }, 1000);
      }
    } catch (error) {
      console.error("Erro ao atualizar vistoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a vistoria.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    formData,
    grupoFotos,
    fotosExistentesAtualizadas,
    gruposOriginais,
    vistoriaId,
    uploadFotos,
    onBack,
    toast,
    recarregar,
    carregarVistoria,
    condominios,
    user?.id,
  ]);

  const handlePreview = useCallback(() => {
    if (!formData.condominio_id) {
      toast({
        title: "Condomínio Obrigatório",
        description: "Por favor, selecione um condomínio.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [formData.condominio_id, toast]);

  return {
    formData,
    saving,
    loading,
    grupoFotos,
    uploading,
    uploadProgress,
    handleInputChange,
    handleCondominioChange,
    handleGrupoChange,
    adicionarGrupo,
    removerGrupo,
    handleFotosChange,
    handleFotosExistentesChange,
    handleSave,
    handlePreview,
    carregarVistoria,
  };
};
