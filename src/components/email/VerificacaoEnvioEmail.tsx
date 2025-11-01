import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Building, Calendar, User, Users, Send, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DadosEnvio {
  vistoriaId: string;
  nomeCondominio: string;
  numeroInterno: string;
  dataVistoria: string;
  responsavel: string;
  emailPrincipal: string;
  emailsCopia: string[];
}

interface VerificacaoEnvioEmailProps {
  open: boolean;
  onClose: () => void;
  dadosVistoria: {
    id?: string;
    condominio_id: string;
    numero_interno: string;
    data_vistoria: string;
    responsavel: string;
    condominio?: {
      nome: string;
      email?: string;
    };
  };
  onEnviar: (dados: DadosEnvio) => Promise<void>;
}

export const VerificacaoEnvioEmail = ({
  open,
  onClose,
  dadosVistoria,
  onEnviar,
}: VerificacaoEnvioEmailProps) => {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [dadosEnvio, setDadosEnvio] = useState<DadosEnvio>({
    vistoriaId: dadosVistoria.id || "",
    nomeCondominio: dadosVistoria.condominio?.nome || "Não informado",
    numeroInterno: dadosVistoria.numero_interno,
    dataVistoria: dadosVistoria.data_vistoria,
    responsavel: dadosVistoria.responsavel,
    emailPrincipal: "",
    emailsCopia: [],
  });
  const [emailCopiaTemp, setEmailCopiaTemp] = useState("");

  // Carregar dados do condomínio e perfil do usuário
  useEffect(() => {
    const carregarDadosEmail = async () => {
      try {
        // Buscar dados completos do condomínio
        const { data: condominioData, error: condominioError } = await supabase
          .from("condominios")
          .select("nome, email")
          .eq("id", dadosVistoria.condominio_id)
          .single();

        if (condominioError) {
          console.error("Erro ao buscar condomínio:", condominioError);
        }

        // Buscar perfil do usuário atual para emails de cópia
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          console.error("Usuário não autenticado");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("email, email_copia_1, email_copia_2, email_copia_3")
          .eq("id", userData.user.id)
          .single();

        if (profileError) {
          console.error("Erro ao buscar perfil:", profileError);
        }

        const emailsCopia = [];
        if (profileData?.email_copia_1) emailsCopia.push(profileData.email_copia_1);
        if (profileData?.email_copia_2) emailsCopia.push(profileData.email_copia_2);
        if (profileData?.email_copia_3) emailsCopia.push(profileData.email_copia_3);

        setDadosEnvio(prev => ({
          ...prev,
          nomeCondominio: condominioData?.nome || prev.nomeCondominio,
          emailPrincipal: condominioData?.email || profileData?.email || "",
          emailsCopia: emailsCopia.filter(Boolean),
        }));
      } catch (error) {
        console.error("Erro ao carregar dados de email:", error);
        toast({
          title: "Aviso",
          description: "Alguns dados de email não puderam ser carregados. Verifique os campos.",
          variant: "destructive",
        });
      }
    };

    if (open) {
      carregarDadosEmail();
    }
  }, [open, dadosVistoria.condominio_id, toast]);

  const adicionarEmailCopia = () => {
    if (emailCopiaTemp && emailCopiaTemp.includes("@")) {
      if (!dadosEnvio.emailsCopia.includes(emailCopiaTemp)) {
        setDadosEnvio(prev => ({
          ...prev,
          emailsCopia: [...prev.emailsCopia, emailCopiaTemp],
        }));
        setEmailCopiaTemp("");
      } else {
        toast({
          title: "Aviso",
          description: "Este email já está na lista de cópia.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Erro",
        description: "Digite um email válido.",
        variant: "destructive",
      });
    }
  };

  const removerEmailCopia = (index: number) => {
    setDadosEnvio(prev => ({
      ...prev,
      emailsCopia: prev.emailsCopia.filter((_, i) => i !== index),
    }));
  };

  const handleEnviar = async () => {
    if (!dadosEnvio.emailPrincipal || !dadosEnvio.emailPrincipal.includes("@")) {
      toast({
        title: "Erro",
        description: "Email principal é obrigatório e deve ser válido.",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);
    try {
      await onEnviar(dadosEnvio);
      onClose();
    } catch (error) {
      console.error("Erro ao enviar email:", error);
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Verificar Dados para Envio do Relatório
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Vistoria */}
          <Card className="p-4 bg-slate-50">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Informações da Vistoria
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Condomínio</Label>
                <p className="font-medium">{dadosEnvio.nomeCondominio}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Número Interno</Label>
                <p className="font-medium">{dadosEnvio.numeroInterno}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data da Vistoria</Label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatarData(dadosEnvio.dataVistoria)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Responsável</Label>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {dadosEnvio.responsavel}
                </p>
              </div>
            </div>
          </Card>

          <Separator />

          {/* Configuração de Emails */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Destinatários do Email
            </h3>

            {/* Email Principal */}
            <div className="space-y-2">
              <Label htmlFor="emailPrincipal">Email Principal (Síndico do Condomínio) *</Label>
              <Input
                id="emailPrincipal"
                type="email"
                value={dadosEnvio.emailPrincipal}
                onChange={e => setDadosEnvio(prev => ({ ...prev, emailPrincipal: e.target.value }))}
                placeholder="email@sindico.com"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                O relatório será enviado prioritariamente para este email
              </p>
            </div>

            {/* Emails de Cópia */}
            <div className="space-y-3">
              <Label>Emails em Cópia (Opcionais)</Label>

              {/* Lista de emails de cópia */}
              {dadosEnvio.emailsCopia.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dadosEnvio.emailsCopia.map((email, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {email}
                      <button
                        onClick={() => removerEmailCopia(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Adicionar novo email de cópia */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailCopiaTemp}
                  onChange={e => setEmailCopiaTemp(e.target.value)}
                  placeholder="adicionar@email.com"
                  className="flex-1"
                  onKeyPress={e => e.key === "Enter" && adicionarEmailCopia()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarEmailCopia}
                  disabled={!emailCopiaTemp}
                >
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Emails adicionais que receberão cópia do relatório
              </p>
            </div>
          </div>

          <Separator />

          {/* Resumo Final */}
          <Card className="p-4 bg-green-50 border-green-200">
            <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resumo do Envio
            </h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>
                • Email principal: <strong>{dadosEnvio.emailPrincipal || "Não informado"}</strong>
              </p>
              <p>
                • Emails em cópia: <strong>{dadosEnvio.emailsCopia.length}</strong>
              </p>
              <p>
                • Total de destinatários:{" "}
                <strong>
                  {dadosEnvio.emailPrincipal
                    ? 1 + dadosEnvio.emailsCopia.length
                    : dadosEnvio.emailsCopia.length}
                </strong>
              </p>
              <p>
                • Link válido por: <strong>7 dias</strong>
              </p>
            </div>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando || !dadosEnvio.emailPrincipal}
            className="flex items-center gap-2"
          >
            {enviando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
