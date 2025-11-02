import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Eye, Plus, ArrowLeft } from "lucide-react";
import { useCondominiosSupabase } from "@/hooks/useCondominiosSupabase";
import { VistoriaSupabase } from "@/hooks/useVistoriasSupabase";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useAmbientesGrupos } from "@/hooks/useAmbientesGrupos";
import DadosBasicos from "./nova-vistoria/DadosBasicos";
import DadosMeteorologicos from "./nova-vistoria/DadosMeteorologicos";
import GrupoVistoria from "./nova-vistoria/GrupoVistoria";
import ObservacoesGerais from "./nova-vistoria/ObservacoesGerais";
import SeletorTemplate from "./nova-vistoria/SeletorTemplate";
import { useNovaVistoriaForm } from "./nova-vistoria/useNovaVistoriaForm";
import StyledLoader from "./StyledLoader";

interface NovaVistoriaSupabaseProps {
  onPreview?: (data: VistoriaSupabase) => void;
  onBack?: () => void;
}

const NovaVistoriaSupabase = ({ onPreview, onBack }: NovaVistoriaSupabaseProps) => {
  const { condominios, loading: loadingCondominios } = useCondominiosSupabase();
  const { obterUsuariosAtivos } = useUsuarios();
  const { obterAmbientesPorCondominio, obterGruposPorCondominio } = useAmbientesGrupos();
  const usuariosAtivos = obterUsuariosAtivos();

  const {
    formData,
    saving,
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
  } = useNovaVistoriaForm(onBack);

  // Obter ambientes e grupos baseados no condomínio selecionado
  const ambientesDisponiveis = obterAmbientesPorCondominio(formData.condominio_id).map(
    ambiente => ambiente.nome,
  );
  const gruposDisponiveis = obterGruposPorCondominio(formData.condominio_id).map(
    grupo => grupo.nome,
  );
  const statusOptions = ["N/A", "Conforme", "Não Conforme", "Requer Atenção"];

  const handlePreviewClick = () => {
    if (handlePreview() && onPreview) {
      onPreview(formData);
    }
  };

  if (loadingCondominios) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <StyledLoader />
        <p className="mt-6 text-sm text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Nova Vistoria</h2>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Save size={18} className="mr-2" />
            {saving ? "Salvando..." : "Salvar Vistoria"}
          </Button>
          {onPreview && (
            <Button onClick={handlePreviewClick} variant="outline">
              <Eye size={18} className="mr-2" />
              Visualizar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de Template */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Template de Vistoria</h3>
          <SeletorTemplate
            condominioId={formData.condominio_id}
            onTemplateSelected={carregarTemplate}
          />
        </div>
        <p className="text-sm text-gray-600">
          Use um template para pré-preencher os grupos de vistoria com itens padrão.
        </p>
      </div>

      {/* Dados Básicos */}
      <DadosBasicos
        condominios={condominios}
        usuariosAtivos={usuariosAtivos}
        formData={formData}
        onCondominioChange={handleCondominioChange}
        onInputChange={handleInputChange}
      />

      {/* Dados Meteorológicos */}
      <DadosMeteorologicos
        dadosMeteorologicos={dadosMeteorologicos}
        onBuscarDados={handleBuscarDadosMeteorologicos}
        loading={loadingWeather}
      />

      {/* Grupos de Vistoria */}
      {formData.grupos.map((grupo, index) => {
        const condominioAtual = condominios.find(c => c.id === formData.condominio_id);
        return (
          <GrupoVistoria
            key={index}
            grupo={grupo}
            index={index}
            ambientesDisponiveis={ambientesDisponiveis}
            gruposDisponiveis={gruposDisponiveis}
            statusOptions={statusOptions}
            canRemove={formData.grupos.length > 1}
            onGrupoChange={handleGrupoChange}
            onRemoverGrupo={removerGrupo}
            onFotosChange={handleFotosChange}
            condominioInfo={
              condominioAtual ? { id: condominioAtual.id, nome: condominioAtual.nome } : undefined
            }
            responsavel={formData.responsavel}
          />
        );
      })}

      {/* Botão para adicionar novo grupo */}
      <div className="flex justify-center">
        <Button onClick={adicionarGrupo} variant="outline" size="lg">
          <Plus size={18} className="mr-2" />
          Adicionar Novo Grupo de Vistoria
        </Button>
      </div>

      {/* Observações Gerais */}
      <ObservacoesGerais
        observacoes={formData.observacoes_gerais || ""}
        onObservacoesChange={value => handleInputChange("observacoes_gerais", value)}
      />
    </div>
  );
};

export default NovaVistoriaSupabase;
