import React, { useState } from "react";
import Layout from "@/components/Layout";
import NovaVistoriaSupabase from "@/components/NovaVistoriaSupabase";
import ListaVistoriasSupabase from "@/components/ListaVistoriasSupabase";
import Configuracoes from "@/components/Configuracoes";
import GerenciarCondominios from "@/components/GerenciarCondominios";
import GerenciarAmbientesGrupos from "@/components/GerenciarAmbientesGrupos";
import ChatIAPersistente from "@/components/ChatIAPersistente";
import GerenciarUsuarios from "@/components/GerenciarUsuarios";
import GerenciarTemplates from "@/components/GerenciarTemplates";
import TesteDescricaoIAAvancada from "@/components/TesteDescricaoIAAvancada";
import GerenciarBaseConhecimento from "@/components/GerenciarBaseConhecimento";
import { useCondominiosSupabase } from "@/hooks/useCondominiosSupabase";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("vistorias");
  const { condominios } = useCondominiosSupabase();

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleNovaVistoria = () => {
    setCurrentPage("nova-vistoria");
  };

  const handleBackFromNova = () => {
    setCurrentPage("vistorias");
  };

  const renderContent = () => {
    switch (currentPage) {
      case "nova-vistoria":
        return <NovaVistoriaSupabase onBack={handleBackFromNova} />;
      case "templates":
        return <GerenciarTemplates />;
      case "usuarios":
        return <GerenciarUsuarios />;
      case "condominios":
        return <GerenciarCondominios />;
      case "ambientes-grupos": {
        // Converter CondominioSupabase[] para o formato esperado
        const condominiosFormatted = condominios.map(cond => ({
          id: cond.id,
          nome: cond.nome,
          endereco: cond.endereco,
          responsavel: "",
          telefone: cond.telefone || "",
          dataCadastro: cond.created_at,
          proximoNumero: 1,
        }));

        return <GerenciarAmbientesGrupos condominios={condominiosFormatted} />;
      }
      case "base-conhecimento":
        return <GerenciarBaseConhecimento />;
      case "chat-ia":
        return <ChatIAPersistente />;
      case "configuracoes":
        return <Configuracoes />;
      case "teste-ia-avancada":
        return <TesteDescricaoIAAvancada />;
      case "vistorias":
      default:
        return <ListaVistoriasSupabase onNovaVistoria={handleNovaVistoria} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
