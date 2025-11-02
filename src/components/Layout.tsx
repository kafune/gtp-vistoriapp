import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  Users,
  Building,
  Settings,
  MessageSquare,
  Layers,
  BookTemplate,
  LogOut,
  X,
  Brain,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  const { signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (!desktop) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  const menuItems = [
    { id: "vistorias", label: "Vistorias", icon: Home },
    { id: "nova-vistoria", label: "Nova Vistoria", icon: FileText },
    { id: "templates", label: "Templates", icon: BookTemplate },
    { id: "usuarios", label: "Usuários", icon: Users },
    { id: "condominios", label: "Condomínios", icon: Building },
    { id: "ambientes-grupos", label: "Ambientes e Grupos", icon: Layers },
    { id: "base-conhecimento", label: "Base de Conhecimento", icon: BookOpen },
    { id: "chat-ia", label: "Chat IA", icon: MessageSquare },
    { id: "teste-ia-avancada", label: "IA Avançada - Teste", icon: Brain },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  const { isSindico, loading: loadingRole } = useCurrentProfile();
  const isRestrict = isSindico || loadingRole;
  const visibleMenuItems = isRestrict
    ? menuItems.filter(item => ["vistorias"].includes(item.id))
    : menuItems;

  const handleNavigate = (page: string) => {
    onNavigate(page);
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const sidebarWidthClass = sidebarOpen || !isDesktop ? "w-64" : "w-16";
  const sidebarTranslateClass = sidebarOpen || isDesktop ? "translate-x-0" : "-translate-x-full";
  const showLabels = sidebarOpen || !isDesktop;
  const contentMarginClass = sidebarOpen ? "lg:ml-[2rem]" : isDesktop ? "lg:ml-[2rem]" : "lg:ml-0";
  const currentTheme = mounted ? resolvedTheme : "light";
  const isDark = currentTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const MenuIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      className={className}
      fill="currentColor"
    >
      <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm280-80h280v-560H480v560Z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile overlay */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 ${sidebarWidthClass} bg-muted text-card-foreground backdrop-blur-sm shadow-lg flex flex-col
        ${sidebarTranslateClass} lg:sticky lg:top-0 lg:h-screen transition-all duration-300 ease-in-out
      `}
      >
        <div className="p-4 lg:p-6 flex-shrink-0">
          <div className={`flex items-center ${showLabels ? "justify-between" : "justify-center"}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isDesktop) {
                  setSidebarOpen(prev => !prev);
                } else {
                  setSidebarOpen(false);
                }
              }}
            >
              <MenuIcon className="h-6 w-6" />
            </Button>
            {showLabels && (
              <div className="ml-5 text-right">
                <h1 className="text-lg lg:text-m font-bold text-foreground">
                  Sistema de Vistorias
                </h1>
                <p className="text-xs lg:text-sm text-muted-foreground mt-1">Relatórios Técnicos</p>
              </div>
            )}
          </div>
        </div>

        <nav className="px-2 lg:px-3 pb-4 flex-1 overflow-y-auto">
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                className={`w-full ${showLabels ? "justify-start" : "justify-center"} mb-2 ${
                  currentPage === item.id
                    ? "bg-teal-600 hover:bg-teal-700 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon className={showLabels ? "mr-3 h-4 w-4 flex-shrink-0" : "h-5 w-5"} />
                {showLabels && <span className="truncate text-sm lg:text-base">{item.label}</span>}
              </Button>
            );
          })}

          <div className="mt-4">
            <Button
              variant="ghost"
              className={`w-full ${showLabels ? "justify-start" : "justify-center"} hover:bg-muted`}
              onClick={toggleTheme}
            >
              {isDark ? (
                <Sun className={showLabels ? "mr-3 h-4 w-4 flex-shrink-0" : "h-5 w-5"} />
              ) : (
                <Moon className={showLabels ? "mr-3 h-4 w-4 flex-shrink-0" : "h-5 w-5"} />
              )}
              {showLabels && (
                <span className="truncate text-sm lg:text-base">
                  {isDark ? "Tema claro" : "Tema escuro"}
                </span>
              )}
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <Button
              variant="ghost"
              className={`w-full ${showLabels ? "justify-start" : "justify-center"} text-red-600 hover:text-red-500/90 hover:bg-red-500/10 text-sm lg:text-base`}
              onClick={handleLogout}
            >
              <LogOut className={showLabels ? "mr-3 h-4 w-4 flex-shrink-0" : "h-5 w-5"} />
              {showLabels && <span className="truncate">Sair</span>}
            </Button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col transition-[margin] duration-300 ease-in-out ${contentMarginClass}`}
      >
        {/* Mobile header */}
        <div className="lg:hidden bg-background shadow-sm p-4 flex items-center justify-between sticky top-0 z-30 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <MenuIcon className="h-6 w-6" />
          </Button>
          <h2 className="font-semibold text-foreground truncate">
            {visibleMenuItems.find(item => item.id === currentPage)?.label ||
              "Sistema de Vistorias"}
          </h2>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
