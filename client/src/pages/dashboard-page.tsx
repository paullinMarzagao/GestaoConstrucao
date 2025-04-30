import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { FileText, CheckCircle, FileUp, AlertTriangle } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import StatusCard from "@/components/dashboard/status-card";
import ProtocolTable from "@/components/dashboard/protocol-table";
import RemittanceTable from "@/components/dashboard/remittance-table";
import TicketsList from "@/components/dashboard/tickets-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NewProtocolForm from "@/components/forms/new-protocol-form";

export default function DashboardPage() {
  const { user } = useAuth();
  const [showNewProtocolModal, setShowNewProtocolModal] = useState(false);
  
  // Buscar estatísticas para o dashboard
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/estatisticas'],
  });
  
  const isAdmin = user?.perfil === "ADMINISTRADOR";
  const isOperator = user?.perfil === "OPERADOR";
  const isRegistrar = user?.perfil === "CADASTRADOR";
  
  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* Ação de Novo Protocolo (apenas para Cadastrador) */}
        {isRegistrar && (
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowNewProtocolModal(true)}
              className="flex items-center"
            >
              <FileText className="mr-2 h-4 w-4" />
              Novo Protocolo
            </Button>
          </div>
        )}
        
        {/* Cards Resumo */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="Protocolos Pendentes"
            value={isStatsLoading ? 0 : stats?.protocolosPendentes || 0}
            icon={<FileText className="h-6 w-6" />}
            viewAllLink="/protocolos?status=PENDENTE"
            variant="warning"
          />
          
          <StatusCard
            title="Protocolos Aprovados"
            value={isStatsLoading ? 0 : stats?.protocolosAprovados || 0}
            icon={<CheckCircle className="h-6 w-6" />}
            viewAllLink="/protocolos?status=APROVADO"
            variant="success"
          />
          
          <StatusCard
            title="Remessas Geradas"
            value={isStatsLoading ? 0 : stats?.remessasGeradas || 0}
            icon={<FileUp className="h-6 w-6" />}
            viewAllLink="/remessas"
            variant="info"
          />
          
          <StatusCard
            title="Chamados Ativos"
            value={isStatsLoading ? 0 : stats?.chamadosAtivos || 0}
            icon={<AlertTriangle className="h-6 w-6" />}
            viewAllLink="/chamados"
            variant="danger"
          />
        </div>
        
        {/* Tabela de Protocolos Pendentes - Admin */}
        {isAdmin && (
          <div className="mb-6">
            <ProtocolTable 
              title="Protocolos Pendentes de Aprovação" 
              description="Protocolos que precisam da sua revisão e aprovação."
              status="PENDENTE"
            />
          </div>
        )}
        
        {/* Tabela de Remessas - Operador */}
        {isOperator && (
          <div className="mb-6">
            <RemittanceTable />
          </div>
        )}
        
        {/* Tabela de Protocolos - Cadastrador */}
        {isRegistrar && user?.id && (
          <div className="mb-6">
            <ProtocolTable 
              title="Meus Protocolos" 
              description="Protocolos que você criou."
              cadastradorId={user.id}
            />
          </div>
        )}
        
        {/* Chamados Recentes - Todos os usuários */}
        <TicketsList />
      </div>
      
      {/* Modal de Novo Protocolo */}
      <Dialog open={showNewProtocolModal} onOpenChange={setShowNewProtocolModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Protocolo Financeiro</DialogTitle>
          </DialogHeader>
          <NewProtocolForm onSuccess={() => setShowNewProtocolModal(false)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
