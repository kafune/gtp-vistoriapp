import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Eye, Plus, ArrowLeft } from "lucide-react";
import { useCondominiosSupabase } from "@/hooks/useCondominiosSupabase";
import { VistoriaSupabase } from "@/hooks/useVistoriasSupabase";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useAmbientesGrupos } from "@/hooks/useAmbientesGrupos";
import DadosBasicos from "./nova-vistoria/DadosBasicos";
import GrupoVistoria from "./nova-vistoria/GrupoVistoria";
import ObservacoesGerais from "./nova-vistoria/ObservacoesGerais";
import { useEditarVistoriaForm } from "./nova-vistoria/useEditarVistoriaForm";

interface EditarVistoriaSupabaseProps {
  vistoriaId: string;
  onPreview?: (data: VistoriaSupabase) => void;
  onBack?: () => void;
}

const EditarVistoriaSupabase = ({ vistoriaId, onPreview, onBack }: EditarVistoriaSupabaseProps) => {
  const { condominios, loading: loadingCondominios } = useCondominiosSupabase();
  const { obterUsuariosAtivos } = useUsuarios();
  const { obterAmbientesPorCondominio, obterGruposPorCondominio } = useAmbientesGrupos();
  const usuariosAtivos = obterUsuariosAtivos();

  const {
    formData,
    saving,
    loading,
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
  } = useEditarVistoriaForm(vistoriaId, onBack);

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

  if (loading || loadingCondominios) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-foreground">Carregando vistoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Editar Vistoria</h2>
            <p className="text-gray-600">#{formData.numero_interno}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Save size={18} className="mr-2" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
          {onPreview && (
            <Button onClick={handlePreviewClick} variant="outline">
              <Eye size={18} className="mr-2" />
              Visualizar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Dados Básicos */}
      <DadosBasicos
        condominios={condominios}
        usuariosAtivos={usuariosAtivos}
        formData={formData}
        onCondominioChange={handleCondominioChange}
        onInputChange={handleInputChange}
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
            isEditing={true}
            onGrupoChange={handleGrupoChange}
            onRemoverGrupo={removerGrupo}
            onFotosChange={handleFotosChange}
            onFotosExistentesChange={handleFotosExistentesChange}
            vistoriaId={vistoriaId}
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

export default EditarVistoriaSupabase;
