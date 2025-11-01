import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useChecklistVistoria } from "@/hooks/useChecklistVistoria";

interface ItemChecklist {
  id: string;
  sistemaId: string;
  elementoId: string;
  tipo: string;
  manifestacoesIds: string[];
  observacoes: string;
}

interface ChecklistVistoriaProps {
  onChecklistChange?: (itens: ItemChecklist[]) => void;
  itensIniciais?: ItemChecklist[];
}

export const ChecklistVistoria: React.FC<ChecklistVistoriaProps> = ({
  onChecklistChange,
  itensIniciais = [],
}) => {
  const {
    sistemasDisponiveis,
    obterElementosPorSistema,
    obterManifestacoesPorElemento,
    obterTiposPorElemento,
  } = useChecklistVistoria();

  const [itensChecklist, setItensChecklist] = useState<ItemChecklist[]>(itensIniciais);

  const adicionarItem = () => {
    const novoItem: ItemChecklist = {
      id: Date.now().toString(),
      sistemaId: "",
      elementoId: "",
      tipo: "",
      manifestacoesIds: [],
      observacoes: "",
    };

    const novosItens = [...itensChecklist, novoItem];
    setItensChecklist(novosItens);
    onChecklistChange?.(novosItens);
  };

  const removerItem = (itemId: string) => {
    const novosItens = itensChecklist.filter(item => item.id !== itemId);
    setItensChecklist(novosItens);
    onChecklistChange?.(novosItens);
  };

  const atualizarItem = <K extends keyof ItemChecklist>(
    itemId: string,
    campo: K,
    valor: ItemChecklist[K],
  ) => {
    const novosItens = itensChecklist.map(item => {
      if (item.id === itemId) {
        const itemAtualizado: ItemChecklist = { ...item, [campo]: valor } as ItemChecklist;

        // Limpar campos dependentes quando sistema ou elemento mudam
        if (campo === "sistemaId") {
          itemAtualizado.elementoId = "";
          itemAtualizado.tipo = "";
          itemAtualizado.manifestacoesIds = [];
        } else if (campo === "elementoId") {
          itemAtualizado.tipo = "";
          itemAtualizado.manifestacoesIds = [];
        }

        return itemAtualizado;
      }
      return item;
    });

    setItensChecklist(novosItens);
    onChecklistChange?.(novosItens);
  };

  const toggleManifestacao = (itemId: string, manifestacaoId: string) => {
    const item = itensChecklist.find(i => i.id === itemId);
    if (!item) return;

    const novasManifestacoes = item.manifestacoesIds.includes(manifestacaoId)
      ? item.manifestacoesIds.filter(id => id !== manifestacaoId)
      : [...item.manifestacoesIds, manifestacaoId];

    atualizarItem(itemId, "manifestacoesIds", novasManifestacoes);
  };

  const obterNomeSistema = (sistemaId: string) => {
    return sistemasDisponiveis.find(s => s.id === sistemaId)?.nome || "";
  };

  const obterNomeElemento = (sistemaId: string, elementoId: string) => {
    const elementos = obterElementosPorSistema(sistemaId);
    return elementos.find(e => e.id === elementoId)?.nome || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Checklist Técnico</h3>
        <Button onClick={adicionarItem} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {itensChecklist.map(item => {
        const elementos = obterElementosPorSistema(item.sistemaId);
        const tipos = obterTiposPorElemento(item.sistemaId, item.elementoId);
        const manifestacoes = obterManifestacoesPorElemento(item.sistemaId, item.elementoId);

        return (
          <Card key={item.id} className="border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Item de Vistoria</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removerItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Seleção do Sistema */}
              <div className="space-y-2">
                <Label>Sistema</Label>
                <Select
                  value={item.sistemaId}
                  onValueChange={value => atualizarItem(item.id, "sistemaId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    {sistemasDisponiveis.map(sistema => (
                      <SelectItem key={sistema.id} value={sistema.id}>
                        {sistema.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção do Elemento */}
              {item.sistemaId && (
                <div className="space-y-2">
                  <Label>Elemento</Label>
                  <Select
                    value={item.elementoId}
                    onValueChange={value => atualizarItem(item.id, "elementoId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o elemento" />
                    </SelectTrigger>
                    <SelectContent>
                      {elementos.map(elemento => (
                        <SelectItem key={elemento.id} value={elemento.id}>
                          {elemento.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seleção do Tipo */}
              {item.elementoId && (
                <div className="space-y-2">
                  <Label>Tipo de Material</Label>
                  <Select
                    value={item.tipo}
                    onValueChange={value => atualizarItem(item.id, "tipo", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de material" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manifestações Patológicas */}
              {item.elementoId && manifestacoes.length > 0 && (
                <div className="space-y-3">
                  <Label>Manifestações Patológicas Identificadas</Label>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border rounded-md p-3">
                    {manifestacoes.map(manifestacao => (
                      <div key={manifestacao.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`${item.id}-${manifestacao.id}`}
                          checked={item.manifestacoesIds.includes(manifestacao.id)}
                          onCheckedChange={() => toggleManifestacao(item.id, manifestacao.id)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`${item.id}-${manifestacao.id}`}
                            className="text-sm cursor-pointer leading-relaxed"
                          >
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {manifestacao.codigo}
                            </span>
                            {manifestacao.descricao}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações Técnicas</Label>
                <Textarea
                  value={item.observacoes}
                  onChange={e => atualizarItem(item.id, "observacoes", e.target.value)}
                  placeholder="Descreva detalhes específicos, recomendações ou observações adicionais..."
                  rows={3}
                />
              </div>

              {/* Resumo do Item */}
              {item.sistemaId && item.elementoId && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Sistema:</strong> {obterNomeSistema(item.sistemaId)}
                    </div>
                    <div>
                      <strong>Elemento:</strong>{" "}
                      {obterNomeElemento(item.sistemaId, item.elementoId)}
                    </div>
                    {item.tipo && (
                      <div>
                        <strong>Tipo:</strong> {item.tipo}
                      </div>
                    )}
                    {item.manifestacoesIds.length > 0 && (
                      <div className="mt-2">
                        <strong>Manifestações:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.manifestacoesIds.map(manifId => {
                            const manif = manifestacoes.find(m => m.id === manifId);
                            return manif ? (
                              <Badge key={manifId} variant="secondary" className="text-xs">
                                {manif.codigo}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {itensChecklist.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-muted-foreground mb-4">
              Nenhum item de checklist adicionado ainda
            </div>
            <Button onClick={adicionarItem} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Item
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
