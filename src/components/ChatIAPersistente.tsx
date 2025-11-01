import React, { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  MessageCircle,
  Plus,
  Trash2,
  Edit2,
  BarChart3,
  FileText,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { useChatConversas } from "@/hooks/useChatConversas";
import { useVistoriaAnalytics, VistoriaAnalytics } from "@/hooks/useVistoriaAnalytics";
import { useChatPDFGenerator } from "@/hooks/useChatPDFGenerator";
import AudioRecorder from "./AudioRecorder";
import AnalyticsDisplay from "./chat/AnalyticsDisplay";

const ChatIAPersistente = () => {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState<string | null>(null);
  const [novoTitulo, setNovoTitulo] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { obterConfiguracao, loading: configLoading } = useConfiguracoes();
  const {
    obterEstatisticasGerais,
    buscarVistoriasPorFiltro,
    loading: analyticsLoading,
  } = useVistoriaAnalytics();
  const { generateTextReportPDF } = useChatPDFGenerator();

  const {
    conversas,
    conversaAtual,
    mensagens,
    loading: chatLoading,
    criarConversa,
    selecionarConversa,
    adicionarMensagem,
    deletarConversa,
    atualizarTituloConversa,
  } = useChatConversas();

  // Carregar configurações da IA
  const config = useMemo(
    () => ({
      nomeAgente: obterConfiguracao("agente_nome", "PrediBot"),
      promptPersona: obterConfiguracao("agente_prompt_persona", ""),
      promptObjetivo: obterConfiguracao("agente_prompt_objetivo", ""),
      promptComportamento: obterConfiguracao("agente_prompt_comportamento", ""),
      enableAgente: obterConfiguracao("agente_enable", true),
      apiKeyOpenAI: obterConfiguracao("api_key_openai", ""),
    }),
    [obterConfiguracao],
  );

  // Debug logs para configurações
  useEffect(() => {
    console.log("=== DEBUG ChatIAPersistente ===");
    console.log("Config loading:", configLoading);
    console.log("Chat loading:", chatLoading);
    console.log("Configurações:", {
      nomeAgente: config.nomeAgente,
      enableAgente: config.enableAgente,
      hasApiKey: !!config.apiKeyOpenAI,
      apiKeyLength: config.apiKeyOpenAI?.length || 0,
    });
    console.log("Conversas:", conversas.length);
    console.log("Conversa atual:", conversaAtual?.id || "nenhuma");
    console.log("Mensagens:", mensagens.length);
  }, [configLoading, chatLoading, config, conversas, conversaAtual, mensagens]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [mensagens]);

  // Detectar comandos especiais para análise de vistorias
  const detectarComandoAnalise = (message: string): string | null => {
    const comandos = [
      {
        pattern: /estatísticas|estatisticas|resumo geral|visão geral|overview/i,
        type: "estatisticas",
      },
      { pattern: /quantos relatórios|quantas vistorias|total de vistorias/i, type: "estatisticas" },
      { pattern: /condomínio|condominios|por condomínio/i, type: "por_condominio" },
      {
        pattern: /problemas frequentes|mais comuns|principais problemas/i,
        type: "problemas_frequentes",
      },
      { pattern: /status|situação das vistorias/i, type: "por_status" },
      { pattern: /buscar.*por|filtrar.*por|encontrar vistorias/i, type: "buscar" },
    ];

    for (const comando of comandos) {
      if (comando.pattern.test(message)) {
        return comando.type;
      }
    }
    return null;
  };

  // Processar comandos de análise
  const processarComandoAnalise = async (
    tipo: string,
    mensagemOriginal: string,
  ): Promise<{ tipo: "texto" | "analytics"; conteudo: string | VistoriaAnalytics }> => {
    try {
      console.log("Processando comando de análise:", tipo);

      switch (tipo) {
        case "estatisticas": {
          const analytics = await obterEstatisticasGerais();
          if (!analytics) {
            return {
              tipo: "texto",
              conteudo: "Não foi possível obter as estatísticas no momento.",
            };
          }

          return { tipo: "analytics", conteudo: analytics };
        }

        case "por_condominio": {
          const analyticsCondominio = await obterEstatisticasGerais();
          if (!analyticsCondominio) {
            return { tipo: "texto", conteudo: "Não foi possível obter os dados por condomínio." };
          }

          return {
            tipo: "texto",
            conteudo: `🏢 **Relatórios por Condomínio:**\n\n${Object.entries(
              analyticsCondominio.vistoriasPorCondominio,
            )
              .sort(([, a], [, b]) => b - a)
              .map(([nome, count]) => `• **${nome}**: ${count} vistorias`)
              .join("\n")}`,
          };
        }

        case "problemas_frequentes": {
          const analyticsProblemas = await obterEstatisticasGerais();
          if (!analyticsProblemas) {
            return { tipo: "texto", conteudo: "Não foi possível obter os dados de problemas." };
          }

          return {
            tipo: "texto",
            conteudo: `🔧 **Problemas Mais Frequentes:**\n\n${analyticsProblemas.problemasFrequentes
              .map((p, i) => `${i + 1}. **${p.item}**\n   └ ${p.count} ocorrências`)
              .join("\n\n")}`,
          };
        }

        case "por_status": {
          const analyticsStatus = await obterEstatisticasGerais();
          if (!analyticsStatus) {
            return { tipo: "texto", conteudo: "Não foi possível obter os dados por status." };
          }

          return {
            tipo: "texto",
            conteudo: `📋 **Vistorias por Status:**\n\n${Object.entries(
              analyticsStatus.vistoriasPorStatus,
            )
              .map(([status, count]) => `• **${status}**: ${count} vistorias`)
              .join("\n")}`,
          };
        }

        case "buscar": {
          // Extrair filtros da mensagem
          const filtros: Parameters<typeof buscarVistoriasPorFiltro>[0] = {};

          if (/condomínio\s+([^,\n]+)/i.test(mensagemOriginal)) {
            filtros.condominio = mensagemOriginal.match(/condomínio\s+([^,\n]+)/i)?.[1]?.trim();
          }

          if (/status\s+([^,\n]+)/i.test(mensagemOriginal)) {
            filtros.status = mensagemOriginal.match(/status\s+([^,\n]+)/i)?.[1]?.trim();
          }

          if (/problema\s+([^,\n]+)/i.test(mensagemOriginal)) {
            filtros.problema = mensagemOriginal.match(/problema\s+([^,\n]+)/i)?.[1]?.trim();
          }

          const vistoriasFiltradas = await buscarVistoriasPorFiltro(filtros);

          if (vistoriasFiltradas.length === 0) {
            return {
              tipo: "texto",
              conteudo: "Nenhuma vistoria encontrada com os filtros especificados.",
            };
          }

          return {
            tipo: "texto",
            conteudo: `🔍 **Encontrei ${vistoriasFiltradas.length} vistoria(s):**\n\n${vistoriasFiltradas
              .slice(0, 10)
              .map(
                v =>
                  `• **${v.numero_interno}** - ${v.condominio?.nome || "N/A"}\n  └ Data: ${new Date(v.data_vistoria).toLocaleDateString("pt-BR")}\n  └ Status: ${v.status}`,
              )
              .join(
                "\n\n",
              )}${vistoriasFiltradas.length > 10 ? "\n\n*Mostrando apenas os primeiros 10 resultados*" : ""}`,
          };
        }

        default:
          return { tipo: "texto", conteudo: "Comando não reconhecido." };
      }
    } catch (error) {
      console.error("Erro ao processar comando de análise:", error);
      return {
        tipo: "texto",
        conteudo: "Ocorreu um erro ao processar sua solicitação de análise.",
      };
    }
  };

  // Detectar o tipo de API baseado na chave
  const detectApiProvider = (apiKey: string) => {
    if (apiKey.startsWith("sk-")) {
      return {
        provider: "openai",
        url: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4o-mini",
      };
    } else if (apiKey.startsWith("gsk_")) {
      return {
        provider: "groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: "llama-3.1-8b-instant",
      };
    }
    return null;
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const apiInfo = detectApiProvider(config.apiKeyOpenAI);

    if (!apiInfo) {
      throw new Error("API Key inválida");
    }

    // Para OpenAI, usar Whisper API
    if (apiInfo.provider === "openai") {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-1");
      formData.append("language", "pt");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKeyOpenAI}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro na transcrição: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    } else {
      // Para Groq, também usar Whisper
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "pt");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKeyOpenAI}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro na transcrição: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    console.log("=== Audio gravado ===");
    console.log("Enable agente:", config.enableAgente);
    console.log("API Key presente:", !!config.apiKeyOpenAI);

    if (!config.enableAgente) {
      toast({
        title: "Agente IA Desabilitado",
        description: "Habilite o agente IA nas configurações primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (!config.apiKeyOpenAI) {
      toast({
        title: "API Key Necessária",
        description: "Configure a API Key (OpenAI ou Groq) nas configurações.",
        variant: "destructive",
      });
      return;
    }

    let targetConversa = conversaAtual;
    if (!targetConversa) {
      console.log("Criando nova conversa para áudio...");
      targetConversa = await criarConversa();
      if (!targetConversa) return;
    }

    setIsLoading(true);

    try {
      // Transcrever o áudio
      const transcription = await transcribeAudio(audioBlob);

      if (!transcription || transcription.trim() === "") {
        toast({
          title: "Áudio Vazio",
          description: "Não foi possível detectar fala no áudio. Tente novamente.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Salvar mensagem do usuário com o ID da conversa
      await adicionarMensagem(transcription, "user", "audio", targetConversa.id);

      // Enviar para a IA
      await sendMessageToAI(transcription, targetConversa.id);
    } catch (error) {
      console.error("Erro ao processar áudio:", error);
      toast({
        title: "Erro no Áudio",
        description: "Não foi possível processar o áudio. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    console.log("=== Enviando mensagem ===");
    console.log("Mensagem:", inputMessage);
    console.log("Conversa atual:", conversaAtual?.id || "nenhuma");

    let targetConversa = conversaAtual;
    if (!targetConversa) {
      console.log("Criando nova conversa...");
      targetConversa = await criarConversa();
      if (!targetConversa) {
        console.error("Falha ao criar nova conversa");
        return;
      }
    }

    await sendMessageToAI(inputMessage, targetConversa.id);
    setInputMessage("");
  };

  const sendMessageToAI = async (messageContent: string, conversaId?: string) => {
    console.log("=== Enviando para IA ===");
    console.log("Enable agente:", config.enableAgente);
    console.log("API Key presente:", !!config.apiKeyOpenAI);
    console.log("Conversa ID:", conversaId || conversaAtual?.id);

    if (!config.enableAgente) {
      toast({
        title: "Agente IA Desabilitado",
        description: "Habilite o agente IA nas configurações.",
        variant: "destructive",
      });
      return;
    }

    if (!config.apiKeyOpenAI) {
      toast({
        title: "API Key Necessária",
        description: "Configure a API Key nas configurações.",
        variant: "destructive",
      });
      return;
    }

    const targetConversaId = conversaId || conversaAtual?.id;
    if (!targetConversaId) {
      console.error("Nenhuma conversa disponível");
      return;
    }

    // Verificar se é um comando especial de análise
    const tipoComando = detectarComandoAnalise(messageContent);

    if (tipoComando) {
      console.log("Comando de análise detectado:", tipoComando);

      // Salvar mensagem do usuário
      await adicionarMensagem(messageContent, "user", "text", targetConversaId);

      setIsLoading(true);

      try {
        const resultadoAnalise = await processarComandoAnalise(tipoComando, messageContent);

        if (resultadoAnalise.tipo === "analytics") {
          // Salvar como JSON para poder renderizar o componente visual
          await adicionarMensagem(
            JSON.stringify(resultadoAnalise.conteudo),
            "assistant",
            "analytics",
            targetConversaId,
          );
        } else {
          await adicionarMensagem(
            resultadoAnalise.conteudo as string,
            "assistant",
            "text",
            targetConversaId,
          );
        }

        toast({
          title: "Análise Concluída",
          description: "Dados dos relatórios analisados com sucesso.",
        });
      } catch (error) {
        console.error("Erro ao processar análise:", error);
        await adicionarMensagem(
          "Desculpe, ocorreu um erro ao analisar os dados dos relatórios.",
          "assistant",
          "text",
          targetConversaId,
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const apiInfo = detectApiProvider(config.apiKeyOpenAI);
    if (!apiInfo) {
      toast({
        title: "API Key Inválida",
        description: "A API Key deve começar com 'sk-' (OpenAI) ou 'gsk_' (Groq).",
        variant: "destructive",
      });
      return;
    }

    // Salvar mensagem do usuário se não for áudio
    if (!mensagens.find(m => m.content === messageContent && m.role === "user")) {
      console.log("Salvando mensagem do usuário...");
      await adicionarMensagem(messageContent, "user", "text", targetConversaId);
    }

    setIsLoading(true);

    try {
      // Construir o prompt completo do sistema com contexto de vistorias
      const systemPromptVistorias = `
Você tem acesso aos seguintes comandos especiais para análise de relatórios de vistoria:

COMANDOS DISPONÍVEIS:
- "estatísticas" ou "resumo geral": Mostra estatísticas gerais
- "quantos relatórios" ou "total de vistorias": Mostra quantidade total
- "por condomínio": Agrupa relatórios por condomínio  
- "problemas frequentes": Lista os problemas mais comuns
- "por status": Agrupa relatórios por status
- "buscar por [filtro]": Busca relatórios específicos

EXEMPLOS DE USO:
- "Me mostre as estatísticas gerais"
- "Quantos relatórios temos por condomínio?"
- "Quais são os problemas mais frequentes?"
- "Buscar vistorias do condomínio Villa Real"
- "Filtrar por status Em Andamento"

Quando o usuário mencionar relatórios, vistorias, condomínios, problemas ou estatísticas, sugira estes comandos.
      `;

      const systemPrompt = `${config.promptPersona}\n\n${config.promptObjetivo}\n\n${config.promptComportamento}\n\n${systemPromptVistorias}`;

      console.log("Enviando para:", apiInfo.provider, apiInfo.url);
      console.log("Modelo:", apiInfo.model);
      console.log("System prompt length:", systemPrompt.length);

      const response = await fetch(apiInfo.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKeyOpenAI}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: apiInfo.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...mensagens.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "user",
              content: messageContent,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      console.log("Status da resposta:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro da API:", errorData);
        throw new Error(
          `Erro na API ${apiInfo.provider}: ${response.status} - ${JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json();
      console.log("Resposta recebida:", data);

      // Salvar resposta da IA
      console.log("Salvando resposta da IA...");
      await adicionarMensagem(
        data.choices[0].message.content,
        "assistant",
        "text",
        targetConversaId,
      );

      toast({
        title: "Mensagem Enviada",
        description: `Resposta recebida via ${apiInfo.provider.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro na Comunicação",
        description: `Não foi possível se comunicar com a IA. Erro: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEditarTitulo = (conversaId: string, tituloAtual: string) => {
    setEditandoTitulo(conversaId);
    setNovoTitulo(tituloAtual);
  };

  const handleSalvarTitulo = async () => {
    if (editandoTitulo && novoTitulo.trim()) {
      await atualizarTituloConversa(editandoTitulo, novoTitulo.trim());
    }
    setEditandoTitulo(null);
    setNovoTitulo("");
  };

  // Função para baixar conversa como PDF
  const handleDownloadConversation = async () => {
    if (!conversaAtual || mensagens.length === 0) {
      toast({
        title: "Nenhuma Conversa",
        description: "Selecione uma conversa com mensagens para baixar.",
        variant: "destructive",
      });
      return;
    }

    // Montar o conteúdo da conversa
    let content = `CONVERSA: ${conversaAtual.titulo}\n`;
    content += `Data: ${new Date(conversaAtual.created_at).toLocaleDateString("pt-BR")}\n`;
    content += `Total de mensagens: ${mensagens.length}\n\n`;
    content += "".padEnd(50, "=") + "\n\n";

    mensagens.forEach((mensagem, index) => {
      const tipo = mensagem.role === "user" ? "USUÁRIO" : "PREDIBBOT";
      const timestamp = new Date(mensagem.created_at).toLocaleTimeString("pt-BR");

      content += `[${timestamp}] ${tipo}:\n`;

      if (mensagem.type === "analytics") {
        content += "[RELATÓRIO DE ANÁLISE - Ver dados visuais na interface]\n";
        try {
          const analytics = JSON.parse(mensagem.content);
          content += `Total de vistorias: ${analytics.totalVistorias}\n`;
          if (analytics.vistoriasPorCondominio) {
            content += "Vistorias por condomínio:\n";
            Object.entries(analytics.vistoriasPorCondominio).forEach(([nome, count]) => {
              content += `  - ${nome}: ${count}\n`;
            });
          }
        } catch (e) {
          content += "[Dados de análise não puderam ser processados]\n";
        }
      } else {
        content += `${mensagem.content}\n`;
      }

      content += "\n" + "".padEnd(30, "-") + "\n\n";
    });

    await generateTextReportPDF(content, `Conversa: ${conversaAtual.titulo}`);
  };

  // Detectar o provedor atual para exibir na interface
  const currentProvider = config.apiKeyOpenAI ? detectApiProvider(config.apiKeyOpenAI) : null;

  if (configLoading || chatLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Debug info - remover depois */}
      <div className="fixed top-2 right-2 bg-black text-white p-2 text-xs z-50">
        Debug: API={!!config.apiKeyOpenAI} | Enable={String(config.enableAgente)} | Conversas=
        {conversas.length}
      </div>

      {/* Sidebar com lista de conversas */}
      <div className="w-80 bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Conversas</h3>
          <Button onClick={() => criarConversa()} size="sm">
            <Plus size={16} className="mr-1" />
            Nova
          </Button>
        </div>

        {/* Comandos de análise rápida */}
        <div className="mb-4 p-3 bg-teal-50 rounded-lg">
          <h4 className="text-sm font-semibold text-teal-700 mb-2 flex items-center">
            <BarChart3 size={14} className="mr-1" />
            Análise Rápida
          </h4>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7 text-teal-600"
              onClick={() => setInputMessage("Me mostre as estatísticas gerais")}
            >
              <FileText size={12} className="mr-1" />
              Estatísticas Gerais
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7 text-teal-600"
              onClick={() => setInputMessage("Quantos relatórios temos por condomínio?")}
            >
              <BarChart3 size={12} className="mr-1" />
              Por Condomínio
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7 text-teal-600"
              onClick={() => setInputMessage("Quais são os problemas mais frequentes?")}
            >
              <MessageCircle size={12} className="mr-1" />
              Problemas Frequentes
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-180px)]">
          <div className="space-y-2">
            {conversas.map(conversa => (
              <div
                key={conversa.id}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  conversaAtual?.id === conversa.id
                    ? "bg-teal-50 border-teal-200"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => selecionarConversa(conversa)}
              >
                <div className="flex items-center justify-between">
                  {editandoTitulo === conversa.id ? (
                    <div className="flex-1 flex gap-1">
                      <Input
                        value={novoTitulo}
                        onChange={e => setNovoTitulo(e.target.value)}
                        onKeyPress={e => e.key === "Enter" && handleSalvarTitulo()}
                        onBlur={handleSalvarTitulo}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium truncate">{conversa.titulo}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handleEditarTitulo(conversa.id, conversa.titulo);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 size={12} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            deletarConversa(conversa.id);
                          }}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(conversa.updated_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat principal */}
      <div className="flex-1">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Bot size={20} className="mr-2" />
                {conversaAtual ? conversaAtual.titulo : `Chat com ${config.nomeAgente}`}
                {!config.enableAgente && (
                  <span className="ml-2 text-sm text-red-500 font-normal">(Desabilitado)</span>
                )}
                {!config.apiKeyOpenAI && (
                  <span className="ml-2 text-sm text-red-500 font-normal">(Sem API Key)</span>
                )}
                {currentProvider && (
                  <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    {currentProvider.provider.toUpperCase()}
                  </span>
                )}
                {analyticsLoading && (
                  <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded text-blue-600">
                    Analisando...
                  </span>
                )}
              </CardTitle>
              {conversaAtual && mensagens.length > 0 && (
                <Button
                  onClick={handleDownloadConversation}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  <Download size={16} className="mr-2" />
                  Baixar Conversa
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col space-y-4">
            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
              <div className="space-y-4">
                {!conversaAtual && (
                  <div className="text-center text-gray-500 py-8">
                    <Bot size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Selecione uma conversa ou crie uma nova</p>
                    <p className="text-sm mt-2">para começar a conversar com {config.nomeAgente}</p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left">
                      <h4 className="font-semibold text-blue-700 mb-2">💡 Comandos Especiais:</h4>
                      <ul className="text-sm space-y-1 text-blue-600">
                        <li>• "estatísticas gerais" - Resumo completo</li>
                        <li>• "por condomínio" - Relatórios agrupados</li>
                        <li>• "problemas frequentes" - Issues mais comuns</li>
                        <li>• "buscar por [termo]" - Filtrar relatórios</li>
                      </ul>
                    </div>
                    {!config.enableAgente && (
                      <p className="text-sm mt-2 text-red-500">
                        ⚠️ Agente IA desabilitado nas configurações
                      </p>
                    )}
                    {!config.apiKeyOpenAI && (
                      <p className="text-sm mt-2 text-red-500">⚠️ API Key não configurada</p>
                    )}
                  </div>
                )}

                {conversaAtual && mensagens.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Bot size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Inicie uma conversa com {config.nomeAgente}</p>
                    <p className="text-sm mt-2">
                      Digite sua mensagem, grave um áudio ou use comandos de análise
                    </p>
                    <div className="mt-4 p-4 bg-teal-50 rounded-lg text-left">
                      <h4 className="font-semibold text-teal-700 mb-2">
                        📊 Análise de Relatórios:
                      </h4>
                      <ul className="text-sm space-y-1 text-teal-600">
                        <li>• "Me mostre as estatísticas gerais"</li>
                        <li>• "Quantos relatórios por condomínio?"</li>
                        <li>• "Problemas mais frequentes"</li>
                        <li>• "Buscar vistorias do Villa Real"</li>
                      </ul>
                    </div>
                  </div>
                )}

                {mensagens.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <Bot size={24} className="text-teal-600" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-teal-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {message.type === "analytics" ? (
                        <div className="bg-white rounded-lg p-4">
                          <AnalyticsDisplay
                            analytics={JSON.parse(message.content)}
                            titulo={`Análise - ${conversaAtual?.titulo || "Chat"}`}
                          />
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      <div
                        className={`flex items-center justify-between mt-2 text-xs ${
                          message.role === "user" ? "text-teal-100" : "text-gray-500"
                        }`}
                      >
                        <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                        {message.type === "audio" && <span className="ml-2 opacity-75">🎤</span>}
                        {message.type === "analytics" && (
                          <span className="ml-2 opacity-75">📊</span>
                        )}
                      </div>
                    </div>

                    {message.role === "user" && (
                      <div className="flex-shrink-0">
                        <User size={24} className="text-teal-600" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <Bot size={24} className="text-teal-600" />
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Digite sua mensagem para ${config.nomeAgente} ou use comandos de análise...`}
                disabled={isLoading || !config.enableAgente || !config.apiKeyOpenAI}
                className="flex-1"
              />
              <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                disabled={isLoading || !config.enableAgente || !config.apiKeyOpenAI}
              />
              <Button
                onClick={sendMessage}
                disabled={
                  isLoading || !inputMessage.trim() || !config.enableAgente || !config.apiKeyOpenAI
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Send size={18} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatIAPersistente;
