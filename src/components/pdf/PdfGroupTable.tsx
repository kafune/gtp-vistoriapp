import React from "react";

interface PdfGroupTableProps {
  indice: number;
  ambiente: string;
  grupo: string;
  item: string;
  status: string;
  parecer: string;
}

const statusClass = (status: string) => {
  switch (status) {
    case "N/A":
      return "bg-gray-200";
    case "Conforme":
      return "bg-brand-green text-white";
    case "Não Conforme":
      return "bg-red-200 text-red-800";
    default:
      return "bg-yellow-200 text-yellow-800";
  }
};

const PdfGroupTable: React.FC<PdfGroupTableProps> = ({
  indice,
  ambiente,
  grupo,
  item,
  status,
  parecer,
}) => (
  <div className="mb-4">
    <h3 className="text-base font-semibold mb-2 text-brand-purple">Sistema de Vistoria {indice}</h3>
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
          <td className="border border-gray-300 p-2 text-center align-middle">{ambiente}</td>
          <td className="border border-gray-300 p-2 text-center align-middle">{grupo}</td>
          <td className="border border-gray-300 p-2 text-center align-middle">{item}</td>
          <td className="border border-gray-300 p-2 text-center align-middle">
            <div className="flex justify-center items-center">
              <span className={`inline-block px-2 py-1 rounded text-xs ${statusClass(status)}`}>
                {status}
              </span>
            </div>
          </td>
          <td className="border border-gray-300 p-2 text-center align-middle break-words">
            {parecer}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

export default PdfGroupTable;
