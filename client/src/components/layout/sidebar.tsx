import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Home, 
  FileText, 
  FileUp, 
  Headphones, 
  Users, 
  Building, 
  Banknote,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isAdmin = user?.perfil === "ADMINISTRADOR";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Obter iniciais do nome para o avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sidebarLinks = [
    { href: "/", label: "Dashboard", icon: <Home className="mr-3 h-5 w-5" /> },
    { href: "/protocolos", label: "Protocolos", icon: <FileText className="mr-3 h-5 w-5" /> },
    { href: "/remessas", label: "Remessas", icon: <FileUp className="mr-3 h-5 w-5" /> },
    { href: "/chamados", label: "Chamados", icon: <Headphones className="mr-3 h-5 w-5" /> },
  ];

  const adminLinks = [
    { href: "/usuarios", label: "Usuários", icon: <Users className="mr-3 h-5 w-5" /> },
    { href: "/centros-custo", label: "Centros de Custo", icon: <Building className="mr-3 h-5 w-5" /> },
    { href: "/entidades-pagadoras", label: "Entidades Pagadoras", icon: <Banknote className="mr-3 h-5 w-5" /> },
  ];

  return (
    <>
      {/* Overlay para fechar no mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "sidebar shadow-lg",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center h-16 px-4 border-b border-sidebar">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
              <Building className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">SisFinConstrutora</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {sidebarLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center px-2 py-2 text-base font-medium rounded-md group transition-colors",
                  location === link.href
                    ? "bg-sidebar-accent text-white"
                    : "text-gray-300 hover:bg-sidebar-accent"
                )}
              >
                {link.icon}
                {link.label}
              </div>
            </Link>
          ))}

          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administração
              </h3>
              <div className="mt-2 space-y-1">
                {adminLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <div
                      className={cn(
                        "flex items-center px-2 py-2 text-base font-medium rounded-md group transition-colors",
                        location === link.href
                          ? "bg-sidebar-accent text-white"
                          : "text-gray-300 hover:bg-sidebar-accent"
                      )}
                    >
                      {link.icon}
                      {link.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="flex-shrink-0 flex border-t border-sidebar-border p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar>
                  <AvatarFallback className="bg-gray-300 text-gray-700">
                    {user?.nome ? getInitials(user.nome) : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user?.nome}</p>
                  <p className="text-xs font-medium text-gray-400">{user?.perfil}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="text-gray-400 hover:text-white hover:bg-sidebar-accent"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}