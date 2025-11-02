import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Trash2, Calendar, Building, User } from "lucide-react";
import { useVistoriasSupabase } from "@/hooks/useVistoriasSupabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import DetalhesVistoria from "./visualizar-vistoria/DetalhesVistoria";
import EditarVistoriaSupabase from "./EditarVistoriaSupabase";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StyledLoader from "@/components/StyledLoader";

interface ListaVistoriasSupabaseProps {
  onNovaVistoria: () => void;
}

const ListaVistoriasSupabase = ({ onNovaVistoria }: ListaVistoriasSupabaseProps) => {
  const { vistorias, loading, excluirVistoria } = useVistoriasSupabase();
  const [numeroFiltro, setNumeroFiltro] = useState("");
  const [condominioFiltro, setCondominioFiltro] = useState<"todos" | string>("todos");
  const [responsavelFiltro, setResponsavelFiltro] = useState<"todos" | string>("todos");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [vistoriaSelecionada, setVistoriaSelecionada] = useState<string | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const { isSindico, loading: loadingRole } = useCurrentProfile();
  const isRestrict = isSindico || loadingRole;

  const condominiosDisponiveis = useMemo(() => {
    const nomes = vistorias
      .map(v => v.condominio?.nome)
      .filter((nome): nome is string => Boolean(nome));
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [vistorias]);

  const responsaveisDisponiveis = useMemo(() => {
    const nomes = vistorias.map(v => v.responsavel).filter((nome): nome is string => Boolean(nome));
    return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [vistorias]);

  const vistoriasFiltradas = useMemo(() => {
    return vistorias.filter(vistoria => {
      const numeroMatches = numeroFiltro
        ? vistoria.numero_interno.toLowerCase().includes(numeroFiltro.toLowerCase())
        : true;

      const condominioMatches =
        condominioFiltro === "todos" || vistoria.condominio?.nome === condominioFiltro;

      const responsavelMatches =
        responsavelFiltro === "todos" || vistoria.responsavel === responsavelFiltro;

      const data = vistoria.data_vistoria?.slice(0, 10) || "";
      const dataInicialMatches = dataInicial ? data >= dataInicial : true;
      const dataFinalMatches = dataFinal ? data <= dataFinal : true;

      return (
        numeroMatches &&
        condominioMatches &&
        responsavelMatches &&
        dataInicialMatches &&
        dataFinalMatches
      );
    });
  }, [vistorias, numeroFiltro, condominioFiltro, responsavelFiltro, dataInicial, dataFinal]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Conforme":
        return "bg-green-100 text-green-800";
      case "Não Conforme":
        return "bg-red-100 text-red-800";
      case "Requer Atenção":
        return "bg-yellow-100 text-yellow-800";
      case "Em Andamento":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleExcluir = async (id: string) => {
    await excluirVistoria(id);
  };

  const handleVerDetalhes = (vistoriaId: string) => {
    setVistoriaSelecionada(vistoriaId);
    setModoEdicao(false);
  };

  const handleEditar = (vistoriaId: string) => {
    setVistoriaSelecionada(vistoriaId);
    setModoEdicao(true);
  };

  const handleVoltar = () => {
    setVistoriaSelecionada(null);
    setModoEdicao(false);
  };

  const handleLimparFiltros = () => {
    setNumeroFiltro("");
    setCondominioFiltro("todos");
    setResponsavelFiltro("todos");
    setDataInicial("");
    setDataFinal("");
  };

  if (vistoriaSelecionada) {
    const vistoria = vistorias.find(v => v.id === vistoriaSelecionada);

    if (!vistoria) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Vistoria não encontrada.</p>
          <Button onClick={handleVoltar} className="mt-4">
            Voltar à Lista
          </Button>
        </div>
      );
    }

    if (modoEdicao) {
      return <EditarVistoriaSupabase vistoriaId={vistoriaSelecionada} onBack={handleVoltar} />;
    }

    return isRestrict ? (
      <DetalhesVistoria vistoria={vistoria} onBack={handleVoltar} />
    ) : (
      <DetalhesVistoria vistoria={vistoria} onBack={handleVoltar} onEdit={handleEditar} />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <StyledLoader />
        <p className="mt-6 text-sm text-foreground">Carregando vistorias...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-foreground">Vistorias</h2>
        {!isRestrict && (
          <div className="flex justify-start sm:justify-end">
            <Button onClick={onNovaVistoria} className="bg-teal-600 hover:bg-teal-700">
              <Plus size={18} className="mr-2" />
              Nova Vistoria
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="numero_interno">Nº Interno</Label>
            <Input
              id="numero_interno"
              placeholder="Ex.: 2025-0004"
              value={numeroFiltro}
              onChange={e => setNumeroFiltro(e.target.value)}
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Label>Condomínio</Label>
            <Select value={condominioFiltro} onValueChange={setCondominioFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {condominiosDisponiveis.map(nome => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-2">
            <Label>Responsável</Label>
            <Select value={responsavelFiltro} onValueChange={setResponsavelFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {responsaveisDisponiveis.map(nome => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col space-y-2">
            <Label>Período da Vistoria</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={dataInicial}
                onChange={e => setDataInicial(e.target.value)}
                max={dataFinal || undefined}
              />
              <Input
                type="date"
                value={dataFinal}
                onChange={e => setDataFinal(e.target.value)}
                min={dataInicial || undefined}
              />
            </div>
          </div>
        </div>
        <div className="flex">
          <Button variant="outline" onClick={handleLimparFiltros} className="whitespace-nowrap">
            Limpar filtros
          </Button>
        </div>
      </div>

      {vistoriasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Building size={48} className="mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {vistorias.length === 0
              ? "Nenhuma vistoria encontrada"
              : "Nenhuma vistoria corresponde ao filtro"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {vistorias.length === 0
              ? "Comece criando sua primeira vistoria."
              : "Tente ajustar os filtros de busca."}
          </p>
          {vistorias.length === 0 && !isRestrict && (
            <Button onClick={onNovaVistoria} className="bg-teal-600 hover:bg-teal-700">
              <Plus size={18} className="mr-2" />
              Criar Primeira Vistoria
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {vistoriasFiltradas.map(vistoria => (
            <Card
              key={vistoria.id}
              className="hover:shadow-md transition-shadow bg-card text-card-foreground border border-border"
            >
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span>{vistoria.condominio?.nome}</span>
                    <Badge className={getStatusColor(vistoria.status)}>{vistoria.status}</Badge>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerDetalhes(vistoria.id!)}
                    >
                      <Eye size={16} className="mr-1" />
                      Ver
                    </Button>
                    {!isRestrict && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 size={16} className="mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a vistoria #{vistoria.numero_interno}?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleExcluir(vistoria.id!)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="text-teal-600" size={16} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Data</p>
                      <p className="text-foreground">{formatDate(vistoria.data_vistoria)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="text-teal-600" size={16} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                      <p className="text-foreground">{vistoria.responsavel}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="text-teal-600" size={16} />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nº Interno</p>
                      <p className="text-foreground">#{vistoria.numero_interno}</p>
                    </div>
                  </div>
                </div>

                {vistoria.observacoes_gerais && (
                  <div className="mt-4 p-3 rounded bg-muted">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Observações:</span>{" "}
                      {vistoria.observacoes_gerais}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>{vistoria.grupos.length} grupo(s) de vistoria</span>
                  <span>
                    Atualizada em {formatDate(vistoria.updated_at || vistoria.created_at || "")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListaVistoriasSupabase;
