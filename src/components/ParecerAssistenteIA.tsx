import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { blobToBase64, ParecerAudioContexto, processarParecerAudio } from "@/services/parecerAudio";

interface ParecerAssistenteIAProps {
  textoAtual: string;
  onAplicarTexto: (novoTexto: string) => void;
  contexto?: ParecerAudioContexto;
}

const SUPORTA_GRAVACAO =
  typeof window !== "undefined" && !!(navigator.mediaDevices && window.MediaRecorder);

const ParecerAssistenteIA: React.FC<ParecerAssistenteIAProps> = ({
  textoAtual,
  onAplicarTexto,
  contexto,
}) => {
  const { toast } = useToast();
  const [gravando, setGravando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [gravacaoDisponivel, setGravacaoDisponivel] = useState<boolean>(SUPORTA_GRAVACAO);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!SUPORTA_GRAVACAO) {
      setGravacaoDisponivel(false);
    }
  }, []);

  const iniciarGravacao = useCallback(async () => {
    if (!gravacaoDisponivel) {
      toast({
        title: "Recurso indisponível",
        description: "Seu navegador não suporta gravação de áudio ou o acesso foi bloqueado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        tratarGravacaoFinalizada();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setGravando(true);
      toast({
        title: "Gravando áudio",
        description: "Fale claramente o parecer técnico. Clique em parar quando terminar.",
      });
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      setGravacaoDisponivel(false);
      toast({
        title: "Não foi possível acessar o microfone",
        description: "Verifique as permissões do navegador e tente novamente.",
        variant: "destructive",
      });
    }
  }, [gravacaoDisponivel, toast, tratarGravacaoFinalizada]);

  const enviarParaIA = useCallback(
    async ({ blob, texto }: { blob?: Blob; texto?: string }) => {
      setProcessando(true);
      try {
        let audioBase64: string | undefined;
        let mimeType: string | undefined;

        if (blob) {
          audioBase64 = await blobToBase64(blob);
          mimeType = blob.type;
        }

        const resposta = await processarParecerAudio({
          audioBase64,
          mimeType,
          textoManual: texto,
          contexto,
        });

        onAplicarTexto(resposta.parecerRefinado);

        toast({
          title: "Parecer refinado",
          description: "Revisamos o parecer com linguagem técnica. Ajuste se necessário.",
        });
      } catch (error) {
        console.error("Erro ao processar parecer:", error);
        toast({
          title: "Erro na IA",
          description:
            error instanceof Error ? error.message : "Não foi possível processar o parecer.",
          variant: "destructive",
        });
      } finally {
        setProcessando(false);
      }
    },
    [contexto, onAplicarTexto, toast],
  );

  const tratarGravacaoFinalizada = useCallback(async () => {
    if (!chunksRef.current.length) {
      toast({
        title: "Sem áudio",
        description: "Nenhum áudio foi capturado. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0].type || "audio/webm" });
    await enviarParaIA({ blob });
  }, [toast, enviarParaIA]);

  const pararGravacao = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setGravando(false);
    }
  }, []);

  const handleRefinarTexto = useCallback(() => {
    if (!textoAtual || textoAtual.trim().length === 0) {
      toast({
        title: "Texto vazio",
        description: "Digite ou grave um parecer antes de refinar com IA.",
        variant: "destructive",
      });
      return;
    }

    enviarParaIA({ texto: textoAtual });
  }, [textoAtual, enviarParaIA, toast]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={gravando ? "destructive" : "outline"}
        disabled={processando || (!gravando && !gravacaoDisponivel)}
        onClick={gravando ? pararGravacao : iniciarGravacao}
      >
        {gravando ? (
          <>
            <Square size={16} className="mr-2" />
            Parar gravação
          </>
        ) : (
          <>
            <Mic size={16} className="mr-2" />
            Gravar áudio
          </>
        )}
      </Button>

      <Button type="button" variant="outline" onClick={handleRefinarTexto} disabled={processando}>
        {processando ? (
          <>
            <Loader2 size={16} className="mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Sparkles size={16} className="mr-2" />
            Refinar texto com IA
          </>
        )}
      </Button>
    </div>
  );
};

export default ParecerAssistenteIA;
