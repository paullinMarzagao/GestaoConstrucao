import { useState } from "react";
import { Protocol } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Schema de validação
const rejectFormSchema = z.object({
  justificativa_reprovacao: z.string().min(10, {
    message: "A justificativa deve ter pelo menos 10 caracteres.",
  }),
});

type RejectFormValues = z.infer<typeof rejectFormSchema>;

interface RejectProtocolDialogProps {
  protocol: Protocol;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RejectProtocolDialog({
  protocol,
  open,
  onOpenChange,
  onSuccess,
}: RejectProtocolDialogProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Formulário
  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: {
      justificativa_reprovacao: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const handleReject = async (data: RejectFormValues) => {
    setError(null);

    try {
      await apiRequest(
        "PUT",
        `/api/protocolos/${protocol.id}/status`,
        { 
          status: "REPROVADO",
          justificativa_reprovacao: data.justificativa_reprovacao
        }
      );

      // Atualizar cache de consultas
      queryClient.invalidateQueries({ queryKey: ['/api/protocolos'] });

      // Fechar diálogo
      onOpenChange(false);

      // Resetar formulário
      form.reset();

      // Callback de sucesso
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao reprovar o protocolo.");
      toast({
        title: "Erro ao reprovar protocolo",
        description: err.message || "Ocorreu um erro ao reprovar o protocolo.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(typeof value === "string" ? parseFloat(value) : value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) form.reset();
      onOpenChange(isOpen);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reprovar Protocolo #{protocol.id}</DialogTitle>
          <DialogDescription>
            Você está prestes a reprovar este protocolo. Esta ação é irreversível.
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
          </div>

          <Separator className="my-4" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleReject)}>
              <FormField
                control={form.control}
                name="justificativa_reprovacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificativa da Reprovação</FormLabel>
                    <FormDescription>
                      Explique de forma clara o motivo da reprovação deste protocolo.
                      Esta informação será enviada ao cadastrador.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="Informe o motivo da reprovação..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reprovar Protocolo
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}