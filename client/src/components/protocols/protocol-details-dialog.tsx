import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Document, Protocol, Ticket } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProtocolDetailsDialogProps {
  protocol: Protocol;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolDetailsDialog({
  protocol,
  open,
  onOpenChange,
}: ProtocolDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("details");

  // Resetar tab ao abrir o diálogo
  useEffect(() => {
    if (open) {
      setActiveTab("details");
    }
  }, [open]);

  // Consultar documentos do protocolo
  const {
    data: documents = [],
    isLoading: isLoadingDocuments,
  } = useQuery({
    queryKey: [`/api/protocolos/${protocol.id}/documentos`],
    queryFn: async () => {
      const res = await fetch(`/api/protocolos/${protocol.id}/documentos`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar documentos");
      return res.json();
    },
    enabled: open,
  });

  // Consultar chamados do protocolo
  const {
    data: tickets = [],
    isLoading: isLoadingTickets,
  } = useQuery({
    queryKey: [`/api/protocolos/${protocol.id}/chamados`],
    queryFn: async () => {
      const res = await fetch(`/api/protocolos/${protocol.id}/chamados`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao buscar chamados");
      return res.json();
    },
    enabled: open,
  });

  // Formatador de valores monetários
  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(typeof value === "string" ? parseFloat(value) : value);
  };

  // Traduzir status para português
  const translateStatus = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return "Pendente";
      case "APROVADO":
        return "Aprovado";
      case "REPROVADO":
        return "Reprovado";
      default:
        return status;
    }
  };

  // Função para determinar a cor do badge com base no status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDENTE":
        return "warning";
      case "APROVADO":
        return "success";
      case "REPROVADO":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Traduzir tipo do documento para português
  const translateDocumentType = (type: string) => {
    switch (type) {
      case "NOTA_FISCAL":
        return "Nota Fiscal";
      case "ORDEM_COMPRA":
        return "Ordem de Compra";
      case "BOLETO_PIX":
        return "Boleto/Comprovante PIX";
      default:
        return type;
    }
  };

  // Traduzir status do chamado para português
  const translateTicketStatus = (status: string) => {
    switch (status) {
      case "ABERTO":
        return "Aberto";
      case "EM_ANDAMENTO":
        return "Em Andamento";
      case "RESOLVIDO":
        return "Resolvido";
      default:
        return status;
    }
  };

  // Ícone do status do ticket
  const getTicketStatusIcon = (status: string) => {
    switch (status) {
      case "ABERTO":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "EM_ANDAMENTO":
        return <Loader2 className="h-4 w-4 text-blue-500" />;
      case "RESOLVIDO":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Protocolo #{protocol.id}</DialogTitle>
          <DialogDescription>
            {protocol.status === "PENDENTE" && 
              "Este protocolo está aguardando aprovação."}
            {protocol.status === "APROVADO" && 
              "Este protocolo foi aprovado."}
            {protocol.status === "REPROVADO" && 
              "Este protocolo foi reprovado."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="tickets">Chamados</TabsTrigger>
          </TabsList>

          {/* Aba de Detalhes */}
          <TabsContent value="details" className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Status</h3>
                <div>
                  <Badge variant={getStatusBadgeVariant(protocol.status)}>
                    {translateStatus(protocol.status)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Cadastrador</h3>
                <p>{protocol.cadastrador?.nome || "-"}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Centro de Custo</h3>
                <p>{protocol.centroCusto?.nome || "-"}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Entidade Pagadora</h3>
                <p>{protocol.entidadePagadora?.nome || "-"}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Valor</h3>
                <p className="font-semibold">{formatCurrency(protocol.valor)}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Data de Vencimento</h3>
                <p>
                  {protocol.data_vencimento
                    ? format(new Date(protocol.data_vencimento), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })
                    : "-"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Tipo de Pagamento</h3>
                <p>{protocol.tipo_pagamento === "BOLETO" ? "Boleto" : "PIX"}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Faturamento Direto</h3>
                <p>{protocol.faturamento_direto ? "Sim" : "Não"}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Data de Criação</h3>
                <p>
                  {protocol.criado_em
                    ? format(new Date(protocol.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : "-"}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Última Atualização</h3>
                <p>
                  {protocol.atualizado_em
                    ? format(new Date(protocol.atualizado_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : "-"}
                </p>
              </div>
            </div>

            {protocol.status === "REPROVADO" && protocol.justificativa_reprovacao && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-red-600 mb-2">
                  Justificativa de Reprovação
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {protocol.justificativa_reprovacao}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Aba de Documentos */}
          <TabsContent value="documents" className="py-4">
            {isLoadingDocuments ? (
              <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">
                  Nenhum documento encontrado para este protocolo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((document: Document) => (
                  <Card key={document.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {translateDocumentType(document.tipo)}
                      </CardTitle>
                      <CardDescription>
                        Adicionado em:{" "}
                        {format(new Date(document.criado_em), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="outline" asChild className="w-full">
                        <a
                          href={`/${document.caminho_arquivo}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Visualizar Documento
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Aba de Chamados */}
          <TabsContent value="tickets" className="py-4">
            {isLoadingTickets ? (
              <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-2 text-muted-foreground">
                  Nenhum chamado encontrado para este protocolo.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[320px] pr-4">
                <div className="space-y-4">
                  {tickets.map((ticket: Ticket) => (
                    <Card key={ticket.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base flex items-center">
                              Chamado #{ticket.id}
                              <Badge
                                variant="outline"
                                className="ml-2 flex items-center gap-1"
                              >
                                {getTicketStatusIcon(ticket.status)}
                                {translateTicketStatus(ticket.status)}
                              </Badge>
                            </CardTitle>
                            <CardDescription>
                              Aberto por {ticket.operador?.nome} em{" "}
                              {format(new Date(ticket.criado_em), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-line">
                          {ticket.descricao}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}