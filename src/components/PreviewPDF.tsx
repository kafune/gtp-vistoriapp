import React, { useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Edit, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PdfPage from "@/components/pdf/PdfPage";
import PdfReportHeader from "@/components/pdf/PdfReportHeader";
import PdfReportInfo from "@/components/pdf/PdfReportInfo";
import PdfGroupTable from "@/components/pdf/PdfGroupTable";
import PdfFooter from "@/components/pdf/PdfFooter";
import { preloadImages } from "@/utils/pdf/imageUtils";
import { createPDF, processPageWithFallback, addImageToPDF } from "@/utils/pdf/pdfUtils";
import { getErrorMessage } from "@/utils/pdf/errorUtils";
import { useObjectUrl } from "@/hooks/useObjectUrl";

interface FotoComDescricao extends File {
  descricao?: string;
}

interface GrupoVistoria {
  id: string;
  ambiente: string;
  grupo: string;
  item: string;
  status: string;
  parecer: string;
  fotos: FotoComDescricao[];
}

interface VistoriaData {
  condominio: string;
  numeroInterno: string;
  dataVistoria: string;
  observacoes: string;
  responsavel: string;
  grupos: GrupoVistoria[];
}

interface PreviewPDFProps {
  data: VistoriaData;
  onBack: () => void;
  onEdit?: () => void;
}

type PageVariant = "summary" | "no-photos" | "first" | "continuation";

interface PageDescriptor {
  key: string;
  variant: PageVariant;
  grupo?: GrupoVistoria;
  groupIndex?: number;
  photos?: FotoComDescricao[];
  startIndex?: number;
}

const PreviewPDF = ({ data, onBack, onEdit }: PreviewPDFProps) => {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const pages = useMemo<PageDescriptor[]>(() => {
    if (!data.grupos || data.grupos.length === 0) {
      return [
        {
          key: "summary",
          variant: "summary",
          photos: [],
        },
      ];
    }

    return data.grupos.flatMap<PageDescriptor>((grupo, groupIndex) => {
      const fotos = grupo.fotos || [];

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
  }, [data.grupos]);
  const totalPages = Math.max(pages.length, 1);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) {
      toast({
        title: "Erro",
        description: "Não foi possível localizar o conteúdo para gerar o PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Gerando PDF",
        description: "Preparando conteúdo...",
      });

      await preloadImages(reportRef.current);

      const paginas = Array.from(reportRef.current.querySelectorAll(".page")) as HTMLElement[];

      const paginasValidas = paginas.filter(
        pagina => pagina.offsetWidth > 0 && pagina.offsetHeight > 0,
      );

      if (paginasValidas.length === 0) {
        throw new Error("Nenhuma página válida encontrada para o PDF.");
      }

      const pdf = createPDF();

      for (let i = 0; i < paginasValidas.length; i++) {
        const imageData = await processPageWithFallback(paginasValidas[i], i);
        addImageToPDF(pdf, imageData, i > 0);
      }

      const fileName = `Relatorio-${data.numeroInterno}-${data.condominio.replace(
        /\s+/g,
        "-",
      )}.pdf`;

      pdf.save(fileName);

      toast({
        title: "PDF Gerado",
        description: `Relatório salvo com ${paginasValidas.length} página(s).`,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Erro na Geração do PDF",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Enviado",
      description: "O relatório foi enviado por email com sucesso.",
    });
    console.log("Enviando email com dados:", data);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      onBack();
    }
  };

  const renderObservacoesGerais = () =>
    data.observacoes && (
      <div className="mb-2">
        <h3 className="text-sm font-semibold mb-1 text-brand-purple">Observações Gerais</h3>
        <p
          className="text-xs text-gray-700 bg-gray-50 p-2 rounded leading-tight"
          style={{ wordBreak: "break-word", hyphens: "auto" }}
        >
          {truncateText(data.observacoes, 150)}
        </p>
      </div>
    );

  const dataEmissaoAtual = formatDate(new Date().toISOString());
  const horaAtual = getCurrentTime();
  const dataHoraEmissao = `${dataEmissaoAtual} às ${horaAtual}`;

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

  const FotoCard: React.FC<{ foto: FotoComDescricao; fotoIndex: number; grupoIndex: number }> = ({
    foto,
    fotoIndex,
    grupoIndex,
  }) => {
    const numeroFoto = fotoIndex + 1;
    const descricao = (foto as FotoComDescricao).descricao || "Evidência fotográfica da vistoria";
    const imageUrl = useObjectUrl(foto);

    if (!imageUrl) {
      return null;
    }

    return (
      <div className="border rounded-lg p-2 flex-1">
        <img
          src={imageUrl}
          alt={`Foto ${numeroFoto} - Sistema ${grupoIndex + 1}`}
          className="w-full aspect-square object-cover rounded mb-2"
        />
        <div>
          <p className="text-xs font-medium mb-1">
            Foto {String(numeroFoto).padStart(2, "0")} - Sistema {grupoIndex + 1}
          </p>
          <p
            className="text-xs text-gray-700 leading-relaxed"
            style={{ wordBreak: "break-word", hyphens: "auto" }}
          >
            {truncateText(descricao, 200)}
          </p>
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
          <h2 className="text-2xl font-bold text-gray-900">Visualizar Relatório</h2>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleEdit} variant="outline">
            <Edit size={18} className="mr-2" />
            Editar
          </Button>
          <Button onClick={handleSendEmail} variant="outline">
            <Mail size={18} className="mr-2" />
            Enviar Email
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-brand-green hover:bg-brand-green-light">
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
                    usuario={data.responsavel || "Não informado"}
                    empreendimento={data.condominio}
                    numeroInterno={data.numeroInterno}
                    dataVistoria={formatDate(data.dataVistoria)}
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
                    usuario={data.responsavel || "Não informado"}
                    empreendimento={data.condominio}
                    numeroInterno={data.numeroInterno}
                    dataVistoria={formatDate(data.dataVistoria)}
                  />
                  <PdfGroupTable
                    indice={page.groupIndex + 1}
                    ambiente={page.grupo.ambiente}
                    grupo={page.grupo.grupo}
                    item={page.grupo.item}
                    status={page.grupo.status}
                    parecer={truncateText(page.grupo.parecer, 200)}
                  />
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
                      usuario={data.responsavel || "Não informado"}
                      empreendimento={data.condominio}
                      numeroInterno={data.numeroInterno}
                      dataVistoria={formatDate(data.dataVistoria)}
                    />
                    <PdfGroupTable
                      indice={page.groupIndex + 1}
                      ambiente={page.grupo.ambiente}
                      grupo={page.grupo.grupo}
                      item={page.grupo.item}
                      status={page.grupo.status}
                      parecer={truncateText(page.grupo.parecer, 200)}
                    />
                  </>
                )}

                <h4 className="text-sm font-semibold mb-3 text-brand-purple">{titulo}</h4>

                <div className="flex gap-4 flex-1">
                  {page.photos?.map((foto, fotoIndex) => (
                    <div key={`${page.key}-${fotoIndex}`} className="flex-1 flex">
                      <FotoCard
                        foto={foto}
                        fotoIndex={(page.startIndex ?? 0) + fotoIndex}
                        grupoIndex={page.groupIndex}
                      />
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
    </div>
  );
};

export default PreviewPDF;
