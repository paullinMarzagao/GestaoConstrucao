import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

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
}

export default function TicketsList() {
  const { data: tickets, isLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/chamados'],
  });

  // Pegar apenas os 5 mais recentes
  const recentTickets = tickets?.slice(0, 5);

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Chamados Recentes</CardTitle>
          <CardDescription>Últimos chamados abertos para divergências.</CardDescription>
        </div>
        <Link href="/chamados">
          <Button variant="outline" size="sm">
            Ver Todos
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : recentTickets && recentTickets.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {recentTickets.map((ticket) => (
              <div key={ticket.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm font-medium truncate">
                      {getStatusBadge(ticket.status)}
                      <span className="ml-2">Divergência no protocolo #{ticket.protocolo_id}</span>
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="text-sm text-gray-500">
                      {formatRelativeTime(ticket.criado_em)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {ticket.operador?.nome || `Operador ID: ${ticket.operador_id}`}
                      {ticket.operador?.perfil && ` (${ticket.operador.perfil})`}
                    </p>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <p className="text-sm text-gray-500">
                      "{ticket.descricao.length > 40 ? `${ticket.descricao.substring(0, 40)}...` : ticket.descricao}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum chamado encontrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
