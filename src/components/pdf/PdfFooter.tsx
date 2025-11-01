import React from "react";

interface PdfFooterProps {
  paginaAtual: number;
  totalPaginas: number;
  dataHoraEmissao: string;
}

const PdfFooter: React.FC<PdfFooterProps> = ({ paginaAtual, totalPaginas, dataHoraEmissao }) => (
  <div className="border-t pt-2 text-xs text-gray-600 flex justify-between items-center">
    <p>Relatório gerado automaticamente pelo Sistema de Vistorias - {dataHoraEmissao}</p>
    <p className="font-medium">
      Página {paginaAtual}/{totalPaginas}
    </p>
  </div>
);

export default PdfFooter;
