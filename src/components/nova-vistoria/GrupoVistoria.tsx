import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Settings, CheckSquare } from "lucide-react";
import { GrupoVistoriaSupabase, ChecklistTecnico } from "@/hooks/useVistoriasSupabase";
import { useChecklistVistoria } from "@/hooks/useChecklistVistoria";
import UploadFotos from "@/components/UploadFotos";
import ParecerAssistenteIA from "@/components/ParecerAssistenteIA";
import { FotoUpload } from "@/hooks/useFotosSupabase";
import { PatologiaResumo } from "@/services/patologiaIA";

interface FotoExistente {
  id: string;
  url: string;
  nome: string;
  descricao: string;
  iaFeedbackId?: string | null;
  iaResumo?: PatologiaResumo | null;
  foiEditado?: boolean;
  isExisting: true;
}

type OnGrupoChange = <K extends keyof GrupoVistoriaSupabase>(
  index: number,
  field: K,
  value: GrupoVistoriaSupabase[K],
) => void;

interface GrupoVistoriaProps {
  grupo: GrupoVistoriaSupabase;
  index: number;
  ambientesDisponiveis: string[];
  gruposDisponiveis: string[];
  statusOptions: string[];
  canRemove: boolean;
  isEditing?: boolean;
  onGrupoChange: OnGrupoChange;
  onRemoverGrupo: (index: number) => void;
  onFotosChange: (index: number, fotos: File[], fotosComDescricao?: FotoUpload[]) => void;
  onFotosExistentesChange?: (grupoIndex: number, fotosAtualizadas: FotoExistente[]) => void;
  vistoriaId?: string;
  condominioInfo?: { id?: string; nome: string; tipo?: string };
  responsavel?: string;
}

const GrupoVistoria = ({
  grupo,
  index,
  ambientesDisponiveis,
  gruposDisponiveis,
  statusOptions,
  canRemove,
  isEditing = false,
  onGrupoChange,
  onRemoverGrupo,
  onFotosChange,
  onFotosExistentesChange,
  vistoriaId,
  condominioInfo,
  responsavel,
}: GrupoVistoriaProps) => {
  const {
    sistemasDisponiveis,
    obterElementosPorSistema,
    obterManifestacoesPorElemento,
    obterTiposPorElemento,
  } = useChecklistVistoria();

  const [modoChecklist, setModoChecklist] = useState(grupo.modo_checklist || false);

  const atualizarChecklist = <K extends keyof ChecklistTecnico>(
    campo: K,
    valor: ChecklistTecnico[K],
  ) => {
    const checklistAtual = grupo.checklist_tecnico || {
      sistemaId: "",
      elementoId: "",
      tipo: "",
      manifestacoesIds: [],
      observacoesTecnicas: "",
    };

    const novoChecklist: ChecklistTecnico = {
      ...checklistAtual,
      [campo]: valor,
    } as ChecklistTecnico;
    onGrupoChange(index, "checklist_tecnico", novoChecklist);
  };

  const toggleModoChecklist = (ativo: boolean) => {
    setModoChecklist(ativo);
    onGrupoChange(index, "modo_checklist", ativo);

    if (ativo && !grupo.checklist_tecnico) {
      onGrupoChange(index, "checklist_tecnico", {
        sistemaId: "",
        elementoId: "",
        tipo: "",
        manifestacoesIds: [],
        observacoesTecnicas: "",
      });
    }
  };

  const toggleManifestacao = (manifestacaoId: string) => {
    const manifestacoesAtuais = grupo.checklist_tecnico?.manifestacoesIds || [];
    const novasManifestacoes = manifestacoesAtuais.includes(manifestacaoId)
      ? manifestacoesAtuais.filter(id => id !== manifestacaoId)
      : [...manifestacoesAtuais, manifestacaoId];

    atualizarChecklist("manifestacoesIds", novasManifestacoes);
  };

  const checklist = grupo.checklist_tecnico;
  const elementos = checklist?.sistemaId ? obterElementosPorSistema(checklist.sistemaId) : [];
  const tipos =
    checklist?.sistemaId && checklist?.elementoId
      ? obterTiposPorElemento(checklist.sistemaId, checklist.elementoId)
      : [];
  const manifestacoes =
    checklist?.sistemaId && checklist?.elementoId
      ? obterManifestacoesPorElemento(checklist.sistemaId, checklist.elementoId)
      : [];

  return (
    <Card className={`border-l-4 ${modoChecklist ? "border-l-primary" : "border-l-teal-500"}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Grupo de Vistoria {index + 1}</CardTitle>
            {modoChecklist && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                Checklist Técnico
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`modo-checklist-${index}`} className="text-sm">
                Modo Técnico
              </Label>
              <Switch
                id={`modo-checklist-${index}`}
                checked={modoChecklist}
                onCheckedChange={toggleModoChecklist}
              />
            </div>
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoverGrupo(index)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {modoChecklist ? (
          /* MODO CHECKLIST TÉCNICO */
          <>
            {/* Seleção do Sistema */}
            <div className="space-y-2">
              <Label>Sistema</Label>
              <Select
                value={checklist?.sistemaId || ""}
                onValueChange={value => atualizarChecklist("sistemaId", value)}
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
            {checklist?.sistemaId && (
              <div className="space-y-2">
                <Label>Elemento</Label>
                <Select
                  value={checklist?.elementoId || ""}
                  onValueChange={value => atualizarChecklist("elementoId", value)}
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
            {checklist?.elementoId && (
              <div className="space-y-2">
                <Label>Tipo de Material</Label>
                <Select
                  value={checklist?.tipo || ""}
                  onValueChange={value => atualizarChecklist("tipo", value)}
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
            {checklist?.elementoId && manifestacoes.length > 0 && (
              <div className="space-y-3">
                <Label>Manifestações Patológicas Identificadas</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {manifestacoes.map(manifestacao => (
                    <div key={manifestacao.id} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id={`${index}-${manifestacao.id}`}
                        checked={checklist?.manifestacoesIds?.includes(manifestacao.id) || false}
                        onChange={() => toggleManifestacao(manifestacao.id)}
                        className="mt-1"
                      />
                      <Label
                        htmlFor={`${index}-${manifestacao.id}`}
                        className="text-sm cursor-pointer leading-relaxed flex-1"
                      >
                        <span className="font-mono text-xs text-muted-foreground mr-2">
                          {manifestacao.codigo}
                        </span>
                        {manifestacao.descricao}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status - Sempre presente */}
            <div className="space-y-2">
              <Label>Status da Vistoria</Label>
              <Select
                value={grupo.status}
                onValueChange={value => onGrupoChange(index, "status", value)}
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

            {/* Observações Técnicas */}
            <div className="space-y-2">
              <Label>Observações Técnicas</Label>
              <Textarea
                value={checklist?.observacoesTecnicas || ""}
                onChange={e => atualizarChecklist("observacoesTecnicas", e.target.value)}
                placeholder="Detalhes específicos, recomendações ou observações técnicas adicionais..."
                rows={3}
              />
            </div>

            {/* Resumo Técnico */}
            {checklist?.sistemaId && checklist?.elementoId && (
              <div className="bg-muted p-3 rounded-md">
                <div className="text-sm space-y-1">
                  <div>
                    <strong>Sistema:</strong>{" "}
                    {sistemasDisponiveis.find(s => s.id === checklist.sistemaId)?.nome}
                  </div>
                  <div>
                    <strong>Elemento:</strong>{" "}
                    {elementos.find(e => e.id === checklist.elementoId)?.nome}
                  </div>
                  {checklist.tipo && (
                    <div>
                      <strong>Tipo:</strong> {checklist.tipo}
                    </div>
                  )}
                  {checklist.manifestacoesIds && checklist.manifestacoesIds.length > 0 && (
                    <div className="mt-2">
                      <strong>Manifestações:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {checklist.manifestacoesIds.map(manifId => {
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
          </>
        ) : (
          /* MODO TRADICIONAL */
          <>
            {/* Ambiente */}
            <div className="space-y-2">
              <Label htmlFor={`ambiente-${index}`}>Ambiente</Label>
              <Select
                value={grupo.ambiente}
                onValueChange={value => onGrupoChange(index, "ambiente", value)}
              >
                <SelectTrigger id={`ambiente-${index}`}>
                  <SelectValue placeholder="Selecione o ambiente" />
                </SelectTrigger>
                <SelectContent>
                  {ambientesDisponiveis.map(ambiente => (
                    <SelectItem key={ambiente} value={ambiente}>
                      {ambiente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grupo */}
            <div className="space-y-2">
              <Label htmlFor={`grupo-${index}`}>Grupo</Label>
              <Select
                value={grupo.grupo}
                onValueChange={value => onGrupoChange(index, "grupo", value)}
              >
                <SelectTrigger id={`grupo-${index}`}>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {gruposDisponiveis.map(grupoItem => (
                    <SelectItem key={grupoItem} value={grupoItem}>
                      {grupoItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item */}
            <div className="space-y-2">
              <Label htmlFor={`item-${index}`}>Item</Label>
              <Textarea
                id={`item-${index}`}
                value={grupo.item}
                onChange={e => onGrupoChange(index, "item", e.target.value)}
                placeholder="Descreva o item a ser vistoriado..."
                className="min-h-[80px]"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor={`status-${index}`}>Status</Label>
              <Select
                value={grupo.status}
                onValueChange={value => onGrupoChange(index, "status", value)}
              >
                <SelectTrigger id={`status-${index}`}>
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

            {/* Parecer */}
            <div className="space-y-2">
              <Label htmlFor={`parecer-${index}`}>Parecer Técnico</Label>
              <Textarea
                id={`parecer-${index}`}
                value={grupo.parecer || ""}
                onChange={e => onGrupoChange(index, "parecer", e.target.value)}
                placeholder="Parecer técnico sobre o item vistoriado..."
                className="min-h-[100px]"
                maxLength={200}
              />
              <ParecerAssistenteIA
                textoAtual={grupo.parecer || ""}
                onAplicarTexto={texto => onGrupoChange(index, "parecer", texto)}
                contexto={{
                  ambiente: grupo.ambiente,
                  grupo: grupo.grupo,
                  item: grupo.item,
                  status: grupo.status,
                  condominioNome: condominioInfo?.nome,
                  responsavel,
                }}
              />
              <p className="text-xs text-gray-500">{(grupo.parecer || "").length}/200 caracteres</p>
            </div>
          </>
        )}

        {/* Upload de Fotos - sempre disponível */}
        <div className="space-y-2">
          <Label>Fotos do Grupo</Label>
          <UploadFotos
            onFotosChange={(fotos, fotosComDescricao) =>
              onFotosChange(index, fotos, fotosComDescricao)
            }
            onFotosExistentesChange={fotosAtualizadas =>
              onFotosExistentesChange?.(index, fotosAtualizadas)
            }
            maxFotos={10}
            grupoId={grupo.id}
            fotosExistentes={grupo.fotos || []}
            grupoInfo={{
              ambiente: grupo.ambiente,
              grupo: grupo.grupo,
              item: grupo.item,
              status: grupo.status,
            }}
            vistoriaId={vistoriaId}
            condominioInfo={condominioInfo}
            responsavel={responsavel}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default GrupoVistoria;
