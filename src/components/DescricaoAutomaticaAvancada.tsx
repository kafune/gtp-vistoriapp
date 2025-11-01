import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import {
  PatologiaSugestao,
  PatologiaResumo,
  PatologiaContexto,
  generatePatologiaDescricao,
  fileToBase64,
} from "@/services/patologiaIA";
import { Badge } from "@/components/ui/badge";

interface DescricaoAutomaticaAvancadaProps {
  imageFile: File;
  fotoUrl?: string;
  fotoId?: string;
  grupoVistoriaId?: string;
  vistoriaId?: string;
  usuarioId?: string;
  onDescriptionGenerated: (
    description: string,
    metadata?: { feedbackId?: string | null; resumo?: PatologiaResumo },
  ) => void;
  disabled?: boolean;
  currentDescription?: string;
  ambiente?: string;
  grupo?: string;
  item?: string;
  status?: string;
  condominioInfo?: {
    id?: string;
    nome: string;
    tipo?: string;
  };
  responsavel?: string;
}

const analysisMode: Record<string, string> = {
  auto: "Análise Automática Inteligente",
  estrutural: "Foco Estrutural e Construtivo",
  instalacoes: "Instalações (Elétrica/Hidráulica)",
  acabamentos: "Acabamentos e Revestimentos",
  seguranca: "Segurança e Acessibilidade",
  conservacao: "Estado de Conservação",
  manutencao: "Manutenção Necessária",
  detalhado: "Análise Técnica Detalhada",
};

const DescricaoAutomaticaAvancada: React.FC<DescricaoAutomaticaAvancadaProps> = ({
  imageFile,
  fotoUrl,
  fotoId,
  grupoVistoriaId,
  vistoriaId,
  usuarioId,
  onDescriptionGenerated,
  disabled,
  currentDescription = "",
  ambiente,
  grupo,
  item,
  status,
  condominioInfo,
  responsavel,
}) => {
  const { toast } = useToast();
  const { obterConfiguracao, loading: loadingConfiguracoes } = useConfiguracoes();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>("auto");
  const [resultado, setResultado] = useState<PatologiaSugestao | null>(null);
  const [erroIA, setErroIA] = useState<string | null>(null);

  const hasCustomInstruction = currentDescription.trim().length > 0;
  const iaHabilitada = obterConfiguracao("ia_auto_descricao", false);

  const contextoBase: Omit<PatologiaContexto, "imageBase64"> = useMemo(
    () => ({
      fotoId,
      fotoUrl,
      grupoVistoriaId,
      vistoriaId,
      usuarioId,
      ambiente,
      grupo,
      item,
      status,
      condominioId: condominioInfo?.id,
      condominioNome: condominioInfo?.nome,
      responsavel,
      modo: hasCustomInstruction ? "custom" : selectedMode,
      descricaoAtual: hasCustomInstruction ? currentDescription : undefined,
    }),
    [
      fotoId,
      fotoUrl,
      grupoVistoriaId,
      vistoriaId,
      usuarioId,
      ambiente,
      grupo,
      item,
      status,
      condominioInfo?.id,
      condominioInfo?.nome,
      responsavel,
      hasCustomInstruction,
      selectedMode,
      currentDescription,
    ],
  );

  const handleGenerate = async () => {
    if (disabled) {
      return;
    }

    if (loadingConfiguracoes) {
      toast({
        title: "Carregando configurações",
        description: "Aguarde um instante e tente novamente.",
      });
      return;
    }

    if (!iaHabilitada) {
      toast({
        title: "IA Desativada",
        description: "Ative a descrição automática nas Configurações para usar este recurso.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setErroIA(null);

    try {
      const imageBase64 = await fileToBase64(imageFile);
      const sugestao = await generatePatologiaDescricao({
        ...contextoBase,
        imageBase64,
      });

      setResultado(sugestao);
      onDescriptionGenerated(sugestao.descricao, {
        feedbackId: sugestao.feedbackId,
        resumo: sugestao.resumo,
      });

      toast({
        title: "Descrição gerada pela IA",
        description: `Diagnóstico entregue (${sugestao.resumo.gravidade}) com ${Math.round(
          sugestao.resumo.confianca * 100,
        )}% confiança.`,
      });
    } catch (error) {
      console.error("Erro ao gerar descrição de patologia:", error);
      setErroIA(
        error instanceof Error ? error.message : "Não foi possível gerar a descrição automática.",
      );
      toast({
        title: "Erro na geração",
        description:
          error instanceof Error ? error.message : "Não foi possível gerar a descrição automática.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {!hasCustomInstruction && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Análise</label>
          <Select
            value={selectedMode}
            onValueChange={setSelectedMode}
            disabled={disabled || isGenerating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de análise" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(analysisMode).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Sparkles size={14} className="text-amber-500" />
        <span>A IA utiliza histórico validado e aprende com as correções aprovadas.</span>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={disabled || isGenerating}
        className="w-full bg-brand-purple text-white hover:bg-brand-purple-light"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Gerando descrição detalhada...
          </>
        ) : (
          <>
            <Brain className="mr-2 h-4 w-4" />
            Gerar descrição com IA
          </>
        )}
      </Button>

      {erroIA && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {erroIA}
        </div>
      )}

      {resultado && (
        <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">Resumo técnico</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Gravidade: {resultado.resumo.gravidade}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Confiança: {Math.round(resultado.resumo.confianca * 100)}%
              </Badge>
            </div>
          </div>

          {resultado.resumo.patologias.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Patologias identificadas
              </p>
              <div className="flex flex-wrap gap-2">
                {resultado.resumo.patologias.map(patologia => (
                  <Badge key={patologia} variant="secondary">
                    {patologia}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {resultado.resumo.recomendacoes && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase">Recomendações</p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {resultado.resumo.recomendacoes}
              </p>
            </div>
          )}

          {resultado.exemplos.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase">
                Base de conhecimento aplicada
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                {resultado.exemplos.slice(0, 3).map(exemplo => (
                  <li key={exemplo.feedback_id} className="rounded-md bg-white p-2 shadow-sm">
                    <span className="block text-[11px] text-gray-400">
                      Similaridade: {(exemplo.similarity * 100).toFixed(1)}%
                    </span>
                    <span className="block text-gray-700">{exemplo.descricao}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DescricaoAutomaticaAvancada;
