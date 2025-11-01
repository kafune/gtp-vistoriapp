import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { VistoriaSupabase } from "@/hooks/useVistoriasSupabase";
import { preloadImages } from "@/utils/pdf/imageUtils";
import { createPDF, processPageWithFallback, addImageToPDF } from "@/utils/pdf/pdfUtils";
import { getErrorMessage } from "@/utils/pdf/errorUtils";

export const usePDFGenerator = () => {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePDF = async (vistoria: VistoriaSupabase) => {
    if (!reportRef.current) {
      toast({
        title: "Erro",
        description: "Não foi possível localizar o conteúdo do relatório.",
        variant: "destructive",
      });
      return;
    }

    const reportElement = reportRef.current;

    const collectPages = (element: HTMLElement) => {
      const pages = Array.from(element.querySelectorAll(".page")) as HTMLElement[];
      return pages.filter(
        page => element.contains(page) && page.offsetWidth > 0 && page.offsetHeight > 0,
      );
    };

    try {
      toast({
        title: "Gerando PDF",
        description: "Preparando conteúdo...",
      });

      await preloadImages(reportElement);

      const paginasValidas = collectPages(reportElement);

      if (paginasValidas.length === 0) {
        throw new Error(
          "Nenhuma página válida encontrada. Verifique se o conteúdo está carregado.",
        );
      }

      const pdf = createPDF();

      for (let i = 0; i < paginasValidas.length; i++) {
        const pagina = paginasValidas[i];
        const imageData = await processPageWithFallback(pagina, i);
        addImageToPDF(pdf, imageData, i > 0);
      }

      const condominio = vistoria.condominio?.nome || "Vistoria";
      const fileName = `Relatorio-${vistoria.numero_interno}-${condominio.replace(
        /\s+/g,
        "-",
      )}.pdf`;

      pdf.save(fileName);

      toast({
        title: "PDF Gerado",
        description: `Relatório gerado com ${paginasValidas.length} página(s).`,
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

  return {
    reportRef,
    generatePDF,
  };
};
