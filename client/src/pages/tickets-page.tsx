import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, MoreHorizontal } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ticket {
  id: number;
  protocolo_id: number;
  operador_id: number;
  descricao: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
  operador?: {
    id: number;
    nome: string;
    perfil: string;
  };
  protocolo?: {
    id: number;
    valor: string;
    centro_custo_id: number;
    entidade_pagadora_id: number;
    centroCusto?: {
      nome: string;
    };
    entidadePagadora?: {
      nome: string;
    };
  };
}

export default function TicketsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Buscar chamados
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/chamados'],
  });
  
  // Filtrar por status, se necessário
  const filteredTickets = statusFilter
    ? tickets?.filter(ticket => ticket.status === statusFilter)
    : tickets;
  
  // Mutação para atualizar status do chamado
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/chamados/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chamados'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/estatisticas'] });
      toast({
        title: "Status atualizado",
        description: "O status do chamado foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleStatusChange = (id: number, status: string) => {
    updateTicketStatusMutation.mutate({ id, status });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ABERTO":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Aberto</Badge>;
      case "EM_ANDAMENTO":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Em Andamento</Badge>;
      case "RESOLVIDO":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Resolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR,
    });
  };
  
  return (
    <MainLayout title="Chamados">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Chamados</CardTitle>
          <div className="flex items-center space-x-2">
            <Select
              value={statusFilter || ""}
              onValueChange={(value) => setStatusFilter(value || null)}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{statusFilter ? `Status: ${statusFilter}` : "Todos os status"}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ABERTO">Aberto</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredTickets && filteredTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>#{ticket.id}</TableCell>
                      <TableCell>#{ticket.protocolo_id}</TableCell>
                      <TableCell>
                        {ticket.operador?.nome || `ID: ${ticket.operador_id}`}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={ticket.descricao}>
                        {ticket.descricao}
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell title={new Date(ticket.criado_em).toLocaleString('pt-BR')}>
                        {formatRelativeTime(ticket.criado_em)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {ticket.status !== "ABERTO" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(ticket.id, "ABERTO")}
                              >
                                Marcar como Aberto
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "EM_ANDAMENTO" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(ticket.id, "EM_ANDAMENTO")}
                              >
                                Marcar como Em Andamento
                              </DropdownMenuItem>
                            )}
                            {ticket.status !== "RESOLVIDO" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(ticket.id, "RESOLVIDO")}
                              >
                                Marcar como Resolvido
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum chamado encontrado
              {statusFilter && ` com o status "${statusFilter}"`}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
