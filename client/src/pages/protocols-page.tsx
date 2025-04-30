import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Route, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ProtocolList from "@/components/protocols/protocol-list";
import CreateProtocolForm from "@/components/forms/create-protocol-form";

export default function ProtocolsPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const isCreateRoute = location === "/protocolos/novo";

  if (isCreateRoute) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Protocolo de Pagamento</h1>
            <p className="text-muted-foreground">
              Preencha os dados para criar um novo protocolo de pagamento.
            </p>
          </div>
          <Link href="/protocolos">
            <Button variant="outline">Voltar para Protocolos</Button>
          </Link>
        </div>
        
        <CreateProtocolForm />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Protocolos de Pagamento</h1>
          <p className="text-muted-foreground">
            Gerencie os protocolos de pagamento da sua empresa.
          </p>
        </div>
        {user?.perfil === "CADASTRADOR" && (
          <Link href="/protocolos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Protocolo
            </Button>
          </Link>
        )}
      </div>

      <ProtocolList 
        title="Todos os Protocolos" 
        description="Lista completa de protocolos" 
        showFilters={true}
      />
    </div>
  );
}