import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Protocol, CostCenter, PayerEntity, User } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Eye,
  FileCheck,
  Ban,
  Loader2,
  Filter,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface ProtocolWithRelations extends Protocol {
  cadastrador?: User;
  centroCusto?: CostCenter;
  entidadePagadora?: PayerEntity;
}

interface ProtocolListProps {
  title: string;
  description?: string;
  showFilters?: boolean;
  status?: string;
  limit?: number;
}

export default function ProtocolList({
  title,
  description,
  showFilters = true,
  status: initialStatus,
  limit,
}: ProtocolListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<string | undefined>(initialStatus);
  const [cadastradorId, setCadastradorId] = useState<string | undefined>();
  // Estados para diálogos serão implementados posteriormente

  // Consultar protocolos
  const {
    data: protocols = [],
    isLoading,
    refetch,
  } = useQuery<ProtocolWithRelations[]>({
    queryKey: ['/api/protocolos', status, cadastradorId],
    queryFn: async () => {
      let url = '/api/protocolos';
      const params = new URLSearchParams();
      
      if (status) {
        params.append('status', status);
      }
      
      if (cadastradorId) {
        params.append('cadastrador_id', cadastradorId);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar protocolos');
      return res.json();
    },
  });

  // Consultar cadastradores (apenas para admin)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/usuarios'],
    queryFn: async () => {
      // Só buscar se for administrador
      if (user?.perfil !== 'ADMINISTRADOR') return [];
      
      const res = await fetch('/api/usuarios', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar usuários');
      return res.json();
    },
    enabled: user?.perfil === 'ADMINISTRADOR',
  });

  // Filtrar apenas cadastradores
  const cadastradores = users.filter(u => u.perfil === 'CADASTRADOR');

  // Formatador de valores monetários
  const formatCurrency = (value: number | string) => {
    let numValue: number;
    
    // Verificar se é string e converter para número
    if (typeof value === 'string') {
      // Remover símbolos não numéricos exceto ponto decimal
      const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      numValue = parseFloat(cleanValue);
    } else {
      numValue = value;
    }
    
    // Se não for um número válido, retornar um valor padrão
    if (isNaN(numValue)) {
      return 'R$ 0,00';
    }
    
    // Formatar como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  // Função para determinar a cor do badge com base no status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'outline';
      case 'APROVADO':
        return 'default';
      case 'REPROVADO':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Traduzir status para português
  const translateStatus = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente';
      case 'APROVADO':
        return 'Aprovado';
      case 'REPROVADO':
        return 'Reprovado';
      default:
        return status;
    }
  };

  // Traduzir tipo de pagamento para português
  const translatePaymentType = (type: string) => {
    switch (type) {
      case 'BOLETO':
        return 'Boleto';
      case 'PIX':
        return 'PIX';
      default:
        return type;
    }
  };

  // Manipuladores de eventos (temporários - serão implementados posteriormente)
  const handleViewProtocol = (protocol: ProtocolWithRelations) => {
    toast({
      title: "Visualizar protocolo",
      description: `Visualizando protocolo #${protocol.id}. Esta funcionalidade será implementada completamente em breve.`,
    });
  };

  const handleApproveProtocol = (protocol: ProtocolWithRelations) => {
    toast({
      title: "Aprovar protocolo",
      description: `Aprovando protocolo #${protocol.id}. Esta funcionalidade será implementada completamente em breve.`,
    });
  };

  const handleRejectProtocol = (protocol: ProtocolWithRelations) => {
    toast({
      title: "Rejeitar protocolo",
      description: `Rejeitando protocolo #${protocol.id}. Esta funcionalidade será implementada completamente em breve.`,
    });
  };

  // Limitar protocolos se necessário
  const displayProtocols = limit ? protocols.slice(0, limit) : protocols;

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex space-x-2 items-center">
          {(user?.perfil === 'CADASTRADOR' || user?.perfil === 'OPERADOR' || user?.perfil === 'ADMINISTRADOR') && (
            <Link href="/protocolos/novo">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Protocolo
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-60">
              <Select
                value={status || ""}
                onValueChange={(value) => setStatus(value || undefined)}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filtrar por status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="PENDENTE">Pendentes</SelectItem>
                  <SelectItem value="APROVADO">Aprovados</SelectItem>
                  <SelectItem value="REPROVADO">Reprovados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {user?.perfil === 'ADMINISTRADOR' && (
              <div className="w-full md:w-60">
                <Select
                  value={cadastradorId || ""}
                  onValueChange={(value) => setCadastradorId(value || undefined)}
                >
                  <SelectTrigger>
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Filtrar por cadastrador" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os cadastradores</SelectItem>
                    {cadastradores.map((cadastrador) => (
                      <SelectItem key={cadastrador.id} value={cadastrador.id.toString()}>
                        {cadastrador.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : displayProtocols.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-muted/20">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-lg font-medium">Nenhum protocolo encontrado</p>
            <p className="text-sm text-muted-foreground">
              {user?.perfil === 'CADASTRADOR' || user?.perfil === 'OPERADOR' || user?.perfil === 'ADMINISTRADOR'
                ? 'Clique em "Novo Protocolo" para criar um protocolo.'
                : 'Não há protocolos disponíveis com os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Centro Custo</TableHead>
                  <TableHead>Entidade Pagadora</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProtocols.map((protocol) => (
                  <TableRow key={protocol.id}>
                    <TableCell className="font-medium">#{protocol.id}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(protocol.status)}>
                        {translateStatus(protocol.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{protocol.centroCusto?.nome || '-'}</TableCell>
                    <TableCell>{protocol.entidadePagadora?.nome || '-'}</TableCell>
                    <TableCell>{formatCurrency(protocol.valor)}</TableCell>
                    <TableCell>
                      {protocol.data_vencimento
                        ? format(new Date(protocol.data_vencimento), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>{translatePaymentType(protocol.tipo_pagamento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex space-x-2 justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewProtocol(protocol)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {user?.perfil === 'ADMINISTRADOR' && protocol.status === 'PENDENTE' && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleApproveProtocol(protocol)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRejectProtocol(protocol)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Diálogos de protocolos serão implementados em próximas iterações */}
      </CardContent>
    </Card>
  );
}