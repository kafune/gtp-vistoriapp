import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Calendar, Building, User, FileText, Edit } from "lucide-react";
import { VistoriaSupabase } from "@/hooks/useVistoriasSupabase";
import { supabase } from "@/integrations/supabase/client";
import FotosVistoria from "./FotosVistoria";
import PreviewPDFSupabase from "./PreviewPDFSupabase";

interface DetalhesVistoriaProps {
  vistoria: VistoriaSupabase;
  onBack: () => void;
  onEdit?: (vistoriaId: string) => void;
}

const DetalhesVistoria = ({ vistoria: vistoriaInicial, onBack, onEdit }: DetalhesVistoriaProps) => {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [vistoria, setVistoria] = useState(vistoriaInicial);
  const [reloadKey, setReloadKey] = useState(0);

  // Função para recarregar dados da vistoria
  const recarregarVistoria = useCallback(async () => {
    try {
      console.log("Recarregando dados da vistoria:", vistoria.id);

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
        .eq("id", vistoria.id!)
        .single();

      if (error) {
        console.error("Erro ao recarregar vistoria:", error);
        return;
      }

      // Formatar dados
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

      const vistoriaAtualizada: VistoriaSupabase = {
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

      setVistoria(vistoriaAtualizada);
      setReloadKey(prev => prev + 1); // Força rerender dos componentes filhos
      console.log("Vistoria recarregada com sucesso:", vistoriaAtualizada);
    } catch (error) {
      console.error("Erro ao recarregar vistoria:", error);
    }
  }, [vistoria.id]);

  // Recarregar quando a vistoria inicial mudar
  useEffect(() => {
    setVistoria(vistoriaInicial);
    setReloadKey(prev => prev + 1);
  }, [vistoriaInicial]);

  // Recarregar dados quando a página for focada (usuário voltar da edição)
  useEffect(() => {
    const handleFocus = () => {
      recarregarVistoria();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [vistoria.id, recarregarVistoria]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Conforme":
        return "bg-green-100 text-green-800";
      case "Não Conforme":
        return "bg-red-100 text-red-800";
      case "Requer Atenção":
        return "bg-yellow-100 text-yellow-800";
      case "Em Andamento":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (showPDFPreview) {
    return (
      <PreviewPDFSupabase
        key={`pdf-${reloadKey}`}
        vistoria={vistoria}
        onBack={() => setShowPDFPreview(false)}
      />
    );
  }

  return (
    <div className="space-y-6" key={`detalhes-${reloadKey}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vistoria.condominio?.nome}</h1>
            <p className="text-gray-600">Vistoria #{vistoria.numero_interno}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {onEdit && vistoria.id && (
            <Button variant="outline" onClick={() => onEdit(vistoria.id!)}>
              <Edit size={16} className="mr-2" />
              Editar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              recarregarVistoria().then(() => {
                setShowPDFPreview(true);
              });
            }}
          >
            <Download size={16} className="mr-2" />
            Gerar PDF
          </Button>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2" size={20} />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="text-teal-600" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-600">Data da Vistoria</p>
                <p className="text-gray-900">{formatDate(vistoria.data_vistoria)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="text-teal-600" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-600">Responsável</p>
                <p className="text-gray-900">{vistoria.responsavel}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="text-teal-600" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-600">ID Sequencial</p>
                <p className="text-gray-900">{vistoria.id_sequencial}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className={getStatusColor(vistoria.status)}>{vistoria.status}</Badge>
              </div>
            </div>
          </div>

          {vistoria.observacoes_gerais && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Observações Gerais</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{vistoria.observacoes_gerais}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grupos de Vistoria */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">
          Grupos de Vistoria ({vistoria.grupos.length})
        </h2>

        {vistoria.grupos.map((grupo, index) => (
          <Card key={`${grupo.id}-${reloadKey}-${index}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Grupo {index + 1}: {grupo.ambiente} - {grupo.grupo}
                </span>
                <Badge className={getStatusColor(grupo.status)}>{grupo.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Item</p>
                  <p className="text-gray-900">{grupo.item}</p>
                </div>
              </div>

              {grupo.parecer && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Parecer Técnico</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{grupo.parecer}</p>
                </div>
              )}

              <Separator />

              <FotosVistoria
                key={`fotos-${grupo.id}-${reloadKey}`}
                fotos={grupo.fotos || []}
                grupoNome={`${grupo.ambiente} - ${grupo.grupo}`}
                grupoIndex={index}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DetalhesVistoria;
