import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Eye, Download, Banknote, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import NewTicketForm from "../forms/new-ticket-form";

interface Remittance {
  id: number;
  protocolo_id: number;
  caminho_arquivo: string;
  data_entrada_banco: string | null;
  criado_em: string;
  protocolo?: {
    id: number;
    valor: string;
    entidadePagadora?: {
      id: number;
      nome: string;
    };
  };
}

interface GroupedRemittance {
  id: string;
  entidadePagadoraId: number;
  entidadePagadoraNome: string;
  valorTotal: number;
  numProtocolos: number;
  status: "PRONTO" | "ENVIADO";
  protocoloIds: number[];
  arquivoIds: number[];
}

export default function RemittanceTable() {
  const { toast } = useToast();
  const [selectedRemittance, setSelectedRemittance] = useState<GroupedRemittance | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  // Buscar remessas
  const { data: remittances, isLoading } = useQuery<Remittance[]>({
    queryKey: ['/api/remessas'],
  });

  // Mutação para marcar remessa como enviada
  const submitMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/remessas/${id}/enviar`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/remessas'] });
      toast({
        title: "Remessa enviada",
        description: "Remessa marcada como enviada ao banco com sucesso.",
      });
      setShowSubmitDialog(false);
    },
  });

  // Agrupar remessas por entidade pagadora (lógica simulada que seria feita no backend)
  const groupRemittances = (remittances: Remittance[] | undefined): GroupedRemittance[] => {
    if (!remittances) return [];
    
    const groups: Record<string, GroupedRemittance> = {};
    
    remittances.forEach((remittance) => {
      if (!remittance.protocolo?.entidadePagadora) return;
      
      const entidadeId = remittance.protocolo.entidadePagadora.id;
      const entidadeNome = remittance.protocolo.entidadePagadora.nome;
      const groupKey = `entity-${entidadeId}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          entidadePagadoraId: entidadeId,
          entidadePagadoraNome: entidadeNome,
          valorTotal: 0,
          numProtocolos: 0,
          status: "PRONTO",
          protocoloIds: [],
          arquivoIds: [],
        };
      }
      
      const valor = parseFloat(remittance.protocolo.valor || "0");
      groups[groupKey].valorTotal += valor;
      groups[groupKey].numProtocolos += 1;
      groups[groupKey].protocoloIds.push(remittance.protocolo_id);
      groups[groupKey].arquivoIds.push(remittance.id);
      
      // Se qualquer remessa do grupo foi enviada, marcar o grupo como enviado
      if (remittance.data_entrada_banco) {
        groups[groupKey].status = "ENVIADO";
      }
    });
    
    return Object.values(groups);
  };

  const groupedRemittances = groupRemittances(remittances);

  // Ações
  const handleView = (remittance: GroupedRemittance) => {
    setSelectedRemittance(remittance);
    setShowViewDialog(true);
  };

  const handleDownload = (remittance: GroupedRemittance) => {
    toast({
      title: "Download iniciado",
      description: "O arquivo de remessa está sendo baixado.",
    });
  };

  const handleSubmit = (remittance: GroupedRemittance) => {
    setSelectedRemittance(remittance);
    setShowSubmitDialog(true);
  };

  const handleReportIssue = (remittance: GroupedRemittance) => {
    setSelectedRemittance(remittance);
    setShowTicketDialog(true);
  };

  const confirmSubmit = () => {
    if (selectedRemittance) {
      // Para simplificar, marcar o primeiro arquivo como enviado
      submitMutation.mutate(selectedRemittance.arquivoIds[0]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Remessas Disponíveis</CardTitle>
          <CardDescription>
            Protocolos aprovados aguardando entrada no banco.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : groupedRemittances.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Entidade Pagadora</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Protocolos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRemittances.map((remittance) => (
                    <TableRow key={remittance.id}>
                      <TableCell>REM-{remittance.entidadePagadoraId}</TableCell>
                      <TableCell>{remittance.entidadePagadoraNome}</TableCell>
                      <TableCell>{formatCurrency(remittance.valorTotal)}</TableCell>
                      <TableCell>{remittance.numProtocolos} protocolo(s)</TableCell>
                      <TableCell>
                        {remittance.status === "PRONTO" ? (
                          <Badge variant="outline" className="bg-primary-light text-primary">
                            Pronto para envio
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Enviado ao banco
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleView(remittance)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                            <span className="sr-only">Ver</span>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDownload(remittance)}
                            title="Baixar arquivo remessa"
                          >
                            <Download className="h-4 w-4 text-primary" />
                            <span className="sr-only">Baixar</span>
                          </Button>
                          
                          {remittance.status === "PRONTO" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleSubmit(remittance)}
                              title="Marcar como enviado ao banco"
                            >
                              <Banknote className="h-4 w-4 text-blue-600" />
                              <span className="sr-only">Marcar como Enviado</span>
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleReportIssue(remittance)}
                            title="Reportar problema"
                          >
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Reportar Problema</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhuma remessa disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Remessa</DialogTitle>
            <DialogDescription>
              Informações sobre a remessa para {selectedRemittance?.entidadePagadoraNome}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRemittance && (
            <div className="grid gap-4 py-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Entidade Pagadora</h4>
                <div className="text-sm">{selectedRemittance.entidadePagadoraNome}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Valor Total</h4>
                  <div className="text-sm">{formatCurrency(selectedRemittance.valorTotal)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Quantidade de Protocolos</h4>
                  <div className="text-sm">{selectedRemittance.numProtocolos}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <div className="text-sm">
                  {selectedRemittance.status === "PRONTO" ? "Pronto para envio" : "Enviado ao banco"}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">IDs dos Protocolos</h4>
                <div className="text-sm">
                  {selectedRemittance.protocoloIds.map(id => `#${id}`).join(", ")}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de marcar como enviado */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Enviado ao Banco</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar esta remessa como enviada ao banco?
              Esta ação indica que a remessa foi processada pelo banco BTG.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de criar chamado */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reportar Problema</DialogTitle>
            <DialogDescription>
              Informe o problema encontrado na remessa para a entidade {selectedRemittance?.entidadePagadoraNome}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRemittance && (
            <NewTicketForm 
              protocoloIds={selectedRemittance.protocoloIds}
              onSuccess={() => setShowTicketDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
