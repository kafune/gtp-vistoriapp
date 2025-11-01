import React from "react";

interface PdfReportInfoProps {
  dataEmissao: string;
  hora: string;
  usuario: string;
  empreendimento: string;
  numeroInterno: string;
  dataVistoria: string;
}

const PdfReportInfo: React.FC<PdfReportInfoProps> = ({
  dataEmissao,
  hora,
  usuario,
  empreendimento,
  numeroInterno,
  dataVistoria,
}) => (
  <div className="bg-gray-100 p-3 rounded-lg mb-4">
    <div className="grid grid-cols-4 gap-3 text-xs">
      <div>
        <span className="font-semibold">Data de emissão:</span>
        <br />
        {dataEmissao}
      </div>
      <div>
        <span className="font-semibold">Hora:</span>
        <br />
        {hora}
      </div>
      <div>
        <span className="font-semibold">Usuário:</span>
        <br />
        {usuario}
      </div>
      <div>
        <span className="font-semibold">Empreendimento:</span>
        <br />
        {empreendimento}
      </div>
      <div className="col-span-2">
        <span className="font-semibold">Nº interno da vistoria:</span>
        <br />
        {numeroInterno}
      </div>
      <div className="col-span-2">
        <span className="font-semibold">Data da vistoria:</span>
        <br />
        {dataVistoria}
      </div>
    </div>
  </div>
);

export default PdfReportInfo;
