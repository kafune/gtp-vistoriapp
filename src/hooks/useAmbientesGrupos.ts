import { useCallback, useEffect, useMemo, useState } from "react";

export interface Ambiente {
  id: string;
  nome: string;
  condominioId?: string;
  dataCriacao: string;
}

export interface GrupoVistoria {
  id: string;
  nome: string;
  condominioId?: string;
  dataCriacao: string;
}

export const useAmbientesGrupos = () => {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [grupos, setGrupos] = useState<GrupoVistoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Ambientes padrão
  const ambientesPadrao = useMemo<Ambiente[]>(
    () => [
      { id: "default-1", nome: "Térreo", dataCriacao: new Date().toISOString() },
      { id: "default-2", nome: "1º Andar", dataCriacao: new Date().toISOString() },
      { id: "default-3", nome: "2º Andar", dataCriacao: new Date().toISOString() },
      { id: "default-4", nome: "3º Andar", dataCriacao: new Date().toISOString() },
      { id: "default-5", nome: "Subsolo", dataCriacao: new Date().toISOString() },
      { id: "default-6", nome: "Cobertura", dataCriacao: new Date().toISOString() },
      { id: "default-7", nome: "Área Externa", dataCriacao: new Date().toISOString() },
    ],
    [],
  );

  // Grupos padrão
  const gruposPadrao = useMemo<GrupoVistoria[]>(
    () => [
      {
        id: "default-1",
        nome: "Inspeção Predial (PMUO) [ABNT NBR 5674]",
        dataCriacao: new Date().toISOString(),
      },
      { id: "default-2", nome: "Estrutural", dataCriacao: new Date().toISOString() },
      { id: "default-3", nome: "Instalações Elétricas", dataCriacao: new Date().toISOString() },
      { id: "default-4", nome: "Instalações Hidráulicas", dataCriacao: new Date().toISOString() },
      { id: "default-5", nome: "Vedações", dataCriacao: new Date().toISOString() },
      { id: "default-6", nome: "Cobertura", dataCriacao: new Date().toISOString() },
    ],
    [],
  );

  const carregarDados = useCallback(() => {
    try {
      const ambientesSalvos = localStorage.getItem("ambientes");
      const gruposSalvos = localStorage.getItem("grupos");

      if (ambientesSalvos) {
        setAmbientes(JSON.parse(ambientesSalvos));
      } else {
        setAmbientes(ambientesPadrao);
        localStorage.setItem("ambientes", JSON.stringify(ambientesPadrao));
      }

      if (gruposSalvos) {
        setGrupos(JSON.parse(gruposSalvos));
      } else {
        setGrupos(gruposPadrao);
        localStorage.setItem("grupos", JSON.stringify(gruposPadrao));
      }
    } catch (error) {
      console.error("Erro ao carregar ambientes e grupos:", error);
      setAmbientes(ambientesPadrao);
      setGrupos(gruposPadrao);
    } finally {
      setLoading(false);
    }
  }, [ambientesPadrao, gruposPadrao]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const adicionarAmbiente = (nome: string, condominioId?: string) => {
    const novoAmbiente: Ambiente = {
      id: Date.now().toString(),
      nome,
      condominioId,
      dataCriacao: new Date().toISOString(),
    };

    const novosAmbientes = [...ambientes, novoAmbiente];
    setAmbientes(novosAmbientes);
    localStorage.setItem("ambientes", JSON.stringify(novosAmbientes));
    return novoAmbiente;
  };

  const adicionarGrupo = (nome: string, condominioId?: string) => {
    const novoGrupo: GrupoVistoria = {
      id: Date.now().toString(),
      nome,
      condominioId,
      dataCriacao: new Date().toISOString(),
    };

    const novosGrupos = [...grupos, novoGrupo];
    setGrupos(novosGrupos);
    localStorage.setItem("grupos", JSON.stringify(novosGrupos));
    return novoGrupo;
  };

  const removerAmbiente = (id: string) => {
    const novosAmbientes = ambientes.filter(ambiente => ambiente.id !== id);
    setAmbientes(novosAmbientes);
    localStorage.setItem("ambientes", JSON.stringify(novosAmbientes));
  };

  const removerGrupo = (id: string) => {
    const novosGrupos = grupos.filter(grupo => grupo.id !== id);
    setGrupos(novosGrupos);
    localStorage.setItem("grupos", JSON.stringify(novosGrupos));
  };

  const obterAmbientesPorCondominio = (condominioId?: string) => {
    return ambientes.filter(
      ambiente => !ambiente.condominioId || ambiente.condominioId === condominioId,
    );
  };

  const obterGruposPorCondominio = (condominioId?: string) => {
    return grupos.filter(grupo => !grupo.condominioId || grupo.condominioId === condominioId);
  };

  return {
    ambientes,
    grupos,
    loading,
    adicionarAmbiente,
    adicionarGrupo,
    removerAmbiente,
    removerGrupo,
    obterAmbientesPorCondominio,
    obterGruposPorCondominio,
  };
};
