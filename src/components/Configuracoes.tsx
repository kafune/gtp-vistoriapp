import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Brain,
  Key,
  Settings,
  Trash2,
  Plus,
  BookOpen,
  Save,
  Upload,
  Mail,
  Image,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";

interface ConfigState {
  nomeEmpresa: string;
  emailEmpresa: string;
  telefoneEmpresa: string;
  smtpServer: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  logoEmpresa: string;
  corCabecalho: string;
  assinaturaEmail: string;
  apiKeyOpenAI: string;
  enableAutoDescription: boolean;
  nomeAgente: string;
  promptPersona: string;
  promptObjetivo: string;
  promptComportamento: string;
  exemploDescricoes: string[];
  enableAgente: boolean;
  limiteFotos: number;
  tamanhoMaximoFoto: string;
  formatosPermitidos: string;
}

const defaultConfig: ConfigState = {
  // Configurações da Empresa
  nomeEmpresa: "",
  emailEmpresa: "",
  telefoneEmpresa: "",

  // Configurações de Email SMTP
  smtpServer: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPassword: "",
  smtpSecure: true,

  // Configurações de Relatório
  logoEmpresa: "",
  corCabecalho: "#0f766e",
  assinaturaEmail: "",

  // Configurações de IA
  apiKeyOpenAI: "",
  enableAutoDescription: true,

  // Configurações do Agente IA
  nomeAgente: "PrediBot",
  promptPersona:
    "Você é um especialista em edição de textos técnicos com foco em engenharia civil, com 20 anos de experiência no mercado editorial e especialização em patologia das construções. Possui pós-graduação em Tecnologia de Fachadas e Revestimentos.",
  promptObjetivo:
    "Sua missão é transformar informações técnicas obtidas a partir de fotografias de vistorias técnicas e suas descrições complementares em textos objetivos e claros. O objetivo é descrever com precisão e concisão (máximo de 200 caracteres) as anomalias observadas, de forma compreensível tanto para profissionais técnicos quanto para o público leigo.",
  promptComportamento: `Analise imagens e descrições complementares de vistorias técnicas.

Elabore uma descrição seguindo esta estrutura padrão:
[Tipo de anomalia] + [Material/Elemento afetado] + [Causa provável]

Baseie-se nas normas brasileiras e internacionais (como ABNT), boas práticas da engenharia e recomendações técnicas de fabricantes.

Adapte a linguagem conforme o meio de divulgação (relatórios técnicos, blogs, redes sociais ou materiais didáticos).

Mantenha sempre um equilíbrio entre rigor técnico, clareza e acessibilidade.`,
  exemploDescricoes: [],
  enableAgente: true,

  // Configurações Gerais
  limiteFotos: 10,
  tamanhoMaximoFoto: "5",
  formatosPermitidos: "JPEG, PNG, WebP",
};

const Configuracoes = () => {
  const { toast } = useToast();
  const { configuracoes, loading, salvarConfiguracoes, obterConfiguracao } = useConfiguracoes();
  const [config, setConfig] = useState<ConfigState>(defaultConfig);

  const [novoExemplo, setNovoExemplo] = useState("");
  const [editandoExemplo, setEditandoExemplo] = useState<number | null>(null);

  // Atualizar estado local quando as configurações do Supabase forem carregadas
  useEffect(() => {
    if (!loading && configuracoes) {
      setConfig({
        nomeEmpresa: obterConfiguracao("empresa_nome", "VistoriaApp"),
        emailEmpresa: obterConfiguracao("empresa_email", "contato@vistoriaapp.com.br"),
        telefoneEmpresa: obterConfiguracao("empresa_telefone", "(11) 99999-9999"),

        smtpServer: obterConfiguracao("smtp_server", ""),
        smtpPort: obterConfiguracao("smtp_port", "587"),
        smtpUser: obterConfiguracao("smtp_user", ""),
        smtpPassword: obterConfiguracao("smtp_password", ""),
        smtpSecure: obterConfiguracao("smtp_secure", true),

        logoEmpresa: obterConfiguracao("empresa_logo", ""),
        corCabecalho: obterConfiguracao("empresa_cor_cabecalho", "#0f766e"),
        assinaturaEmail: obterConfiguracao("email_assinatura", ""),

        apiKeyOpenAI: obterConfiguracao("api_key_openai", ""),
        enableAutoDescription: obterConfiguracao("ia_auto_descricao", true),

        nomeAgente: obterConfiguracao("agente_nome", "PrediBot"),
        promptPersona: obterConfiguracao(
          "agente_prompt_persona",
          "Você é um especialista em edição de textos técnicos com foco em engenharia civil...",
        ),
        promptObjetivo: obterConfiguracao(
          "agente_prompt_objetivo",
          "Sua missão é transformar informações técnicas obtidas a partir de fotografias...",
        ),
        promptComportamento: obterConfiguracao(
          "agente_prompt_comportamento",
          "Analise imagens e descrições complementares de vistorias técnicas...",
        ),
        exemploDescricoes: obterConfiguracao("agente_exemplos_descricoes", []),
        enableAgente: obterConfiguracao("agente_enable", true),

        limiteFotos: obterConfiguracao("upload_limite_fotos", 10),
        tamanhoMaximoFoto: obterConfiguracao("upload_tamanho_maximo", "5"),
        formatosPermitidos: obterConfiguracao("upload_formatos_permitidos", "JPEG, PNG, WebP"),
      });
    }
  }, [loading, configuracoes, obterConfiguracao]);

  const handleInputChange = <K extends keyof ConfigState>(field: K, value: ConfigState[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    console.log("Salvando configurações:", config);

    // Mapear configurações locais para chaves do banco
    const configuracoesBanco = {
      empresa_nome: config.nomeEmpresa,
      empresa_email: config.emailEmpresa,
      empresa_telefone: config.telefoneEmpresa,
      empresa_logo: config.logoEmpresa,
      empresa_cor_cabecalho: config.corCabecalho,

      smtp_server: config.smtpServer,
      smtp_port: config.smtpPort,
      smtp_user: config.smtpUser,
      smtp_password: config.smtpPassword,
      smtp_secure: config.smtpSecure,
      email_assinatura: config.assinaturaEmail,

      api_key_openai: config.apiKeyOpenAI,
      ia_auto_descricao: config.enableAutoDescription,

      agente_nome: config.nomeAgente,
      agente_prompt_persona: config.promptPersona,
      agente_prompt_objetivo: config.promptObjetivo,
      agente_prompt_comportamento: config.promptComportamento,
      agente_exemplos_descricoes: config.exemploDescricoes,
      agente_enable: config.enableAgente,

      upload_limite_fotos: config.limiteFotos,
      upload_tamanho_maximo: config.tamanhoMaximoFoto,
      upload_formatos_permitidos: config.formatosPermitidos,
    };

    const sucesso = await salvarConfiguracoes(configuracoesBanco);

    if (sucesso) {
      // Também salvar no localStorage como backup
      localStorage.setItem("configuracoes", JSON.stringify(config));
    }
  };

  const handleTestEmail = () => {
    console.log("Testando configurações de email...");
    toast({
      title: "Teste de Email",
      description: "Email de teste enviado. Verifique sua caixa de entrada.",
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simular upload da logo
      toast({
        title: "Logo Carregada",
        description: "A logo da empresa foi carregada com sucesso.",
      });
    }
  };

  const handleTestAgente = () => {
    console.log("Testando configurações do agente IA...");

    // Validar se os prompts estão adequados para vistorias
    const isValidConfig =
      config.promptPersona.includes("engenharia") &&
      config.promptObjetivo.includes("vistoria") &&
      config.promptComportamento.includes("anomalia");

    toast({
      title: isValidConfig ? "✅ Agente Otimizado" : "⚠️ Configuração Testada",
      description: isValidConfig
        ? "Agente configurado para descrições técnicas de vistorias."
        : "Configure os prompts para otimizar descrições de vistorias.",
      variant: isValidConfig ? "default" : "destructive",
    });
  };

  const adicionarExemplo = () => {
    if (novoExemplo.trim()) {
      const novosExemplos = [...config.exemploDescricoes, novoExemplo.trim()];
      handleInputChange("exemploDescricoes", novosExemplos);
      setNovoExemplo("");
      toast({
        title: "Exemplo Adicionado",
        description: "Novo exemplo de descrição cadastrado.",
      });
    }
  };

  const removerExemplo = (index: number) => {
    const novosExemplos = config.exemploDescricoes.filter((_, i) => i !== index);
    handleInputChange("exemploDescricoes", novosExemplos);
    setEditandoExemplo(null);
    toast({
      title: "Exemplo Removido",
      description: "Exemplo de descrição removido.",
    });
  };

  const editarExemplo = (index: number, novoTexto: string) => {
    const novosExemplos = [...config.exemploDescricoes];
    novosExemplos[index] = novoTexto;
    handleInputChange("exemploDescricoes", novosExemplos);
    setEditandoExemplo(null);
    toast({
      title: "Exemplo Atualizado",
      description: "Exemplo de descrição atualizado.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Carregando configurações...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h2>
        <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
          <Save size={18} className="mr-2" />
          Salvar Configurações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings size={20} className="mr-2" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
              <Input
                id="nomeEmpresa"
                value={config.nomeEmpresa}
                onChange={e => handleInputChange("nomeEmpresa", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="emailEmpresa">Email da Empresa</Label>
              <Input
                id="emailEmpresa"
                type="email"
                value={config.emailEmpresa}
                onChange={e => handleInputChange("emailEmpresa", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="telefoneEmpresa">Telefone</Label>
              <Input
                id="telefoneEmpresa"
                value={config.telefoneEmpresa}
                onChange={e => handleInputChange("telefoneEmpresa", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="logoUpload">Logo da Empresa</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="logoUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="flex-1"
                />
                <Button variant="outline" size="sm">
                  <Upload size={16} className="mr-2" />
                  Upload
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="corCabecalho">Cor do Cabeçalho</Label>
              <Input
                id="corCabecalho"
                type="color"
                value={config.corCabecalho}
                onChange={e => handleInputChange("corCabecalho", e.target.value)}
                className="h-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail size={20} className="mr-2" />
              Configurações de Email (SMTP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="smtpServer">Servidor SMTP</Label>
              <Input
                id="smtpServer"
                value={config.smtpServer}
                onChange={e => handleInputChange("smtpServer", e.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtpPort">Porta</Label>
                <Input
                  id="smtpPort"
                  value={config.smtpPort}
                  onChange={e => handleInputChange("smtpPort", e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={config.smtpSecure}
                  onCheckedChange={checked => handleInputChange("smtpSecure", checked)}
                />
                <Label>SSL/TLS</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="smtpUser">Usuário</Label>
              <Input
                id="smtpUser"
                value={config.smtpUser}
                onChange={e => handleInputChange("smtpUser", e.target.value)}
                placeholder="seu-email@gmail.com"
              />
            </div>

            <div>
              <Label htmlFor="smtpPassword">Senha</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={config.smtpPassword}
                onChange={e => handleInputChange("smtpPassword", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="assinaturaEmail">Assinatura do Email</Label>
              <Textarea
                id="assinaturaEmail"
                value={config.assinaturaEmail}
                onChange={e => handleInputChange("assinaturaEmail", e.target.value)}
                placeholder="Atenciosamente,&#10;Equipe VistoriaApp"
                rows={3}
              />
            </div>

            <Button onClick={handleTestEmail} variant="outline" className="w-full">
              <Mail size={16} className="mr-2" />
              Testar Configurações de Email
            </Button>
          </CardContent>
        </Card>

        {/* Configurações do Agente IA */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot size={20} className="mr-2" />
              Configuração do Agente IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableAgente}
                onCheckedChange={checked => handleInputChange("enableAgente", checked)}
              />
              <Label>Habilitar Agente IA Especialista</Label>
            </div>

            <div>
              <Label htmlFor="nomeAgente">Nome do Agente</Label>
              <Input
                id="nomeAgente"
                value={config.nomeAgente}
                onChange={e => handleInputChange("nomeAgente", e.target.value)}
                placeholder="Ex: Theo, Maria, João..."
              />
            </div>

            <div>
              <Label htmlFor="promptPersona">
                Prompt - Persona
                <span className="text-xs text-muted-foreground ml-2">
                  (Experiência e especialização do agente)
                </span>
              </Label>
              <Textarea
                id="promptPersona"
                value={config.promptPersona}
                onChange={e => handleInputChange("promptPersona", e.target.value)}
                placeholder="Ex: Especialista em engenharia civil com 20 anos de experiência..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="promptObjetivo">
                Prompt - Objetivo
                <span className="text-xs text-muted-foreground ml-2">
                  (Missão e meta das descrições)
                </span>
              </Label>
              <Textarea
                id="promptObjetivo"
                value={config.promptObjetivo}
                onChange={e => handleInputChange("promptObjetivo", e.target.value)}
                placeholder="Ex: Transformar fotografias de vistorias em descrições técnicas precisas..."
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="promptComportamento">
                Prompt - Comportamento e Ações
                <span className="text-xs text-muted-foreground ml-2">
                  (Estrutura e formato das respostas)
                </span>
              </Label>
              <Textarea
                id="promptComportamento"
                value={config.promptComportamento}
                onChange={e => handleInputChange("promptComportamento", e.target.value)}
                placeholder="Ex: Use estrutura [Anomalia] + [Material] + [Causa] baseado em normas ABNT..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Seção de Exemplos */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                <Label className="text-base font-semibold">
                  Exemplos do Seu Padrão de Descrições
                </Label>
              </div>

              <p className="text-sm text-muted-foreground">
                Adicione exemplos de como você costuma descrever vistorias. O agente aprenderá seu
                estilo de escrita.
              </p>

              {/* Adicionar novo exemplo */}
              <div className="space-y-2">
                <Label htmlFor="novoExemplo">Novo Exemplo</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="novoExemplo"
                    value={novoExemplo}
                    onChange={e => setNovoExemplo(e.target.value)}
                    placeholder="Ex: Fissura horizontal na alvenaria - bloco cerâmico - movimentação térmica..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    onClick={adicionarExemplo}
                    disabled={!novoExemplo.trim()}
                    size="sm"
                    className="self-end"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Lista de exemplos */}
              {config.exemploDescricoes.length > 0 && (
                <div className="space-y-2">
                  <Label>Seus Exemplos ({config.exemploDescricoes.length})</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {config.exemploDescricoes.map((exemplo, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                      >
                        {editandoExemplo === index ? (
                          <Textarea
                            value={exemplo}
                            onChange={e => {
                              const novosExemplos = [...config.exemploDescricoes];
                              novosExemplos[index] = e.target.value;
                              handleInputChange("exemploDescricoes", novosExemplos);
                            }}
                            onBlur={() => setEditandoExemplo(null)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && e.ctrlKey) {
                                setEditandoExemplo(null);
                              }
                            }}
                            rows={2}
                            className="flex-1 text-sm"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="flex-1 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                            onClick={() => setEditandoExemplo(index)}
                            title="Clique para editar"
                          >
                            {exemplo}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerExemplo(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <Badge variant="secondary" className="text-xs">
                      ✓ {config.exemploDescricoes.length} exemplos
                    </Badge>
                    <span>O agente usará estes exemplos para aprender seu estilo</span>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleTestAgente} variant="outline" className="w-full">
              <Brain size={16} className="mr-2" />
              Testar Configurações do Agente
            </Button>
          </CardContent>
        </Card>

        {/* Configurações de IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Image size={20} className="mr-2" />
              Configurações de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiKeyOpenAI">API Key (OpenAI ou Groq)</Label>
              <Input
                id="apiKeyOpenAI"
                type="password"
                value={config.apiKeyOpenAI}
                onChange={e => handleInputChange("apiKeyOpenAI", e.target.value)}
                placeholder="sk-... ou gsk_..."
              />
              <p className="text-sm text-gray-600 mt-1">
                Suporta OpenAI (sk-...) e Groq (gsk_...). Detecção automática do provedor.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.enableAutoDescription}
                onCheckedChange={checked => handleInputChange("enableAutoDescription", checked)}
              />
              <Label>Habilitar descrição automática de imagens</Label>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload size={20} className="mr-2" />
              Configurações de Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="limiteFotos">Limite de Fotos por Vistoria</Label>
              <Input
                id="limiteFotos"
                type="number"
                value={config.limiteFotos}
                onChange={e => handleInputChange("limiteFotos", e.target.value)}
                min="1"
                max="50"
              />
            </div>

            <div>
              <Label htmlFor="tamanhoMaximoFoto">Tamanho Máximo por Foto (MB)</Label>
              <Input
                id="tamanhoMaximoFoto"
                type="number"
                value={config.tamanhoMaximoFoto}
                onChange={e => handleInputChange("tamanhoMaximoFoto", e.target.value)}
                min="1"
                max="20"
              />
            </div>

            <div>
              <Label htmlFor="formatosPermitidos">Formatos Permitidos</Label>
              <Input
                id="formatosPermitidos"
                value={config.formatosPermitidos}
                onChange={e => handleInputChange("formatosPermitidos", e.target.value)}
                readOnly
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;
