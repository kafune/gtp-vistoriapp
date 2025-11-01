import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Upload, Save, Eye, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UploadFotos from "./UploadFotos";
import ParecerAssistenteIA from "./ParecerAssistenteIA";
import { Condominio } from "@/hooks/useCondominios";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useAmbientesGrupos } from "@/hooks/useAmbientesGrupos";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FotoComDescricao extends File {
  descricao?: string;
}

interface GrupoVistoria {
  id: string;
  ambiente: string;
  grupo: string;
  item: string;
  status: string;
  parecer: string;
  fotos: FotoComDescricao[];
}

interface VistoriaData {
  condominio: string;
  condominioId: string;
  numeroInterno: string;
  idSequencial: number;
  dataVistoria: string;
  observacoes: string;
  responsavel: string;
  grupos: GrupoVistoria[];
}

interface NovaVistoriaProps {
  onPreview: (data: VistoriaData) => void;
  condominios: Condominio[];
  obterProximoNumero: (condominioId: string) => number;
  incrementarNumero: (condominioId: string) => void;
  initialData?: VistoriaData | null;
}

const NovaVistoria = ({
  onPreview,
  condominios,
  obterProximoNumero,
  incrementarNumero,
  initialData,
}: NovaVistoriaProps) => {
  const { toast } = useToast();
  const { obterUsuariosAtivos } = useUsuarios();
  const { obterAmbientesPorCondominio, obterGruposPorCondominio } = useAmbientesGrupos();
  const usuariosAtivos = obterUsuariosAtivos();

  const [formData, setFormData] = useState<VistoriaData>({
    condominio: "",
    condominioId: "",
    numeroInterno: "",
    idSequencial: 0,
    dataVistoria: new Date().toISOString().split("T")[0],
    observacoes: "",
    responsavel: "",
    grupos: [
      {
        id: "1",
        ambiente: "",
        grupo: "",
        item: "",
        status: "",
        parecer: "",
        fotos: [],
      },
    ],
  });

  // Carrega os dados iniciais quando há dados para edição
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Obter ambientes e grupos baseados no condomínio selecionado
  const ambientesDisponiveis = obterAmbientesPorCondominio(formData.condominioId);
  const gruposDisponiveis = obterGruposPorCondominio(formData.condominioId);

  const statusOptions = ["N/A", "Conforme", "Não Conforme", "Requer Atenção"];

  const handleInputChange = (field: keyof VistoriaData, value: string) => {
    // Validar limite de observações gerais
    if (field === "observacoes" && value.length > 150) {
      toast({
        title: "Limite de Caracteres Excedido",
        description: "As observações gerais devem ter no máximo 150 caracteres.",
        variant: "destructive",
      });
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCondominioChange = (condominioId: string) => {
    const condominio = condominios.find(c => c.id === condominioId);
    if (condominio) {
      const proximoNumero = obterProximoNumero(condominioId);
      setFormData(prev => ({
        ...prev,
        condominioId,
        condominio: condominio.nome,
        idSequencial: proximoNumero,
        numeroInterno: `${new Date().getFullYear()}-${proximoNumero.toString().padStart(4, "0")}`,
      }));
    }
  };

  const handleGrupoChange = (grupoId: string, field: keyof GrupoVistoria, value: string) => {
    // Validar limite do parecer técnico
    if (field === "parecer" && value.length > 200) {
      toast({
        title: "Limite de Caracteres Excedido",
        description: "O parecer técnico deve ter no máximo 200 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      grupos: prev.grupos.map(grupo =>
        grupo.id === grupoId ? { ...grupo, [field]: value } : grupo,
      ),
    }));
  };

  const handleFotosChange = (
    grupoId: string,
    fotos: File[],
    fotosComDescricao?: Array<{ file: File; descricao: string }>,
  ) => {
    if (fotosComDescricao) {
      const fotosComDescricaoExtendidas: FotoComDescricao[] = fotosComDescricao.map(item => {
        const fotoExtendida = item.file as FotoComDescricao;
        fotoExtendida.descricao = item.descricao;
        return fotoExtendida;
      });
      setFormData(prev => ({
        ...prev,
        grupos: prev.grupos.map(grupo =>
          grupo.id === grupoId ? { ...grupo, fotos: fotosComDescricaoExtendidas } : grupo,
        ),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        grupos: prev.grupos.map(grupo => (grupo.id === grupoId ? { ...grupo, fotos } : grupo)),
      }));
    }
  };

  const adicionarGrupo = () => {
    const novoId = (formData.grupos.length + 1).toString();
    const novoGrupo: GrupoVistoria = {
      id: novoId,
      ambiente: "",
      grupo: "",
      item: "",
      status: "",
      parecer: "",
      fotos: [],
    };
    setFormData(prev => ({
      ...prev,
      grupos: [...prev.grupos, novoGrupo],
    }));
  };

  const removerGrupo = (grupoId: string) => {
    if (formData.grupos.length > 1) {
      setFormData(prev => ({
        ...prev,
        grupos: prev.grupos.filter(grupo => grupo.id !== grupoId),
      }));
    }
  };

  const handleSave = () => {
    if (!formData.condominioId) {
      toast({
        title: "Condomínio Obrigatório",
        description: "Por favor, selecione um condomínio.",
        variant: "destructive",
      });
      return;
    }

    incrementarNumero(formData.condominioId);

    console.log("Salvando vistoria:", formData);
    toast({
      title: "Vistoria Salva",
      description: `Vistoria #${formData.numeroInterno} salva com sucesso.`,
    });
  };

  const handlePreview = () => {
    if (!formData.condominioId) {
      toast({
        title: "Condomínio Obrigatório",
        description: "Por favor, selecione um condomínio.",
        variant: "destructive",
      });
      return;
    }
    onPreview(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? "Editar Vistoria" : "Nova Vistoria"}
        </h2>
        <div className="flex space-x-2">
          <Button onClick={handleSave} variant="outline">
            <Save size={18} className="mr-2" />
            Salvar
          </Button>
          <Button onClick={handlePreview} className="bg-teal-600 hover:bg-teal-700">
            <Eye size={18} className="mr-2" />
            Visualizar PDF
          </Button>
        </div>
      </div>

      {/* Dados Básicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar size={20} className="mr-2" />
            Dados Básicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="condominio">Condomínio *</Label>
              {condominios.length === 0 ? (
                <div className="p-3 border border-orange-200 bg-orange-50 rounded-md">
                  <p className="text-sm text-orange-700">
                    Nenhum condomínio cadastrado. Acesse a aba "Condomínios" para cadastrar.
                  </p>
                </div>
              ) : (
                <Select value={formData.condominioId} onValueChange={handleCondominioChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o condomínio" />
                  </SelectTrigger>
                  <SelectContent>
                    {condominios.map(condominio => (
                      <SelectItem key={condominio.id} value={condominio.id}>
                        {condominio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="responsavel">Responsável pela Vistoria</Label>
              {usuariosAtivos.length === 0 ? (
                <div className="p-3 border border-orange-200 bg-orange-50 rounded-md">
                  <p className="text-sm text-orange-700">
                    Nenhum usuário cadastrado. Acesse a aba "Usuários" para cadastrar vistoriadores.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.responsavel}
                  onValueChange={value => handleInputChange("responsavel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosAtivos.map(usuario => (
                      <SelectItem key={usuario.id} value={usuario.nome}>
                        {usuario.nome} {usuario.cargo && `- ${usuario.cargo}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="numeroInterno">Nº Interno</Label>
              <Input
                id="numeroInterno"
                value={formData.numeroInterno}
                readOnly
                className="bg-gray-50"
                placeholder="Selecione um condomínio"
              />
            </div>
            <div>
              <Label htmlFor="idSequencial">ID Sequencial</Label>
              <Input
                id="idSequencial"
                value={formData.idSequencial || ""}
                readOnly
                className="bg-gray-50"
                placeholder="Auto"
              />
            </div>
            <div>
              <Label htmlFor="dataVistoria">Data da Vistoria</Label>
              <Input
                id="dataVistoria"
                type="date"
                value={formData.dataVistoria}
                onChange={e => handleInputChange("dataVistoria", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grupos de Vistoria */}
      {formData.grupos.map((grupo, index) => {
        const condominioAtual = condominios.find(c => c.id === formData.condominioId);
        return (
          <Card key={grupo.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Grupo de Vistoria {index + 1}</CardTitle>
                <div className="flex space-x-2">
                  {formData.grupos.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removerGrupo(grupo.id)}>
                      <Trash2 size={16} className="mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`ambiente-${grupo.id}`}>Ambiente</Label>
                  <Select
                    value={grupo.ambiente}
                    onValueChange={value => handleGrupoChange(grupo.id, "ambiente", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ambientesDisponiveis.map(ambiente => (
                        <SelectItem key={ambiente.id} value={ambiente.nome}>
                          {ambiente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`grupo-${grupo.id}`}>Grupo</Label>
                  <Select
                    value={grupo.grupo}
                    onValueChange={value => handleGrupoChange(grupo.id, "grupo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {gruposDisponiveis.map(grupoOpcao => (
                        <SelectItem key={grupoOpcao.id} value={grupoOpcao.nome}>
                          {grupoOpcao.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`item-${grupo.id}`}>Item</Label>
                  <Input
                    id={`item-${grupo.id}`}
                    value={grupo.item}
                    onChange={e => handleGrupoChange(grupo.id, "item", e.target.value)}
                    placeholder="Ex: 15.0 Sistema de automação..."
                  />
                </div>

                <div>
                  <Label htmlFor={`status-${grupo.id}`}>Status</Label>
                  <Select
                    value={grupo.status}
                    onValueChange={value => handleGrupoChange(grupo.id, "status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor={`parecer-${grupo.id}`}>Parecer Técnico</Label>
                <div className="space-y-2">
                  <Textarea
                    id={`parecer-${grupo.id}`}
                    value={grupo.parecer}
                    onChange={e => handleGrupoChange(grupo.id, "parecer", e.target.value)}
                    placeholder="Descreva o parecer técnico detalhado..."
                    className="min-h-[80px]"
                  />
                  <ParecerAssistenteIA
                    textoAtual={grupo.parecer}
                    onAplicarTexto={texto => handleGrupoChange(grupo.id, "parecer", texto)}
                    contexto={{
                      ambiente: grupo.ambiente,
                      grupo: grupo.grupo,
                      item: grupo.item,
                      status: grupo.status,
                      condominioNome: formData.condominio,
                      responsavel: formData.responsavel,
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs ${grupo.parecer.length > 180 ? "text-red-500" : "text-gray-500"}`}
                    >
                      {grupo.parecer.length}/200 caracteres
                    </span>
                    {grupo.parecer.length > 200 && (
                      <Alert variant="warning" className="mt-2">
                        <AlertDescription>
                          O parecer excede o limite de 200 caracteres e será truncado no PDF.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload de Fotos para este grupo (máximo 2) */}
              <div>
                <Label>Fotos da Vistoria (máximo 2)</Label>
                <UploadFotos
                  onFotosChange={(fotos, fotosComDescricao) =>
                    handleFotosChange(grupo.id, fotos, fotosComDescricao)
                  }
                  maxFotos={2}
                  grupoId={grupo.id}
                  grupoInfo={{
                    ambiente: grupo.ambiente,
                    grupo: grupo.grupo,
                    item: grupo.item,
                    status: grupo.status,
                  }}
                  condominioInfo={
                    condominioAtual
                      ? { id: condominioAtual.id, nome: condominioAtual.nome }
                      : undefined
                  }
                  responsavel={formData.responsavel}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Botão para adicionar novo grupo */}
      <div className="flex justify-center">
        <Button onClick={adicionarGrupo} variant="outline" size="lg">
          <Plus size={18} className="mr-2" />
          Adicionar Novo Grupo de Vistoria
        </Button>
      </div>

      {/* Observações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="observacoes">Observações Gerais</Label>
            <div className="space-y-2">
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={e => handleInputChange("observacoes", e.target.value)}
                placeholder="Observações adicionais..."
                className="min-h-[80px]"
              />
              <div className="flex justify-between items-center">
                <span
                  className={`text-xs ${formData.observacoes.length > 130 ? "text-red-500" : "text-gray-500"}`}
                >
                  {formData.observacoes.length}/150 caracteres
                </span>
                {formData.observacoes.length > 150 && (
                  <Alert variant="warning" className="mt-2">
                    <AlertDescription>
                      As observações excedem o limite de 150 caracteres e serão truncadas no PDF.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovaVistoria;
