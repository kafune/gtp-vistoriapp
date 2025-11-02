import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  VistoriaSupabase,
  ChecklistTecnico,
  FotoVistoriaSupabase,
} from "@/hooks/useVistoriasSupabase";
import { usePDFGenerator } from "@/hooks/usePDFGenerator";
import PreviewPDFSupabase from "@/components/visualizar-vistoria/PreviewPDFSupabase";
import StyledLoader from "@/components/StyledLoader";

interface SupabaseGrupoRow {
  id: string;
  vistoria_id: string;
  ambiente: string;
  grupo: string;
  item: string;
  status: string;
  parecer?: string | null;
  ordem?: number | null;
  fotos_vistoria?: FotoVistoriaSupabase[] | null;
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
  grupos_vistoria?: SupabaseGrupoRow[] | null;
}

interface PdfAccessLink {
  id: string;
  token: string;
  vistoria_id: string;
  expires_at: string;
  acessado_em?: string | null;
  acessos_count?: number | null;
  vistoria: SupabaseVistoriaRow;
}

const PDFAccess = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportRef, generatePDF } = usePDFGenerator();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistoria, setVistoria] = useState<VistoriaSupabase | null>(null);
  const [linkInfo, setLinkInfo] = useState<PdfAccessLink | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token de acesso inválido");
      setLoading(false);
      return;
    }

    const verificarAcesso = async () => {
      try {
        console.log("Verificando acesso para token:", token);

        // Verificar se o token existe e é válido
        const { data: linkData, error: linkError } = await supabase
          .from("pdf_access_links")
          .select(
            `
            *,
            vistoria:vistorias(
              *,
              condominio:condominios(id, nome),
              grupos_vistoria(
                *,
                fotos_vistoria(*)
              )
            )
          `,
          )
          .eq("token", token)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (linkError || !linkData) {
          console.error("Erro ao verificar link:", linkError);
          setError("Link inválido ou expirado");
          setLoading(false);
          return;
        }

        console.log("Link válido encontrado:", linkData);
        const typedLinkData = linkData as PdfAccessLink;
        setLinkInfo(typedLinkData);

        // Processar dados da vistoria
        const vistoriaData = typedLinkData.vistoria;
        const grupos = (vistoriaData.grupos_vistoria || []).map(
          (grupo): VistoriaSupabase["grupos"][number] => {
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
              fotos: grupo.fotos_vistoria || [],
              modo_checklist: Boolean(grupo.modo_checklist),
              checklist_tecnico: checklist,
            };
          },
        );

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
            : (vistoriaData.condominio ?? undefined),
          grupos: grupos,
        };

        setVistoria(vistoriaFormatada);

        // Registrar acesso
        await supabase
          .from("pdf_access_links")
          .update({
            acessado_em: new Date().toISOString(),
            acessos_count: (typedLinkData.acessos_count || 0) + 1,
          })
          .eq("id", typedLinkData.id);

        setLoading(false);
      } catch (err) {
        console.error("Erro ao verificar acesso:", err);
        setError("Erro ao carregar dados");
        setLoading(false);
      }
    };

    verificarAcesso();
  }, [token]);

  const handleDownloadPDF = async () => {
    if (!vistoria) return;

    try {
      await generatePDF(vistoria);
      toast({
        title: "PDF Baixado",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto">
          <div className="flex flex-col items-center text-center">
            <StyledLoader />
            <p className="mt-4 text-gray-600">Verificando acesso...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Voltar ao Início
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!vistoria) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Dados não encontrados</h2>
            <p className="text-gray-600">Não foi possível carregar os dados da vistoria.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de acesso público */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img
                src="/lovable-uploads/9e07dcd0-b996-4996-9028-7daeb90e3140.png"
                alt="Logo GTP"
                className="w-8 h-8 object-contain"
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Sistema de Vistorias GTP</h1>
                <p className="text-sm text-gray-500">Acesso ao Relatório PDF</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Acesso Válido</span>
              </div>
              <Button
                onClick={handleDownloadPDF}
                className="bg-brand-green hover:bg-brand-green-light"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Informações do acesso */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Acesso Autorizado</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>
                  <strong>Enviado para:</strong> {linkInfo?.email_enviado_para}
                </p>
                <p>
                  <strong>Expira em:</strong>{" "}
                  {new Date(linkInfo?.expires_at).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(linkInfo?.expires_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p>
                  <strong>Acessos:</strong> {linkInfo?.acessos_count || 0} vez(es)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Preview do PDF */}
        <div className="bg-white rounded-lg shadow">
          <PreviewPDFSupabase vistoria={vistoria} onBack={() => navigate("/")} />
        </div>
      </div>
    </div>
  );
};

export default PDFAccess;
