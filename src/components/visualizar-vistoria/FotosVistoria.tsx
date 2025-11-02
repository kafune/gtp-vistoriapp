import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, ZoomIn } from "lucide-react";
import { FotoVistoriaSupabase } from "@/hooks/useVistoriasSupabase";

interface FotosVistoriaProps {
  fotos: FotoVistoriaSupabase[];
  grupoNome?: string;
  grupoIndex?: number;
}

const FotosVistoria = ({ fotos, grupoNome, grupoIndex }: FotosVistoriaProps) => {
  const [fotoEmDestaque, setFotoEmDestaque] = useState<FotoVistoriaSupabase | null>(null);

  if (!fotos || fotos.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Nenhuma foto disponível para este grupo</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const unidades = ["Bytes", "KB", "MB", "GB"];
    const indice = Math.floor(Math.log(bytes) / Math.log(1024));
    const tamanho = bytes / Math.pow(1024, indice);
    return `${tamanho.toFixed(2)} ${unidades[indice]}`;
  };

  const handleDownload = async (foto: FotoVistoriaSupabase) => {
    try {
      const response = await fetch(foto.arquivo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = foto.arquivo_nome;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao baixar foto:", error);
    }
  };

  const obterTituloFoto = (indice: number) => {
    const numeroFoto = String(indice + 1).padStart(2, "0");
    const numeroSistema = typeof grupoIndex === "number" ? grupoIndex + 1 : null;

    if (numeroSistema) {
      return `Foto ${numeroFoto} - Sistema ${numeroSistema}`;
    }

    if (grupoNome) {
      return `Foto ${numeroFoto} - ${grupoNome}`;
    }

    return `Foto ${numeroFoto}`;
  };

  return (
    <div className="space-y-4">
      {grupoNome && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="font-medium text-gray-900">Fotos - {grupoNome}</h4>
          <Badge variant="outline">{fotos.length} foto(s)</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fotos.map((foto, index) => {
          const tituloFoto = obterTituloFoto(index);

          return (
            <div
              key={foto.id || `${foto.arquivo_url}-${index}`}
              className="border rounded-lg p-4 flex flex-col bg-white shadow-sm"
            >
              <div className="flex items-center justify-center bg-gray-50 rounded-md overflow-hidden mb-4 aspect-[3/2]">
                <img
                  src={foto.arquivo_url}
                  alt={foto.descricao || foto.arquivo_nome}
                  className="object-contain w-full h-full max-h-80"
                  loading="lazy"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-purple">{tituloFoto}</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {foto.descricao || "Evidência fotográfica da vistoria."}
                </p>
                <div className="text-xs text-gray-500 flex flex-wrap gap-x-4">
                  <span>{foto.tipo_mime || "Formato desconhecido"}</span>
                  <span>
                    {foto.tamanho_bytes
                      ? formatFileSize(foto.tamanho_bytes)
                      : "Tamanho não informado"}
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setFotoEmDestaque(foto)}
                >
                  <ZoomIn size={16} className="mr-2" />
                  Ampliar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDownload(foto)}
                >
                  <Download size={16} className="mr-2" />
                  Baixar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!fotoEmDestaque}
        onOpenChange={open => {
          if (!open) {
            setFotoEmDestaque(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl w-full">
          {fotoEmDestaque && (
            <>
              <DialogHeader>
                <DialogTitle>{fotoEmDestaque.arquivo_nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <img
                  src={fotoEmDestaque.arquivo_url}
                  alt={fotoEmDestaque.descricao || fotoEmDestaque.arquivo_nome}
                  className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                />
                {fotoEmDestaque.descricao && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">
                      <strong>Descrição:</strong> {fotoEmDestaque.descricao}
                    </p>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    Tamanho:{" "}
                    {fotoEmDestaque.tamanho_bytes
                      ? formatFileSize(fotoEmDestaque.tamanho_bytes)
                      : "N/A"}
                  </span>
                  <span>Tipo: {fotoEmDestaque.tipo_mime || "N/A"}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FotosVistoria;
