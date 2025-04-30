import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const ticketSchema = z.object({
  protocolo_id: z.number(),
  descricao: z.string()
    .min(5, "A descrição deve ter pelo menos 5 caracteres")
    .max(500, "A descrição deve ter no máximo 500 caracteres"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface NewTicketFormProps {
  protocoloIds: number[];
  onSuccess?: () => void;
}

export default function NewTicketForm({ protocoloIds, onSuccess }: NewTicketFormProps) {
  const { toast } = useToast();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      protocolo_id: protocoloIds[0] || undefined,
      descricao: "",
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      const res = await apiRequest("POST", "/api/chamados", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Chamado criado",
        description: "O chamado foi aberto com sucesso.",
      });
      
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/chamados'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/estatisticas'] });
      
      // Resetar formulário
      form.reset();
      
      // Callback de sucesso
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar chamado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: TicketFormData) {
    createTicketMutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="protocolo_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Protocolo</FormLabel>
              <Select
                disabled={createTicketMutation.isPending}
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um protocolo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {protocoloIds.map((id) => (
                    <SelectItem key={id} value={id.toString()}>
                      Protocolo #{id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição do Problema</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o problema encontrado na remessa..."
                  className="min-h-[100px]"
                  disabled={createTicketMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess} 
            disabled={createTicketMutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createTicketMutation.isPending}>
            {createTicketMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir Chamado
          </Button>
        </div>
      </form>
    </Form>
  );
}
