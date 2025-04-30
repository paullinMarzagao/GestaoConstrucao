import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Plus, FileUp } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/main-layout";
import RemittanceTable from "@/components/dashboard/remittance-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Protocol {
  id: number;
  valor: string;
  centro_custo_id: number;
  entidade_pagadora_id: number;
  status: string;
  data_vencimento: string;
  centroCusto?: { nome: string };
  entidadePagadora?: { nome: string };
}

export default function RemittancesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedProtocolIds, setSelectedProtocolIds] = useState<number[]>([]);
  
  const isOperator = user?.perfil === "OPERADOR";
  const isAdmin = user?.perfil === "ADMINISTRADOR";
  const canGenerateRemittance = isOperator || isAdmin;
  
  // Buscar protocolos aprovados
  const { data: approvedProtocols, isLoading } = useQuery<Protocol[]>({
    queryKey: ['/api/protocolos', { status: 'APROVADO' }],
    enabled: showGenerateModal,
  });
  
  // Mutação para gerar arquivo remessa
  const generateRemittanceMutation = useMutation({
    mutationFn: async (protocoloIds: number[]) => {
      const res = await apiRequest("POST", "/api/remessas/gerar", { protocoloIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remessas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/estatisticas'] });
      toast({
        title: "Remessa gerada com sucesso",
        description: "O arquivo de remessa foi gerado e está disponível para download.",
      });
      setShowGenerateModal(false);
      setSelectedProtocolIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar remessa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleGenerateRemittance = () => {
    if (selectedProtocolIds.length === 0) {
      toast({
        title: "Nenhum protocolo selecionado",
        description: "Selecione pelo menos um protocolo para gerar a remessa.",
        variant: "destructive",
      });
      return;
    }
    
    generateRemittanceMutation.mutate(selectedProtocolIds);
  };
  
  const toggleProtocolSelection = (id: number) => {
    setSelectedProtocolIds(prev =>
      prev.includes(id)
        ? prev.filter(protocolId => protocolId !== id)
        : [...prev, id]
    );
  };
  
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  
  return (
    <MainLayout title="Remessas">
      <div className="space-y-6">
        {canGenerateRemittance && (
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center"
            >
              <FileUp className="mr-2 h-4 w-4" />
              Gerar Arquivo Remessa
            </Button>
          </div>
        )}
        
        <RemittanceTable />
      </div>
      
      {/* Modal de Geração de Remessa */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gerar Arquivo Remessa</DialogTitle>
            <DialogDescription>
              Selecione os protocolos aprovados para incluir no arquivo de remessa para o banco BTG.
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : approvedProtocols && approvedProtocols.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={
                          approvedProtocols.length > 0 && 
                          selectedProtocolIds.length === approvedProtocols.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProtocolIds(approvedProtocols.map(p => p.id));
                          } else {
                            setSelectedProtocolIds([]);
                          }
                        }}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Entidade Pagadora</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedProtocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedProtocolIds.includes(protocol.id)}
                          onCheckedChange={() => toggleProtocolSelection(protocol.id)}
                          aria-label={`Selecionar protocolo #${protocol.id}`}
                        />
                      </TableCell>
                      <TableCell>#{protocol.id}</TableCell>
                      <TableCell>
                        {protocol.centroCusto?.nome || `ID: ${protocol.centro_custo_id}`}
                      </TableCell>
                      <TableCell>
                        {protocol.entidadePagadora?.nome || `ID: ${protocol.entidade_pagadora_id}`}
                      </TableCell>
                      <TableCell>{formatCurrency(protocol.valor)}</TableCell>
                      <TableCell>{formatDate(protocol.data_vencimento)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum protocolo aprovado disponível para geração de remessa.
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowGenerateModal(false)}
              disabled={generateRemittanceMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateRemittance}
              disabled={selectedProtocolIds.length === 0 || generateRemittanceMutation.isPending}
            >
              {generateRemittanceMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  Gerando...
                </>
              ) : (
                "Gerar Remessa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
