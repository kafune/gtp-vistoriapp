import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Users, Shield, User, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Usuario, useUsuarios } from "@/hooks/useUsuarios";
import { useCondominiosSupabase } from "@/hooks/useCondominiosSupabase";
import { supabase } from "@/integrations/supabase/client";

const GerenciarUsuarios = () => {
  const { toast } = useToast();
  const { usuarios, adicionarUsuario, atualizarUsuario, removerUsuario } = useUsuarios();
  const { condominios } = useCondominiosSupabase();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [condominioSelecionado, setCondominioSelecionado] = useState<string | undefined>(undefined);
  const [senhaModalAberto, setSenhaModalAberto] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<string>("");
  const [novoUsuarioId, setNovoUsuarioId] = useState<string>("");
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState<string>("");
  const [resetLoading, setResetLoading] = useState(false);
  const [definirSenhaLoading, setDefinirSenhaLoading] = useState(false);
  const [definirSenhaManual, setDefinirSenhaManual] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [formData, setFormData] = useState<Omit<Usuario, "id">>({
    nome: "",
    email: "",
    telefone: "",
    cargo: "",
    ativo: true,
    role: "sindico",
    email_copia_1: "",
    email_copia_2: "",
    email_copia_3: "",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      cargo: "",
      ativo: true,
      role: "sindico",
      email_copia_1: "",
      email_copia_2: "",
      email_copia_3: "",
    });
    setCondominioSelecionado(undefined);
    setEditandoId(null);
    setMostrarFormulario(false);
    setDefinirSenhaManual(false);
    setSenha("");
    setConfirmarSenha("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do usuário.",
        variant: "destructive",
      });
      return;
    }

    if (editandoId) {
      await atualizarUsuario(editandoId, formData);
      toast({
        title: "Usuário atualizado",
        description: "Os dados do usuário foram atualizados com sucesso.",
      });
    } else {
      if (definirSenhaManual) {
        if (!senha || senha.length < 8) {
          toast({
            title: "Senha inválida",
            description: "A senha deve ter pelo menos 8 caracteres.",
            variant: "destructive",
          });
          return;
        }
        if (senha !== confirmarSenha) {
          toast({
            title: "Senhas não coincidem",
            description: "Confirme a senha corretamente.",
            variant: "destructive",
          });
          return;
        }
      }

      const result = await adicionarUsuario(
        formData,
        condominioSelecionado,
        definirSenhaManual ? senha : undefined,
      );

      if (!result?.error) {
        setSenhaGerada(result?.tempPassword || "");
        setNovoUsuarioId(result?.userId || "");
        setNovoUsuarioEmail(formData.email);
        setSenhaModalAberto(true);
        toast({
          title: "Usuário cadastrado",
          description: definirSenhaManual
            ? "Usuário criado com a senha definida."
            : "Usuário criado com sucesso. A senha temporária está abaixo.",
        });
      }
    }

    resetForm();
  };

  const handleEdit = (usuario: Usuario) => {
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      cargo: usuario.cargo,
      ativo: usuario.ativo,
      role: usuario.role,
      email_copia_1: usuario.email_copia_1 || "",
      email_copia_2: usuario.email_copia_2 || "",
      email_copia_3: usuario.email_copia_3 || "",
    });
    setEditandoId(usuario.id);
    setMostrarFormulario(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      removerUsuario(id);
      toast({
        title: "Usuário excluído",
        description: "Usuário removido com sucesso.",
      });
    }
  };

  const handleInputChange = (field: keyof Omit<Usuario, "id">, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users size={24} className="mr-2" />
          Gerenciar Usuários
        </h2>
        <Button
          onClick={() => setMostrarFormulario(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Plus size={18} className="mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Formulário de cadastro/edição */}
      {mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>{editandoId ? "Editar Usuário" : "Novo Usuário"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={e => handleInputChange("nome", e.target.value)}
                    placeholder="Nome do vistoriador"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange("email", e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={e => handleInputChange("telefone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={e => handleInputChange("cargo", e.target.value)}
                    placeholder="Ex: Engenheiro Civil"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Perfil de Acesso</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "sindico") => handleInputChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sindico">
                        <div className="flex items-center">
                          <User size={16} className="mr-2" />
                          Síndico
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center">
                          <Shield size={16} className="mr-2" />
                          Administrador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="condominio">Condomínio (acesso)</Label>
                  <Select
                    value={condominioSelecionado || undefined}
                    onValueChange={value => setCondominioSelecionado(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um condomínio" />
                    </SelectTrigger>
                    <SelectContent>
                      {condominios.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Senha de acesso - somente no cadastro */}
              {!editandoId && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="definir-senha"
                      checked={definirSenhaManual}
                      onCheckedChange={setDefinirSenhaManual}
                    />
                    <Label htmlFor="definir-senha">Definir senha manualmente</Label>
                  </div>
                  {definirSenhaManual && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="senha">Senha</Label>
                        <Input
                          id="senha"
                          type="password"
                          value={senha}
                          onChange={e => setSenha(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                        <Input
                          id="confirmarSenha"
                          type="password"
                          value={confirmarSenha}
                          onChange={e => setConfirmarSenha(e.target.value)}
                          placeholder="Repita a senha"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seção de E-mails para Cópia */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-lg font-medium mb-3 text-gray-700">
                  E-mails para Cópia (Administradores e Conselheiros)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="email_copia_1">E-mail Cópia 1</Label>
                    <Input
                      id="email_copia_1"
                      type="email"
                      value={formData.email_copia_1}
                      onChange={e => handleInputChange("email_copia_1", e.target.value)}
                      placeholder="email1@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email_copia_2">E-mail Cópia 2</Label>
                    <Input
                      id="email_copia_2"
                      type="email"
                      value={formData.email_copia_2}
                      onChange={e => handleInputChange("email_copia_2", e.target.value)}
                      placeholder="email2@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email_copia_3">E-mail Cópia 3</Label>
                    <Input
                      id="email_copia_3"
                      type="email"
                      value={formData.email_copia_3}
                      onChange={e => handleInputChange("email_copia_3", e.target.value)}
                      placeholder="email3@exemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Redefinição de senha - somente na edição */}
              {editandoId && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <h4 className="text-lg font-medium mb-1 text-gray-700">
                    Redefinir senha do usuário
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="redefinir-senha"
                      checked={definirSenhaManual}
                      onCheckedChange={setDefinirSenhaManual}
                    />
                    <Label htmlFor="redefinir-senha">Redefinir senha manualmente</Label>
                  </div>
                  {definirSenhaManual && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="senha-edit">Nova senha</Label>
                          <Input
                            id="senha-edit"
                            type="password"
                            value={senha}
                            onChange={e => setSenha(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmarSenha-edit">Confirmar nova senha</Label>
                          <Input
                            id="confirmarSenha-edit"
                            type="password"
                            value={confirmarSenha}
                            onChange={e => setConfirmarSenha(e.target.value)}
                            placeholder="Repita a senha"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!editandoId) return;
                            if (!senha || senha.length < 8) {
                              toast({
                                title: "Senha inválida",
                                description: "A senha deve ter pelo menos 8 caracteres.",
                                variant: "destructive",
                              });
                              return;
                            }
                            if (senha !== confirmarSenha) {
                              toast({
                                title: "Senhas não coincidem",
                                description: "Confirme a senha corretamente.",
                                variant: "destructive",
                              });
                              return;
                            }
                            try {
                              setDefinirSenhaLoading(true);
                              const { error } = await supabase.functions.invoke(
                                "resetar-senha-usuario",
                                {
                                  body: { userId: editandoId, newPassword: senha },
                                },
                              );
                              if (error) throw error;
                              toast({
                                title: "Senha atualizada",
                                description: "A nova senha foi aplicada com sucesso.",
                              });
                              setSenha("");
                              setConfirmarSenha("");
                              setDefinirSenhaManual(false);
                            } catch (err) {
                              toast({
                                title: "Erro",
                                description: "Não foi possível atualizar a senha.",
                                variant: "destructive",
                              });
                            } finally {
                              setDefinirSenhaLoading(false);
                            }
                          }}
                          disabled={definirSenhaLoading}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {definirSenhaLoading ? "Aplicando..." : "Aplicar nova senha"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={checked => handleInputChange("ativo", checked)}
                />
                <Label htmlFor="ativo">Usuário ativo</Label>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                  {editandoId ? "Atualizar" : "Cadastrar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados ({usuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhum usuário cadastrado ainda.</p>
              <p className="text-sm text-gray-500">Clique em "Novo Usuário" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left">Nome</th>
                    <th className="border border-gray-300 p-3 text-left">Email</th>
                    <th className="border border-gray-300 p-3 text-left">Telefone</th>
                    <th className="border border-gray-300 p-3 text-left">Cargo</th>
                    <th className="border border-gray-300 p-3 text-center">Perfil</th>
                    <th className="border border-gray-300 p-3 text-center">Status</th>
                    <th className="border border-gray-300 p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(usuario => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3">{usuario.nome}</td>
                      <td className="border border-gray-300 p-3">{usuario.email}</td>
                      <td className="border border-gray-300 p-3">{usuario.telefone}</td>
                      <td className="border border-gray-300 p-3">{usuario.cargo}</td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            usuario.role === "admin"
                              ? "bg-purple-200 text-purple-800"
                              : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {usuario.role === "admin" ? (
                            <>
                              <Shield size={12} className="mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User size={12} className="mr-1" />
                              Síndico
                            </>
                          )}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            usuario.ativo
                              ? "bg-green-200 text-green-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3">
                        <div className="flex justify-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(usuario)}>
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(usuario.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={senhaModalAberto} onOpenChange={setSenhaModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dados de acesso do novo usuário</DialogTitle>
            <DialogDescription>
              Copie e envie por e-mail. Recomende que altere a senha no primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                <span className="truncate">{novoUsuarioEmail}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(novoUsuarioEmail)}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>
            <div>
              <Label>Senha temporária</Label>
              <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                <span className="font-mono tracking-wider">{senhaGerada}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(senhaGerada)}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={async () => {
                if (!novoUsuarioId) return;
                try {
                  setResetLoading(true);
                  const { data, error } = await supabase.functions.invoke<{
                    success: boolean;
                    tempPassword: string;
                  }>("resetar-senha-usuario", {
                    body: { userId: novoUsuarioId },
                  });
                  if (error) throw error;
                  if (!data?.tempPassword) {
                    throw new Error("Resposta inválida da função resetar-senha-usuario");
                  }
                  setSenhaGerada(data.tempPassword);
                  toast({
                    title: "Senha atualizada",
                    description: "Nova senha temporária gerada.",
                  });
                } catch (e) {
                  toast({
                    title: "Erro",
                    description: "Não foi possível gerar nova senha.",
                    variant: "destructive",
                  });
                } finally {
                  setResetLoading(false);
                }
              }}
              disabled={resetLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />{" "}
              {resetLoading ? "Gerando..." : "Gerar nova senha"}
            </Button>
            <Button onClick={() => setSenhaModalAberto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenciarUsuarios;
