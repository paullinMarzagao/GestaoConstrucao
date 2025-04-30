import { useState } from "react";
import { Protocol } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ApproveProtocolDialogProps {
  protocol: Protocol;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApproveProtocolDialog({
  protocol,
  open,
  onOpenChange,
  onSuccess,
}: ApproveProtocolDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest(
        "PUT",
        `/api/protocolos/${protocol.id}/status`,
        { status: "APROVADO" }
      );

      // Atualizar cache de consultas
      queryClient.invalidateQueries({ queryKey: ['/api/protocolos'] });

      // Fechar diálogo
      onOpenChange(false);

      // Callback de sucesso
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao aprovar o protocolo.");
      toast({
        title: "Erro ao aprovar protocolo",
        description: err.message || "Ocorreu um erro ao aprovar o protocolo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(typeof value === "string" ? parseFloat(value) : value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar Protocolo #{protocol.id}</DialogTitle>
          <DialogDescription>
            Você está prestes a aprovar este protocolo. Esta ação é irreversível.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Centro de Custo:</span>
              <span className="text-sm">{protocol.centroCusto?.nome || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Entidade Pagadora:</span>
              <span className="text-sm">{protocol.entidadePagadora?.nome || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Valor:</span>
              <span className="text-sm font-semibold">{formatCurrency(protocol.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Cadastrador:</span>
              <span className="text-sm">{protocol.cadastrador?.nome || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Faturamento Direto:</span>
              <span className="text-sm">{protocol.faturamento_direto ? "Sim" : "Não"}</span>
            </div>
          </div>

          <Separator className="my-4" />

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Confirmação necessária</AlertTitle>
            <AlertDescription>
              Ao aprovar este protocolo, ele será encaminhado para geração de arquivo de remessa.
              O sistema enviará uma notificação ao cadastrador.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleApprove} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprovar Protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}