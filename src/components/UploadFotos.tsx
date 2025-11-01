import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import DescricaoAutomaticaAvancada from "./DescricaoAutomaticaAvancada";
import FotoModal from "./upload/FotoModal";
import UploadProgress from "./upload/UploadProgress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FotoVistoriaSupabase } from "@/hooks/useVistoriasSupabase";
import { FotoUpload } from "@/hooks/useFotosSupabase";
import { PatologiaResumo } from "@/services/patologiaIA";

interface FotoData {
  file: File;
  preview: string;
  descricao: string;
  iaFeedbackId?: string | null;
  iaResumo?: PatologiaResumo | null;
  iaSugestaoDescricao?: string;
  foiEditado?: boolean;
}

interface FotoExistente {
  id: string;
  url: string;
  nome: string;
  descricao: string;
  tipo_mime?: string;
  tamanho_bytes?: number;
  iaFeedbackId?: string | null;
  iaResumo?: PatologiaResumo | null;
  iaSugestaoDescricao?: string;
  foiEditado?: boolean;
  isExisting: true;
}

interface UploadFotosProps {
  onFotosChange: (fotos: File[], fotosComDescricao?: FotoData[]) => void;
  onFotosExistentesChange?: (fotosAtualizadas: FotoExistente[]) => void;
  maxFotos?: number;
  grupoId?: string;
  grupoInfo?: {
    ambiente?: string;
    grupo?: string;
    item?: string;
    status?: string;
  };
  vistoriaId?: string;
  condominioInfo?: {
    id?: string;
    nome: string;
    tipo?: string;
  };
  responsavel?: string;
  fotosExistentes?: FotoVistoriaSupabase[];
  uploading?: boolean;
  uploadProgress?: {
    current: number;
    total: number;
    currentFileName: string;
    percentage: number;
  } | null;
}

const UploadFotos = ({
  onFotosChange,
  onFotosExistentesChange,
  maxFotos = 10,
  grupoId,
  grupoInfo,
  vistoriaId,
  condominioInfo,
  responsavel,
  fotosExistentes = [],
  uploading = false,
  uploadProgress = null,
}: UploadFotosProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fotos, setFotos] = useState<FotoData[]>([]);
  const [fotosExistentesState, setFotosExistentesState] = useState<FotoExistente[]>([]);
  const [fotosExistentesArquivos, setFotosExistentesArquivos] = useState<(File | null)[]>([]);
  const [selectedFoto, setSelectedFoto] = useState<{
    url: string;
    nome: string;
    descricao?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_DESCRICAO_LENGTH = 300;

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "Tamanho não informado";
    const unidades = ["Bytes", "KB", "MB", "GB"];
    const indice = Math.min(unidades.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const tamanho = bytes / Math.pow(1024, indice);
    return `${tamanho.toFixed(2)} ${unidades[indice]}`;
  };

  // Carregar fotos existentes quando o componente monta ou fotosExistentes muda
  useEffect(() => {
    let isMounted = true;

    const carregarFotosExistentes = async () => {
      if (fotosExistentes && fotosExistentes.length > 0) {
        const fotosFormatadas: FotoExistente[] = fotosExistentes.map(foto => ({
          id: foto.id || "",
          url: foto.arquivo_url,
          nome: foto.arquivo_nome,
          descricao: foto.descricao || "",
          tipo_mime: foto.tipo_mime,
          tamanho_bytes: foto.tamanho_bytes,
          iaFeedbackId: null,
          iaResumo: null,
          iaSugestaoDescricao: undefined,
          foiEditado: false,
          isExisting: true,
        }));

        if (isMounted) {
          setFotosExistentesState(fotosFormatadas);
          setFotosExistentesArquivos(new Array(fotosFormatadas.length).fill(null));
        }

        try {
          const arquivos = await Promise.all(
            fotosExistentes.map(async foto => {
              try {
                const response = await fetch(foto.arquivo_url);
                const blob = await response.blob();
                const fileType = blob.type || foto.tipo_mime || "image/jpeg";
                const fileName = foto.arquivo_nome || "foto.jpg";
                return new File([blob], fileName, { type: fileType });
              } catch (error) {
                console.error("Erro ao converter foto existente para File:", error);
                return null;
              }
            }),
          );

          if (isMounted) {
            setFotosExistentesArquivos(arquivos);
          }
        } catch (error) {
          console.error("Erro ao carregar arquivos das fotos existentes:", error);
        }
      } else if (isMounted) {
        setFotosExistentesState([]);
        setFotosExistentesArquivos([]);
      }
    };

    carregarFotosExistentes();

    return () => {
      isMounted = false;
    };
  }, [fotosExistentes]);

  // Reset fotos quando o grupoId muda (novo grupo) - CORRIGIDO
  useEffect(() => {
    // Só limpar se não há fotos existentes E não é uma nova vistoria
    if (!fotosExistentes || fotosExistentes.length === 0) {
      // Para nova vistoria (sem grupoId), manter as fotos no estado
      if (grupoId) {
        console.log("Limpando fotos para novo grupo com ID:", grupoId);
        setFotos([]);
      }
    }
  }, [grupoId, fotosExistentes]);

  // Função para notificar mudanças nas fotos
  const notifyFotosChange = (novasFotos: FotoData[]) => {
    console.log("=== NOTIFICANDO MUDANÇA DE FOTOS ===");
    console.log("Quantidade de fotos:", novasFotos.length);
    console.log("GrupoId atual:", grupoId);

    if (novasFotos.length === 0) {
      console.log("Nenhuma foto, enviando arrays vazios");
      onFotosChange([], []);
      return;
    }

    // Manter referências diretas dos arquivos File
    const arquivosOriginais: File[] = [];
    const fotosParaCallback: FotoUpload[] = novasFotos.map(fotoData => ({
      file: fotoData.file,
      descricao: fotoData.descricao,
      iaFeedbackId: fotoData.iaFeedbackId ?? null,
      iaResumo: fotoData.iaResumo ?? null,
      foiEditado: fotoData.foiEditado ?? false,
    }));

    novasFotos.forEach((fotoData, index) => {
      console.log(`Processando foto ${index + 1}:`, {
        fileName: fotoData.file.name,
        fileSize: fotoData.file.size,
        fileType: fotoData.file.type,
        isFileInstance: fotoData.file instanceof File,
        descricao: fotoData.descricao,
        iaFeedbackId: fotoData.iaFeedbackId,
        foiEditado: fotoData.foiEditado,
      });

      // Usar referência direta do arquivo original
      arquivosOriginais.push(fotoData.file);
    });

    console.log("Enviando para callback:", {
      arquivos: arquivosOriginais.length,
      fotosDetalhadas: fotosParaCallback.length,
    });

    onFotosChange(arquivosOriginais, fotosParaCallback);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    console.log("=== SELEÇÃO DE ARQUIVOS ===");
    console.log("Arquivos selecionados:", files.length);

    const totalFotosAtuais = fotos.length + fotosExistentesState.length;

    // Verificar limite
    if (totalFotosAtuais + files.length > maxFotos) {
      toast({
        title: "Limite de Fotos Atingido",
        description: `Você pode adicionar no máximo ${maxFotos} fotos por grupo. Fotos restantes: ${maxFotos - totalFotosAtuais}`,
        variant: "destructive",
      });
      return;
    }

    // Validar tipos de arquivo
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivo Inválido",
        description: "Por favor, selecione apenas arquivos de imagem (JPEG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máximo 5MB por arquivo)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);

    if (oversizedFiles.length > 0) {
      toast({
        title: "Arquivo Muito Grande",
        description: "Cada arquivo deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Criar FotoData com referências diretas dos arquivos
    const newFotos: FotoData[] = files.map((file, index) => {
      console.log(`Criando FotoData ${index + 1} para:`, file.name);

      return {
        file: file, // Referência direta
        preview: URL.createObjectURL(file),
        descricao: "",
        iaFeedbackId: null,
        iaResumo: null,
        iaSugestaoDescricao: undefined,
        foiEditado: false,
      };
    });

    console.log(`FotoData criadas: ${newFotos.length}`);

    // Atualizar estado
    const updatedFotos = [...fotos, ...newFotos];
    setFotos(updatedFotos);

    // Notificar imediatamente
    notifyFotosChange(updatedFotos);

    toast({
      title: "Fotos Adicionadas",
      description: `${newFotos.length} foto(s) adicionada(s) com sucesso.`,
    });

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFoto = (index: number) => {
    console.log(`Removendo foto ${index}...`);
    const fotoRemovida = fotos[index];
    const updatedFotos = fotos.filter((_, i) => i !== index);
    setFotos(updatedFotos);

    // Liberar URL do preview
    if (fotoRemovida?.preview) {
      URL.revokeObjectURL(fotoRemovida.preview);
    }

    notifyFotosChange(updatedFotos);
  };

  const handleRemoveFotoExistente = (index: number) => {
    const updatedFotosExistentes = fotosExistentesState.filter((_, i) => i !== index);
    setFotosExistentesState(updatedFotosExistentes);
    setFotosExistentesArquivos(prev => prev.filter((_, i) => i !== index));

    toast({
      title: "Foto Removida",
      description: "A foto existente foi marcada para remoção.",
    });
  };

  const handleDescricaoChange = (index: number, descricao: string) => {
    console.log(`Atualizando descrição da foto ${index}:`, descricao);
    const updatedFotos = fotos.map((foto, i) => {
      if (i !== index) return foto;

      const sugestaoOriginal = foto.iaSugestaoDescricao ?? "";
      const foiEditado =
        foto.iaFeedbackId != null
          ? descricao.trim() !== sugestaoOriginal.trim()
          : (foto.foiEditado ?? false);

      return {
        ...foto,
        descricao,
        foiEditado,
      };
    });
    setFotos(updatedFotos);
    notifyFotosChange(updatedFotos);
  };

  const handleDescricaoExistenteChange = (index: number, descricao: string) => {
    const updatedFotosExistentes = fotosExistentesState.map((foto, i) => {
      if (i !== index) return foto;

      const sugestaoOriginal = foto.iaSugestaoDescricao ?? "";
      const foiEditado =
        foto.iaFeedbackId != null
          ? descricao.trim() !== sugestaoOriginal.trim()
          : (foto.foiEditado ?? false);

      return {
        ...foto,
        descricao,
        foiEditado,
      };
    });
    setFotosExistentesState(updatedFotosExistentes);

    // Notificar mudanças nas fotos existentes
    if (onFotosExistentesChange) {
      onFotosExistentesChange(updatedFotosExistentes);
    }
  };

  const handleDescriptionGenerated = (
    index: number,
    description: string,
    metadata?: { feedbackId?: string | null; resumo?: PatologiaResumo },
  ) => {
    const descricaoLimitada = description.slice(0, MAX_DESCRICAO_LENGTH);
    const updatedFotos = fotos.map((foto, i) => {
      if (i !== index) return foto;
      return {
        ...foto,
        descricao: descricaoLimitada,
        iaFeedbackId: metadata?.feedbackId ?? null,
        iaResumo: metadata?.resumo ?? null,
        iaSugestaoDescricao: descricaoLimitada,
        foiEditado: false,
      };
    });
    setFotos(updatedFotos);
    notifyFotosChange(updatedFotos);
  };

  const handleDescricaoExistenteGerada = (
    index: number,
    description: string,
    metadata?: { feedbackId?: string | null; resumo?: PatologiaResumo },
  ) => {
    const descricaoLimitada = description.slice(0, MAX_DESCRICAO_LENGTH);
    const updatedFotosExistentes = fotosExistentesState.map((foto, i) => {
      if (i !== index) return foto;

      return {
        ...foto,
        descricao: descricaoLimitada,
        iaFeedbackId: metadata?.feedbackId ?? null,
        iaResumo: metadata?.resumo ?? null,
        iaSugestaoDescricao: descricaoLimitada,
        foiEditado: false,
      };
    });
    setFotosExistentesState(updatedFotosExistentes);

    if (onFotosExistentesChange) {
      onFotosExistentesChange(updatedFotosExistentes);
    }
  };

  const handlePreviewFoto = (foto: FotoData | FotoExistente) => {
    if ("isExisting" in foto) {
      setSelectedFoto({
        url: foto.url,
        nome: foto.nome,
        descricao: foto.descricao,
      });
    } else {
      setSelectedFoto({
        url: foto.preview,
        nome: foto.file.name,
        descricao: foto.descricao,
      });
    }
  };

  const totalFotos = fotos.length + fotosExistentesState.length;
  const fotosRestantes = maxFotos - totalFotos;

  // Mostrar progresso de upload se estiver fazendo upload
  if (uploading && uploadProgress) {
    return (
      <div className="space-y-4">
        <UploadProgress progress={uploadProgress} />

        {/* Mostrar fotos já adicionadas em modo somente leitura */}
        {totalFotos > 0 && (
          <div className="opacity-50">
            <h3 className="text-lg font-medium mb-4">Fotos Preparadas ({totalFotos})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fotosExistentesState.map((foto, index) => (
                <div key={`existing-${index}`} className="aspect-square">
                  <img
                    src={foto.url}
                    alt={foto.nome}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
              {fotos.map((foto, index) => (
                <div key={`new-${index}`} className="aspect-square">
                  <img
                    src={foto.preview}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          fotosRestantes > 0
            ? "border-gray-300 hover:border-teal-400"
            : "border-gray-200 bg-gray-50 cursor-not-allowed"
        }`}
        onClick={() => fotosRestantes > 0 && fileInputRef.current?.click()}
      >
        <Upload
          size={40}
          className={`mx-auto mb-3 ${fotosRestantes > 0 ? "text-gray-400" : "text-gray-300"}`}
        />
        <p
          className={`text-base font-medium mb-1 ${fotosRestantes > 0 ? "text-gray-700" : "text-gray-400"}`}
        >
          {fotosRestantes > 0 ? "Clique para adicionar fotos" : "Limite de fotos atingido"}
        </p>
        <p className="text-sm text-gray-500">
          {fotosRestantes > 0
            ? `Máximo ${maxFotos} fotos - Restam ${fotosRestantes}`
            : `Máximo de ${maxFotos} fotos por grupo`}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={fotosRestantes === 0}
        />
      </div>

      {/* Preview das Fotos Existentes */}
      {fotosExistentesState.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Fotos Existentes ({fotosExistentesState.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fotosExistentesState.map((foto, index) => {
              const contadorClasse =
                foto.descricao.length > MAX_DESCRICAO_LENGTH
                  ? "text-red-500 font-semibold"
                  : foto.descricao.length > MAX_DESCRICAO_LENGTH * 0.9
                    ? "text-yellow-600"
                    : "text-gray-500";
              const arquivoIA = fotosExistentesArquivos[index] || null;

              return (
                <div
                  key={`existing-${index}`}
                  className="border rounded-lg p-4 flex flex-col bg-white shadow-sm"
                >
                  <div className="relative">
                    <div className="flex items-center justify-center bg-gray-50 rounded-md overflow-hidden aspect-[3/2]">
                      <img
                        src={foto.url}
                        alt={foto.nome}
                        className="object-contain w-full h-full max-h-80"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handlePreviewFoto(foto)}
                        className="h-9 w-9"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleRemoveFotoExistente(index)}
                        className="h-9 w-9"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-semibold text-brand-purple">
                      Foto {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{foto.nome}</p>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{foto.tipo_mime || "Formato desconhecido"}</span>
                      <span>{formatFileSize(foto.tamanho_bytes)}</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`descricao-existing-${index}`}>Descrição</Label>
                    <Textarea
                      id={`descricao-existing-${index}`}
                      value={foto.descricao}
                      onChange={e => handleDescricaoExistenteChange(index, e.target.value)}
                      placeholder="Descreva o que mostra esta foto..."
                      className={`min-h-[100px] ${foto.descricao.length > MAX_DESCRICAO_LENGTH ? "border-red-500 focus:ring-red-500" : ""}`}
                      rows={4}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Máximo {MAX_DESCRICAO_LENGTH} caracteres</span>
                      <span className={contadorClasse}>
                        {foto.descricao.length}/{MAX_DESCRICAO_LENGTH}
                      </span>
                    </div>
                    {foto.descricao.length > MAX_DESCRICAO_LENGTH && (
                      <Alert variant="warning">
                        <AlertDescription>
                          A descrição excede o limite de {MAX_DESCRICAO_LENGTH} caracteres e será
                          truncada no PDF ({foto.descricao.length - MAX_DESCRICAO_LENGTH} caracteres
                          excedentes).
                        </AlertDescription>
                      </Alert>
                    )}
                    {arquivoIA ? (
                      <DescricaoAutomaticaAvancada
                        imageFile={arquivoIA}
                        fotoUrl={foto.url}
                        fotoId={foto.id}
                        grupoVistoriaId={grupoId}
                        vistoriaId={vistoriaId}
                        usuarioId={user?.id || undefined}
                        ambiente={grupoInfo?.ambiente}
                        grupo={grupoInfo?.grupo}
                        item={grupoInfo?.item}
                        status={grupoInfo?.status}
                        condominioInfo={condominioInfo}
                        responsavel={responsavel}
                        currentDescription={foto.descricao}
                        onDescriptionGenerated={(description, metadata) =>
                          handleDescricaoExistenteGerada(index, description, metadata)
                        }
                      />
                    ) : (
                      <p className="text-xs text-gray-400">
                        Carregando imagem para análise com IA...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview das Fotos Novas - SEMPRE RENDERIZAR quando há fotos */}
      {fotos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {grupoId
              ? `Novas Fotos (${fotos.length}/${maxFotos})`
              : `Fotos Adicionadas (${fotos.length}/${maxFotos})`}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fotos.map((foto, index) => {
              const contadorClasse =
                foto.descricao.length > MAX_DESCRICAO_LENGTH
                  ? "text-red-500 font-semibold"
                  : foto.descricao.length > MAX_DESCRICAO_LENGTH * 0.9
                    ? "text-yellow-600"
                    : "text-gray-500";

              return (
                <div
                  key={`novo-${index}`}
                  className="border rounded-lg p-4 flex flex-col bg-white shadow-sm"
                >
                  <div className="relative">
                    <div className="flex items-center justify-center bg-gray-50 rounded-md overflow-hidden aspect-[3/2]">
                      <img
                        src={foto.preview}
                        alt={`Foto ${index + 1}`}
                        className="object-contain w-full h-full max-h-80"
                      />
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handlePreviewFoto(foto)}
                        className="h-9 w-9"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleRemoveFoto(index)}
                        className="h-9 w-9"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-semibold text-brand-purple">
                      Foto {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{foto.file.name}</p>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{foto.file.type || "Formato desconhecido"}</span>
                      <span>{formatFileSize(foto.file.size)}</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`descricao-${index}`}>Descrição</Label>
                    <Textarea
                      id={`descricao-${index}`}
                      value={foto.descricao}
                      onChange={e => handleDescricaoChange(index, e.target.value)}
                      placeholder="Descreva o que mostra esta foto..."
                      className={`min-h-[100px] ${foto.descricao.length > MAX_DESCRICAO_LENGTH ? "border-red-500 focus:ring-red-500" : ""}`}
                      rows={4}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Máximo {MAX_DESCRICAO_LENGTH} caracteres</span>
                      <span className={contadorClasse}>
                        {foto.descricao.length}/{MAX_DESCRICAO_LENGTH}
                      </span>
                    </div>
                    {foto.descricao.length > MAX_DESCRICAO_LENGTH && (
                      <Alert variant="warning">
                        <AlertDescription>
                          A descrição excede o limite de {MAX_DESCRICAO_LENGTH} caracteres e será
                          truncada no PDF ({foto.descricao.length - MAX_DESCRICAO_LENGTH} caracteres
                          excedentes).
                        </AlertDescription>
                      </Alert>
                    )}
                    <DescricaoAutomaticaAvancada
                      imageFile={foto.file}
                      grupoVistoriaId={grupoId}
                      vistoriaId={vistoriaId}
                      usuarioId={user?.id || undefined}
                      ambiente={grupoInfo?.ambiente}
                      grupo={grupoInfo?.grupo}
                      item={grupoInfo?.item}
                      status={grupoInfo?.status}
                      condominioInfo={condominioInfo}
                      responsavel={responsavel}
                      currentDescription={foto.descricao}
                      onDescriptionGenerated={(description, metadata) =>
                        handleDescriptionGenerated(index, description, metadata)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalFotos === 0 && (
        <div className="text-center text-gray-500 py-6">
          <ImageIcon size={48} className="mx-auto mb-3 text-gray-300" />
          <p>Nenhuma foto adicionada ainda.</p>
          <p className="text-sm">Máximo {maxFotos} fotos por grupo de vistoria.</p>
        </div>
      )}

      {/* Modal de preview */}
      {selectedFoto && (
        <FotoModal
          isOpen={!!selectedFoto}
          onClose={() => setSelectedFoto(null)}
          fotoUrl={selectedFoto.url}
          fotoNome={selectedFoto.nome}
          descricao={selectedFoto.descricao}
        />
      )}
    </div>
  );
};

export default UploadFotos;
