import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Building } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { signIn, user, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPasswordForm, setNewPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  // Formulários
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Verificar se há token de reset na URL e redirecionar se já estiver logado
  useEffect(() => {
    document.title = "Entrar | Sistema de Vistorias";

    // Verificar se há um token de recuperação na URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const type = urlParams.get("type");

    if (accessToken && type === "recovery") {
      setShowNewPassword(true);
      setShowResetPassword(false);
    }

    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!loginForm.email || !loginForm.password) {
      setError("Preencha todos os campos");
      setLoading(false);
      return;
    }

    const { error } = await signIn(loginForm.email, loginForm.password);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos");
      } else if (error.message.includes("Email not confirmed")) {
        setError(
          "Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.",
        );
      } else if (error.message.includes("signup_disabled")) {
        setError("Cadastro desabilitado. Entre em contato com o administrador.");
      } else {
        setError("Erro ao fazer login: " + error.message);
      }
    } else {
      navigate("/");
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!resetEmail) {
      setError("Digite seu email");
      setLoading(false);
      return;
    }

    const { error } = await resetPassword(resetEmail);

    if (error) {
      setError("Erro ao enviar email de redefinição: " + error.message);
    } else {
      setSuccess("Email de redefinição enviado! Verifique sua caixa de entrada.");
      setShowResetPassword(false);
      setResetEmail("");
    }

    setLoading(false);
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!newPasswordForm.password || !newPasswordForm.confirmPassword) {
      setError("Preencha todos os campos");
      setLoading(false);
      return;
    }

    if (newPasswordForm.password !== newPasswordForm.confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (newPasswordForm.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPasswordForm.password,
    });

    if (error) {
      setError("Erro ao atualizar senha: " + error.message);
    } else {
      setSuccess("Senha atualizada com sucesso! Você já está logado.");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Building className="mx-auto h-12 w-12 text-teal-600 dark:text-teal-400" />
          <h2 className="mt-4 text-3xl font-bold text-foreground">Sistema de Vistorias</h2>
          <p className="mt-2 text-sm text-muted-foreground">Acesse sua conta</p>
        </div>

        <Card className="bg-card text-card-foreground border border-border shadow-sm">
          <CardContent className="p-6">
            <CardHeader className="px-0 pt-0 pb-4">
              <CardTitle className="text-xl text-foreground">
                {showNewPassword
                  ? "Definir Nova Senha"
                  : showResetPassword
                    ? "Redefinir Senha"
                    : "Entrar na sua conta"}
              </CardTitle>
            </CardHeader>

            {showNewPassword ? (
              <form onSubmit={handleNewPassword} className="space-y-4">
                <div>
                  <Label htmlFor="new-password" className="text-foreground">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Sua nova senha"
                      className="pl-10"
                      value={newPasswordForm.password}
                      onChange={e =>
                        setNewPasswordForm({ ...newPasswordForm, password: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-foreground">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirme sua nova senha"
                      className="pl-10"
                      value={newPasswordForm.confirmPassword}
                      onChange={e =>
                        setNewPasswordForm({ ...newPasswordForm, confirmPassword: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={loading}
                >
                  {loading ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </form>
            ) : !showResetPassword ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-password" className="text-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      className="pl-10"
                      value={loginForm.password}
                      onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-teal-600 hover:text-teal-500 text-sm underline"
                    onClick={() => setShowResetPassword(true)}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Cadastro somente via Administrador.
                </p>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar Link de Redefinição"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-sm underline"
                    onClick={() => setShowResetPassword(false)}
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}

            {success && (
              <Alert className="mt-4 border border-green-500/30 bg-green-500/10 text-green-700">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="mt-4 border border-red-500/30 bg-red-500/10 text-red-600">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
