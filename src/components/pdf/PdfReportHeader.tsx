import React from "react";

interface PdfReportHeaderProps {
  esquerdaSrc?: string;
  direitaSrc?: string;
  titulo?: string;
  subtitulo?: string;
}

const PdfReportHeader: React.FC<PdfReportHeaderProps> = ({
  esquerdaSrc = "/lovable-uploads/9e07dcd0-b996-4996-9028-7daeb90e3140.png",
  direitaSrc = "/lovable-uploads/bfe02df4-f545-4232-ad0a-e69690083a38.png",
  titulo = "Relatório de Vistoria Técnica - GTP",
  subtitulo = "Sistema de Vistorias Prediais",
}) => (
  <div className="bg-brand-purple text-white p-4 rounded-t-lg mb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center justify-center">
        <img src={esquerdaSrc} alt="Logo GTP Esquerda" className="w-20 h-20 object-contain" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p className="text-purple-200 text-sm">{subtitulo}</p>
      </div>
      <div className="flex items-center justify-center">
        <img src={direitaSrc} alt="Logo GTP Direita" className="w-20 h-20 object-contain" />
      </div>
    </div>
  </div>
);

export default PdfReportHeader;
