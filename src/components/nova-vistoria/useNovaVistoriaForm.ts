import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  VistoriaSupabase,
  GrupoVistoriaSupabase,
  useVistoriasSupabase,
} from "@/hooks/useVistoriasSupabase";
import { useCondominiosSupabase } from "@/hooks/useCondominiosSupabase";
import { useFotosSupabase, FotoUpload } from "@/hooks/useFotosSupabase";
import { useWeatherData, WeatherData } from "@/hooks/useWeatherData";
import { TemplateVistoria } from "@/hooks/useTemplatesVistoria";
import { supabase } from "@/integrations/supabase/client";

export const useNovaVistoriaForm = (onBack?: () => void) => {
  const { toast } = useToast();
  const { condominios } = useCondominiosSupabase();
  const { salvarVistoria, obterProximoNumeroSequencial } = useVistoriasSupabase();
  const { uploadFotos, uploading, uploadProgress } = useFotosSupabase();
  const { buscarDadosMeteorologicos, loading: loadingWeather } = useWeatherData();

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
  const [grupoFotos, setGrupoFotos] = useState<{ [key: number]: FotoUpload[] }>({});
  const [dadosMeteorologicos, setDadosMeteorologicos] = useState<WeatherData | null>(null);

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

  const handleCondominioChange = useCallback(
    async (condominioId: string) => {
      const condominio = condominios.find(c => c.id === condominioId);
      if (condominio) {
        const proximoNumero = await obterProximoNumeroSequencial(condominioId);
        setFormData(prev => ({
          ...prev,
          condominio_id: condominioId,
          id_sequencial: proximoNumero,
          numero_interno: `${new Date().getFullYear()}-${proximoNumero.toString().padStart(4, "0")}`,
        }));
      }
    },
    [condominios, obterProximoNumeroSequencial],
  );

  const handleBuscarDadosMeteorologicos = useCallback(async () => {
    if (!formData.data_vistoria) {
      toast({
        title: "Data da Vistoria",
        description: "Por favor, selecione a data da vistoria primeiro.",
        variant: "destructive",
      });
      return;
    }

    const condominio = condominios.find(c => c.id === formData.condominio_id);
    const cidade = condominio?.cidade || "São Paulo";

    const dados = await buscarDadosMeteorologicos(formData.data_vistoria, cidade);
    if (dados) {
      setDadosMeteorologicos(dados);
    }
  }, [
    formData.data_vistoria,
    formData.condominio_id,
    condominios,
    buscarDadosMeteorologicos,
    toast,
  ]);

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
        // Remover fotos do grupo removido
        setGrupoFotos(prev => {
          const newFotos = { ...prev };
          delete newFotos[grupoIndex];
          // Re-indexar fotos dos grupos posteriores
          const updatedFotos: { [key: number]: FotoUpload[] } = {};
          Object.keys(newFotos).forEach(key => {
            const numKey = parseInt(key);
            if (numKey > grupoIndex) {
              updatedFotos[numKey - 1] = newFotos[numKey];
            } else {
              updatedFotos[numKey] = newFotos[numKey];
            }
          });
          return updatedFotos;
        });
      }
    },
    [formData.grupos.length],
  );

  const handleFotosChange = useCallback(
    (grupoIndex: number, fotos: File[], fotosComDescricao?: FotoUpload[]) => {
      console.log(`=== handleFotosChange NOVA VISTORIA (SIMPLIFICADA) ===`);
      console.log(`Grupo: ${grupoIndex}`);
      console.log(`Arquivos recebidos:`, fotos?.length || 0);

      // Se não há fotos, limpar estado
      if (!fotos || fotos.length === 0) {
        console.log("Nenhuma foto, limpando estado do grupo");
        setGrupoFotos(prev => {
          const updated = { ...prev };
          delete updated[grupoIndex];
          return updated;
        });
        return;
      }

      // Criar FotoUpload diretamente - SEM VALIDAÇÕES EXCESSIVAS
      const fotosFonte =
        fotosComDescricao && fotosComDescricao.length === fotos.length
          ? fotosComDescricao
          : fotos.map(file => ({
              file,
              descricao: "",
              iaFeedbackId: null,
              iaResumo: null,
              foiEditado: false,
            }));

      const fotosParaEstado: FotoUpload[] = fotosFonte.map((foto, index) => {
        const file = foto.file ?? fotos[index];
        const descricao = foto.descricao || "";
        console.log(`Criando FotoUpload ${index + 1}:`, {
          nome: file.name,
          tamanho: file.size,
          descricao: descricao,
        });

        return {
          file,
          descricao,
          iaFeedbackId: foto.iaFeedbackId ?? null,
          iaResumo: foto.iaResumo ?? null,
          foiEditado: foto.foiEditado ?? false,
        };
      });

      console.log(`Salvando ${fotosParaEstado.length} fotos no estado para grupo ${grupoIndex}`);

      // Atualizar estado diretamente
      setGrupoFotos(prev => ({
        ...prev,
        [grupoIndex]: fotosParaEstado,
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    console.log("=== INICIANDO SALVAMENTO NOVA VISTORIA ===");
    console.log("FormData:", formData);
    console.log("GrupoFotos estado atual:", grupoFotos);
    console.log("Dados meteorológicos:", dadosMeteorologicos);

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
      console.log("Salvando vistoria...");
      const condominioSelecionado = condominios.find(c => c.id === formData.condominio_id);

      // Incluir dados meteorológicos nas observações se existirem
      let observacoesComClima = formData.observacoes_gerais || "";
      if (dadosMeteorologicos) {
        const climaInfo = `\n\nDados Meteorológicos: ${dadosMeteorologicos.condicao}, ${dadosMeteorologicos.temperatura}°C, Chuva: ${dadosMeteorologicos.precipitacao}mm, Vento: ${dadosMeteorologicos.velocidade_vento}km/h`;
        observacoesComClima = (observacoesComClima + climaInfo).substring(0, 150);
      }

      const vistoriaParaSalvar = {
        ...formData,
        observacoes_gerais: observacoesComClima,
      };

      const vistoriaSalva = await salvarVistoria(vistoriaParaSalvar);

      if (!vistoriaSalva || !vistoriaSalva.id) {
        throw new Error("Erro ao salvar vistoria - ID não retornado");
      }

      console.log("Vistoria salva com ID:", vistoriaSalva.id);

      // Verificar se há fotos para upload
      const gruposComFotos = Object.entries(grupoFotos).filter(
        ([_, fotos]) => fotos && fotos.length > 0,
      );
      console.log(`Grupos com fotos: ${gruposComFotos.length}`);

      if (gruposComFotos.length > 0) {
        console.log("Buscando grupos salvos no banco...");

        const { data: gruposSalvos, error: gruposError } = await supabase
          .from("grupos_vistoria")
          .select("id, ordem")
          .eq("vistoria_id", vistoriaSalva.id)
          .order("ordem");

        if (gruposError) {
          console.error("Erro ao buscar grupos salvos:", gruposError);
          throw gruposError;
        }

        console.log("Grupos salvos encontrados:", gruposSalvos);

        // Upload das fotos
        let totalFotosUpload = 0;
        for (const [grupoIndexStr, fotos] of gruposComFotos) {
          const grupoIndex = parseInt(grupoIndexStr);
          const grupoSalvo = gruposSalvos?.find(g => g.ordem === grupoIndex);

          if (!grupoSalvo) {
            console.warn(`Grupo salvo não encontrado para ordem ${grupoIndex}`);
            continue;
          }

          console.log(
            `Fazendo upload de ${fotos.length} fotos para grupo ${grupoSalvo.id} (ordem ${grupoIndex})`,
          );

          // Log detalhado das fotos antes do upload
          fotos.forEach((foto, fotoIndex) => {
            console.log(`Foto ${fotoIndex + 1} para upload:`, {
              hasFile: !!foto.file,
              fileName: foto.file?.name,
              fileSize: foto.file?.size,
              fileType: foto.file?.type,
              isFileInstance: foto.file instanceof File,
              descricao: foto.descricao,
            });
          });

          try {
            const grupoFormulario = formData.grupos[grupoIndex] || null;

            await uploadFotos(grupoSalvo.id, fotos, {
              vistoriaId: vistoriaSalva.id,
              ambiente: grupoFormulario?.ambiente,
              grupo: grupoFormulario?.grupo,
              item: grupoFormulario?.item,
              status: grupoFormulario?.status,
              condominioId: condominioSelecionado?.id,
              condominioNome: condominioSelecionado?.nome,
            });
            totalFotosUpload += fotos.length;
            console.log(`Upload concluído para grupo ${grupoSalvo.id}: ${fotos.length} fotos`);
          } catch (uploadError) {
            console.error(`Erro no upload de fotos para grupo ${grupoSalvo.id}:`, uploadError);
            toast({
              title: "Erro no Upload",
              description: `Erro ao enviar fotos do grupo ${grupoIndex + 1}. Algumas fotos podem não ter sido salvas.`,
              variant: "destructive",
            });
          }
        }

        if (totalFotosUpload > 0) {
          toast({
            title: "Sucesso Completo",
            description: `Vistoria ${formData.numero_interno} salva com ${totalFotosUpload} foto(s) e dados meteorológicos.`,
          });
        } else {
          toast({
            title: "Vistoria Salva",
            description: `Vistoria ${formData.numero_interno} salva com dados meteorológicos.`,
          });
        }
      } else {
        toast({
          title: "Vistoria Salva",
          description: `Vistoria ${formData.numero_interno} salva${dadosMeteorologicos ? " com dados meteorológicos" : ""}.`,
        });
      }

      // Limpar formulário
      setFormData({
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
      setGrupoFotos({});
      setDadosMeteorologicos(null);

      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error("Erro ao salvar vistoria:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a vistoria. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    formData,
    grupoFotos,
    dadosMeteorologicos,
    salvarVistoria,
    uploadFotos,
    onBack,
    toast,
    condominios,
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

  const carregarTemplate = useCallback(
    async (template: TemplateVistoria) => {
      try {
        console.log("Carregando template:", template);

        // Se o template tem condomínio específico, usar ele
        if (template.condominio_id) {
          await handleCondominioChange(template.condominio_id);
        }

        // Converter grupos do template para grupos de vistoria
        const gruposDoTemplate: GrupoVistoriaSupabase[] = (template.grupos || []).map(
          (grupo, index) => ({
            ambiente: grupo.ambiente,
            grupo: grupo.grupo,
            item: grupo.item,
            status: "", // Status será preenchido pelo usuário
            parecer: "", // Parecer será preenchido pelo usuário
            ordem: index,
          }),
        );

        // Se não há grupos no template, manter pelo menos um grupo vazio
        const gruposParaUsar =
          gruposDoTemplate.length > 0
            ? gruposDoTemplate
            : [
                {
                  ambiente: "",
                  grupo: "",
                  item: "",
                  status: "",
                  parecer: "",
                  ordem: 0,
                },
              ];

        setFormData(prev => ({
          ...prev,
          grupos: gruposParaUsar,
          template_usado_id: template.id,
        }));

        // Limpar fotos existentes
        setGrupoFotos({});

        toast({
          title: "Template Carregado",
          description: `Template "${template.nome}" aplicado com ${gruposParaUsar.length} grupo(s).`,
        });
      } catch (error) {
        console.error("Erro ao carregar template:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o template.",
          variant: "destructive",
        });
      }
    },
    [handleCondominioChange, toast],
  );

  return {
    formData,
    saving,
    grupoFotos,
    uploading,
    uploadProgress,
    dadosMeteorologicos,
    loadingWeather,
    handleInputChange,
    handleCondominioChange,
    handleGrupoChange,
    adicionarGrupo,
    removerGrupo,
    handleFotosChange,
    handleBuscarDadosMeteorologicos,
    handleSave,
    handlePreview,
    carregarTemplate,
  };
};
