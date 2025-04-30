import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, CheckCircle, XCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Protocol {
  id: number;
  cadastrador_id: number;
  centro_custo_id: number;
  entidade_pagadora_id: number;
  faturamento_direto: boolean;
  valor: string;
  data_vencimento: string;
  tipo_pagamento: string;
  status: string;
  justificativa_reprovacao?: string;
  criado_em: string;
  
  // Dados relacionados (poderiam vir do backend em uma query mais completa)
  cadastrador?: {
    id: number;
    nome: string;
  };
  centroCusto?: {
    id: number;
    nome: string;
  };
  entidadePagadora?: {
    id: number;
    nome: string;
  };
}

interface ProtocolTableProps {
  title: string;
  description: string;
  status?: string;
  cadastradorId?: number;
}

export default function ProtocolTable({ title, description, status, cadastradorId }: ProtocolTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Construir URL baseada nos parâmetros
  const buildQueryUrl = () => {
    let url = "/api/protocolos";
    const params = new URLSearchParams();
    
    if (status) {
      params.append("status", status);
    }
    
    if (cadastradorId) {
      params.append("cadastrador_id", cadastradorId.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  };

  // Buscar protocolos
  const { data: protocols, isLoading } = useQuery<Protocol[]>({
    queryKey: [buildQueryUrl()],
  });

  // Mutação para aprovar protocolo
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/protocolos/${id}/status`, { status: "APROVADO" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/protocolos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/estatisticas"] });
      toast({
        title: "Protocolo aprovado",
        description: "O protocolo foi aprovado com sucesso.",
      });
      setShowApproveDialog(false);
    },
  });

  // Mutação para rejeitar protocolo
  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/protocolos/${id}/status`, { 
        status: "REPROVADO", 
        justificativa_reprovacao: rejectReason 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/protocolos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/estatisticas"] });
      toast({
        title: "Protocolo reprovado",
        description: "O protocolo foi reprovado com sucesso.",
      });
      setRejectReason("");
      setShowRejectDialog(false);
    },
  });

  // Ações
  const handleView = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setShowViewDialog(true);
  };

  const handleApprove = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setShowApproveDialog(true);
  };

  const handleReject = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setShowRejectDialog(true);
  };

  const handleDuplicate = (protocol: Protocol) => {
    toast({
      title: "Função não implementada",
      description: "A duplicação de protocolos será implementada em breve.",
    });
  };

  const confirmApprove = () => {
    if (selectedProtocol) {
      approveMutation.mutate(selectedProtocol.id);
    }
  };

  const confirmReject = () => {
    if (selectedProtocol && rejectReason) {
      rejectMutation.mutate(selectedProtocol.id);
    } else {
      toast({
        title: "Justificativa obrigatória",
        description: "Por favor, forneça uma justificativa para a reprovação.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case "APROVADO":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case "REPROVADO":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Reprovado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : protocols && protocols.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    {user?.perfil !== "CADASTRADOR" && <TableHead>Cadastrador</TableHead>}
                    <TableHead>Centro de Custo</TableHead>
                    <TableHead>Entidade Pagadora</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell>#{protocol.id}</TableCell>
                      {user?.perfil !== "CADASTRADOR" && (
                        <TableCell>{protocol.cadastrador?.nome || "Não identificado"}</TableCell>
                      )}
                      <TableCell>{protocol.centroCusto?.nome || `ID: ${protocol.centro_custo_id}`}</TableCell>
                      <TableCell>{protocol.entidadePagadora?.nome || `ID: ${protocol.entidade_pagadora_id}`}</TableCell>
                      <TableCell>{formatCurrency(protocol.valor)}</TableCell>
                      <TableCell>{formatDate(protocol.data_vencimento)}</TableCell>
                      <TableCell>{getStatusBadge(protocol.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleView(protocol)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                            <span className="sr-only">Ver</span>
                          </Button>
                          
                          {user?.perfil === "ADMINISTRADOR" && protocol.status === "PENDENTE" && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleApprove(protocol)}
                                title="Aprovar protocolo"
                              >
                                <CheckCircle className="h-4 w-4 text-primary" />
                                <span className="sr-only">Aprovar</span>
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleReject(protocol)}
                                title="Reprovar protocolo"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Reprovar</span>
                              </Button>
                            </>
                          )}
                          
                          {user?.perfil === "CADASTRADOR" && protocol.status === "REPROVADO" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDuplicate(protocol)}
                              title="Duplicar protocolo"
                            >
                              <Copy className="h-4 w-4 text-primary" />
                              <span className="sr-only">Duplicar</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum protocolo encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Protocolo #{selectedProtocol?.id}</DialogTitle>
            <DialogDescription>
              Informações completas sobre o protocolo
            </DialogDescription>
          </DialogHeader>
          
          {selectedProtocol && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <div>{getStatusBadge(selectedProtocol.status)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Valor</h4>
                  <div className="text-sm">{formatCurrency(selectedProtocol.valor)}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Centro de Custo</h4>
                <div className="text-sm">{selectedProtocol.centroCusto?.nome || `ID: ${selectedProtocol.centro_custo_id}`}</div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Entidade Pagadora</h4>
                <div className="text-sm">{selectedProtocol.entidadePagadora?.nome || `ID: ${selectedProtocol.entidade_pagadora_id}`}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Data de Vencimento</h4>
                  <div className="text-sm">{formatDate(selectedProtocol.data_vencimento)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tipo de Pagamento</h4>
                  <div className="text-sm capitalize">{selectedProtocol.tipo_pagamento.toLowerCase()}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Faturamento Direto</h4>
                <div className="text-sm">{selectedProtocol.faturamento_direto ? "Sim" : "Não"}</div>
              </div>
              
              {selectedProtocol.status === "REPROVADO" && selectedProtocol.justificativa_reprovacao && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Justificativa da Reprovação</h4>
                  <div className="text-sm">{selectedProtocol.justificativa_reprovacao}</div>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Data de Criação</h4>
                <div className="text-sm">{formatDate(selectedProtocol.criado_em)}</div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowViewDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de aprovação */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Protocolo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar o protocolo #{selectedProtocol?.id}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>Aprovar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de rejeição */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprovar Protocolo</AlertDialogTitle>
            <AlertDialogDescription>
              Informe a justificativa para a reprovação do protocolo #{selectedProtocol?.id}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Informe a justificativa para a reprovação..."
            className="min-h-[100px]"
          />
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
            >
              Reprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
