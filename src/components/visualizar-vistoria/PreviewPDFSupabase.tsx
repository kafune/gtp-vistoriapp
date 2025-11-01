import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Mail } from "lucide-react";
import { VerificacaoEnvioEmail } from "@/components/email/VerificacaoEnvioEmail";
import { useToast } from "@/hooks/use-toast";
import type {
  VistoriaSupabase,
  GrupoVistoriaSupabase,
  FotoVistoriaSupabase,
  ChecklistTecnico,
} from "@/hooks/useVistoriasSupabase";
import { usePDFGenerator } from "@/hooks/usePDFGenerator";
import { useChecklistVistoria } from "@/hooks/useChecklistVistoria";
import { supabase } from "@/integrations/supabase/client";
import PdfPage from "@/components/pdf/PdfPage";
import PdfReportHeader from "@/components/pdf/PdfReportHeader";
import PdfReportInfo from "@/components/pdf/PdfReportInfo";
import PdfFooter from "@/components/pdf/PdfFooter";

interface PreviewPDFSupabaseProps {
  vistoria: VistoriaSupabase;
  onBack: () => void;
}

type PageVariant = "summary" | "no-photos" | "first" | "continuation";

interface PageDescriptor {
  key: string;
  variant: PageVariant;
  grupo?: GrupoVistoriaSupabase;
  groupIndex?: number;
  photos?: FotoVistoriaSupabase[];
  startIndex?: number;
}

interface GrupoVistoriaRow {
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

const PreviewPDFSupabase = ({ vistoria: vistoriaInicial, onBack }: PreviewPDFSupabaseProps) => {
  const { toast } = useToast();
  const { reportRef, generatePDF } = usePDFGenerator();
  const { sistemasDisponiveis } = useChecklistVistoria();
  const [vistoria, setVistoria] = useState(vistoriaInicial);
  const [mostrarVerificacaoEmail, setMostrarVerificacaoEmail] = useState(false);
  const pages = useMemo<PageDescriptor[]>(() => {
    const grupos = vistoria.grupos || [];

    if (grupos.length === 0) {
      return [
        {
          key: "summary",
          variant: "summary",
          photos: [],
        },
      ];
    }

    return grupos.flatMap<PageDescriptor>((grupo, groupIndex) => {
      const fotos = Array.isArray(grupo.fotos) ? (grupo.fotos as FotoVistoriaSupabase[]) : [];

      if (fotos.length === 0) {
        return [
          {
            key: `${grupo.id}-no-fotos`,
            variant: "no-photos",
            grupo,
            groupIndex,
            photos: [],
          },
        ];
      }

      const firstPage: PageDescriptor = {
        key: `${grupo.id}-0`,
        variant: "first",
        grupo,
        groupIndex,
        photos: fotos.slice(0, 2),
        startIndex: 0,
      };

      const continuationPages = [] as PageDescriptor[];
      for (let i = 2; i < fotos.length; i += 2) {
        continuationPages.push({
          key: `${grupo.id}-cont-${i}`,
          variant: "continuation",
          grupo,
          groupIndex,
          photos: fotos.slice(i, i + 2),
          startIndex: i,
        });
      }

      return [firstPage, ...continuationPages];
    });
  }, [vistoria.grupos]);
  const totalPages = Math.max(pages.length, 1);

  // Recarregar dados mais recentes quando o componente montar
  useEffect(() => {
    let isMounted = true;
    const carregarDadosAtualizados = async () => {
      try {
        console.log("Carregando dados atualizados para PDF:", vistoriaInicial.id);

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
          .eq("id", vistoriaInicial.id!)
          .single();

        if (error) {
          console.error("Erro ao carregar dados atualizados:", error);
          return;
        }

        const grupos = (vistoriaData.grupos_vistoria || []).map((grupo: GrupoVistoriaRow) => {
          const checklistData =
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
            // Campos do checklist técnico
            modo_checklist: grupo.modo_checklist || false,
            checklist_tecnico: checklistData,
          } as GrupoVistoriaSupabase;
        });

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

        if (isMounted) {
          setVistoria(vistoriaAtualizada);
          console.log("Dados atualizados carregados para PDF:", vistoriaAtualizada);
        }
      } catch (error) {
        console.error("Erro ao carregar dados atualizados:", error);
      }
    };

    carregarDadosAtualizados();

    return () => {
      isMounted = false;
    };
  }, [vistoriaInicial.id]);

  const formatDate = (dateString: string) => {
    console.log("=== formatDate Debug ===");
    console.log("dateString recebido:", dateString);

    // Parse a data como local para evitar problemas de timezone
    const [year, month, day] = dateString.split("-");
    console.log("Componentes da data:", { year, month, day });

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    console.log("Data criada:", date);
    console.log("Data formatada:", date.toLocaleDateString("pt-BR"));

    return date.toLocaleDateString("pt-BR");
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleConfirmarEnvioEmail = async (dadosEnvio: {
    vistoriaId: string;
    emailPrincipal: string;
    emailsCopia: string[];
    nomeCondominio: string;
    numeroInterno: string;
    dataVistoria: string;
  }) => {
    try {
      console.log("=== DADOS ANTES DO ENVIO ===");
      console.log("Dados enviados para a função:", dadosEnvio);
      console.log("emailsCopia tipo:", typeof dadosEnvio.emailsCopia);
      console.log("emailsCopia é array:", Array.isArray(dadosEnvio.emailsCopia));
      console.log("emailsCopia valor:", dadosEnvio.emailsCopia);
      console.log("emailsCopia length:", dadosEnvio.emailsCopia?.length);
      console.log("===========================");

      const { data, error } = await supabase.functions.invoke("enviar-email-pdf", {
        body: {
          ...dadosEnvio,
          // Garantir que emailsCopia seja sempre um array
          emailsCopia: Array.isArray(dadosEnvio.emailsCopia) ? dadosEnvio.emailsCopia : [],
        },
      });

      if (error) {
        console.error("Erro ao enviar email:", error);
        toast({
          title: "Erro",
          description: "Erro ao enviar email. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      console.log("Resposta da função:", data);

      if (data.success) {
        toast({
          title: "Email Enviado",
          description: `Relatório enviado com sucesso para ${data.destinatarios.length} destinatário(s).`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro desconhecido ao enviar email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      toast({
        title: "Erro",
        description: "Erro interno. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const renderTabelaGrupo = (grupo: GrupoVistoriaSupabase, grupoIndex: number) => {
    // Se for modo checklist técnico, renderizar informações estruturadas
    if (grupo.modo_checklist && grupo.checklist_tecnico) {
      const checklist = grupo.checklist_tecnico;
      const sistema = sistemasDisponiveis.find(s => s.id === checklist.sistemaId);
      const elemento = sistema?.elementos.find(e => e.id === checklist.elementoId);
      const manifestacoesSelecionadas =
        elemento?.manifestacoes.filter(m => checklist.manifestacoesIds?.includes(m.id)) || [];

      return (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-1 text-brand-purple">
            Sistema de Vistoria {grupoIndex + 1} -{" "}
            <span className="text-xs bg-blue-100 px-1 py-0.5 rounded">Checklist Técnico</span>
          </h3>

          {/* Informações Técnicas Estruturadas */}
          <div className="bg-blue-50 p-2 rounded-lg mb-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-semibold text-blue-800">Sistema:</span>
                <br />
                {sistema?.nome || "Não informado"}
              </div>
              <div>
                <span className="font-semibold text-blue-800">Elemento:</span>
                <br />
                {elemento?.nome || "Não informado"}
              </div>
              <div>
                <span className="font-semibold text-blue-800">Tipo de Material:</span>
                <br />
                {checklist.tipo || "Não informado"}
              </div>
              <div>
                <span className="font-semibold text-blue-800">Status:</span>
                <br />
                <span
                  className={`inline-block px-1 py-0.5 rounded text-xs ${
                    grupo.status === "N/A"
                      ? "bg-gray-200"
                      : grupo.status === "Conforme"
                        ? "bg-brand-green text-white"
                        : grupo.status === "Não Conforme"
                          ? "bg-red-200 text-red-800"
                          : "bg-yellow-200 text-yellow-800"
                  }`}
                >
                  {grupo.status}
                </span>
              </div>
            </div>
          </div>

          {/* Manifestações Patológicas */}
          {manifestacoesSelecionadas.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-1 text-red-600">
                Manifestações Patológicas Identificadas:
              </h4>
              <div className="space-y-1">
                {manifestacoesSelecionadas.map((manifestacao, index) => (
                  <div
                    key={manifestacao.id}
                    className="bg-red-50 p-2 rounded border-l-4 border-red-400"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-xs bg-red-100 px-2 py-1 rounded text-red-700 min-w-fit">
                        {manifestacao.codigo}
                      </span>
                      <span className="text-xs text-gray-700 leading-tight">
                        {manifestacao.descricao}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações Técnicas */}
          {checklist.observacoesTecnicas && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-1 text-gray-700">Observações Técnicas:</h4>
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded leading-tight">
                {checklist.observacoesTecnicas}
              </p>
            </div>
          )}

          {/* Parecer Geral (se existir) */}
          {grupo.parecer && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold mb-1 text-gray-700">Parecer Geral:</h4>
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded leading-tight">
                {truncateText(grupo.parecer, 200)}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Modo tradicional - tabela original
    return (
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2 text-brand-purple">
          Sistema de Vistoria {grupoIndex + 1}
        </h3>
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-brand-purple text-white">
              <th className="border border-gray-300 p-2 text-center w-[15%]">Ambiente</th>
              <th className="border border-gray-300 p-2 text-center w-[15%]">Sistema</th>
              <th className="border border-gray-300 p-2 text-center w-[15%]">Subsistema</th>
              <th className="border border-gray-300 p-2 text-center w-[12%]">Status</th>
              <th className="border border-gray-300 p-2 text-center w-[43%]">Parecer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 text-center align-middle">
                {grupo.ambiente}
              </td>
              <td className="border border-gray-300 p-2 text-center align-middle">{grupo.grupo}</td>
              <td className="border border-gray-300 p-2 text-center align-middle">{grupo.item}</td>
              <td className="border border-gray-300 p-2 text-center align-middle">
                <div className="flex justify-center items-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      grupo.status === "N/A"
                        ? "bg-gray-200"
                        : grupo.status === "Conforme"
                          ? "bg-brand-green text-white"
                          : grupo.status === "Não Conforme"
                            ? "bg-red-200 text-red-800"
                            : "bg-yellow-200 text-yellow-800"
                    }`}
                  >
                    {grupo.status}
                  </span>
                </div>
              </td>
              <td className="border border-gray-300 p-2 text-center align-middle break-words">
                {truncateText(grupo.parecer, 200)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const dataEmissaoAtual = new Date().toLocaleDateString("pt-BR");
  const horaAtual = getCurrentTime();
  const dataHoraEmissao = `${dataEmissaoAtual} às ${horaAtual}`;

  const renderObservacoesGerais = () =>
    vistoria.observacoes_gerais && (
      <div className="mb-2">
        <h3 className="text-sm font-semibold mb-1 text-brand-purple">Observações Gerais</h3>
        <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded leading-tight break-words">
          {truncateText(vistoria.observacoes_gerais, 120)}
        </p>
      </div>
    );

  const renderRodape = (currentPageNumber: number, totalPageCount: number) => (
    <div className="mt-auto">
      {renderObservacoesGerais()}
      <PdfFooter
        paginaAtual={currentPageNumber}
        totalPaginas={totalPageCount}
        dataHoraEmissao={dataHoraEmissao}
      />
    </div>
  );

  const renderFotoCard = (foto: FotoVistoriaSupabase, fotoIndex: number, grupoIndex: number) => {
    const numeroFoto = fotoIndex + 1;
    const descricaoFoto = foto.descricao || "Evidência fotográfica da vistoria";

    console.log(`Renderizando foto ${numeroFoto} do grupo ${grupoIndex + 1}:`, {
      url: foto.arquivo_url,
      nome: foto.arquivo_nome,
      descricao: descricaoFoto,
    });

    return (
      <div className="border rounded-lg p-3 flex-1 flex flex-col" style={{ minHeight: "380px" }}>
        <div
          className="mb-3 flex items-center justify-center bg-gray-50 rounded"
          style={{ height: "320px" }}
        >
          <img
            src={foto.arquivo_url}
            alt={`Foto ${numeroFoto} - Sistema ${grupoIndex + 1}`}
            className="rounded"
            crossOrigin="anonymous"
            loading="eager"
            style={{
              maxWidth: "100%",
              maxHeight: "320px",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
            onLoad={e => {
              console.log(`Imagem carregada com sucesso: ${foto.arquivo_url}`);
              e.currentTarget.setAttribute("data-loaded", "true");
            }}
            onError={e => {
              console.error(`Erro ao carregar imagem: ${foto.arquivo_url}`, e);
              e.currentTarget.setAttribute("data-error", "true");
              setTimeout(() => {
                if (!e.currentTarget.getAttribute("data-loaded")) {
                  e.currentTarget.src = foto.arquivo_url + "?t=" + Date.now();
                }
              }, 1000);
            }}
          />
        </div>
        <div className="flex-shrink-0">
          <p className="text-xs font-semibold mb-2 text-brand-purple">
            Foto {String(numeroFoto).padStart(2, "0")} - Sistema {grupoIndex + 1}
          </p>
          <p className="text-xs text-gray-700 leading-relaxed break-words">{descricaoFoto}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft size={18} className="mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Visualizar Relatório PDF</h2>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setMostrarVerificacaoEmail(true)} variant="outline">
            <Mail size={18} className="mr-2" />
            Enviar Email
          </Button>
          <Button
            onClick={() => generatePDF(vistoria)}
            className="bg-brand-green hover:bg-brand-green-light"
          >
            <Download size={18} className="mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Preview do PDF */}
      <Card className="max-w-none mx-auto" style={{ width: "210mm", maxWidth: "210mm" }}>
        <div ref={reportRef} className="bg-white">
          {pages.map((page, index) => {
            const pageNumber = index + 1;

            if (page.variant === "summary") {
              return (
                <PdfPage key={page.key} className="gap-3">
                  <PdfReportHeader />
                  <PdfReportInfo
                    dataEmissao={dataEmissaoAtual}
                    hora={horaAtual}
                    usuario={vistoria.responsavel || "Não informado"}
                    empreendimento={vistoria.condominio?.nome || "Não informado"}
                    numeroInterno={vistoria.numero_interno}
                    dataVistoria={formatDate(vistoria.data_vistoria)}
                  />
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p className="text-sm">Nenhum sistema de vistoria cadastrado.</p>
                      <p className="text-xs mt-2">O relatório contém apenas informações gerais.</p>
                    </div>
                  </div>
                  {renderRodape(pageNumber, totalPages)}
                </PdfPage>
              );
            }

            if (!page.grupo || typeof page.groupIndex !== "number") {
              return null;
            }

            if (page.variant === "no-photos") {
              return (
                <PdfPage key={page.key} className="gap-3">
                  <PdfReportHeader />
                  <PdfReportInfo
                    dataEmissao={dataEmissaoAtual}
                    hora={horaAtual}
                    usuario={vistoria.responsavel || "Não informado"}
                    empreendimento={vistoria.condominio?.nome || "Não informado"}
                    numeroInterno={vistoria.numero_interno}
                    dataVistoria={formatDate(vistoria.data_vistoria)}
                  />
                  {renderTabelaGrupo(page.grupo, page.groupIndex)}

                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p className="text-sm">
                        Nenhuma evidência fotográfica disponível para este sistema.
                      </p>
                      <p className="text-xs mt-2">
                        Sistema: {page.grupo.ambiente} - {page.grupo.grupo}
                      </p>
                    </div>
                  </div>

                  {renderRodape(pageNumber, totalPages)}
                </PdfPage>
              );
            }

            const titulo =
              page.variant === "first"
                ? `Evidências Fotográficas - Sistema ${page.groupIndex + 1}`
                : `Evidências Fotográficas - Sistema ${page.groupIndex + 1} (Continuação)`;

            return (
              <PdfPage key={page.key} className="gap-3">
                <PdfReportHeader />
                {page.variant === "first" && (
                  <>
                    <PdfReportInfo
                      dataEmissao={dataEmissaoAtual}
                      hora={horaAtual}
                      usuario={vistoria.responsavel || "Não informado"}
                      empreendimento={vistoria.condominio?.nome || "Não informado"}
                      numeroInterno={vistoria.numero_interno}
                      dataVistoria={formatDate(vistoria.data_vistoria)}
                    />
                    {renderTabelaGrupo(page.grupo, page.groupIndex)}
                  </>
                )}

                <h4 className="text-sm font-semibold mb-2 text-brand-purple">{titulo}</h4>

                <div className="flex gap-3 flex-1">
                  {page.photos?.map((foto, fotoIndex) => (
                    <div key={`${page.key}-${fotoIndex}`} className="flex-1 flex">
                      {renderFotoCard(foto, (page.startIndex ?? 0) + fotoIndex, page.groupIndex)}
                    </div>
                  ))}
                  {page.photos && page.photos.length === 1 && <div className="flex-1" />}
                </div>

                {renderRodape(pageNumber, totalPages)}
              </PdfPage>
            );
          })}
        </div>
      </Card>

      {/* Modal de Verificação de Email */}
      <VerificacaoEnvioEmail
        open={mostrarVerificacaoEmail}
        onClose={() => setMostrarVerificacaoEmail(false)}
        dadosVistoria={vistoria}
        onEnviar={handleConfirmarEnvioEmail}
      />
    </div>
  );
};

export default PreviewPDFSupabase;
