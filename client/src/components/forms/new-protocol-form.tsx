import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { insertProtocolSchema } from "@shared/schema";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Estender o schema com validações adicionais
const newProtocolSchema = insertProtocolSchema.extend({
  nota_fiscal: z.instanceof(FileList)
    .refine(files => files.length > 0, "Nota fiscal é obrigatória")
    .refine(
      files => files.length > 0 && files[0].size <= 5 * 1024 * 1024,
      "Arquivo deve ter no máximo 5MB"
    ),
  ordem_compra: z.instanceof(FileList)
    .refine(files => files.length > 0, "Ordem de compra é obrigatória")
    .refine(
      files => files.length > 0 && files[0].size <= 5 * 1024 * 1024,
      "Arquivo deve ter no máximo 5MB"
    ),
  boleto_pix: z.instanceof(FileList)
    .refine(files => files.length > 0, "Boleto/PIX é obrigatório")
    .refine(
      files => files.length > 0 && files[0].size <= 5 * 1024 * 1024,
      "Arquivo deve ter no máximo 5MB"
    ),
});

type NewProtocolFormData = z.infer<typeof newProtocolSchema>;

interface NewProtocolFormProps {
  onSuccess?: () => void;
}

export default function NewProtocolForm({ onSuccess }: NewProtocolFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar centros de custo
  const { data: costCenters, isLoading: isCostCentersLoading } = useQuery({
    queryKey: ['/api/centros-custo'],
  });

  // Buscar entidades pagadoras
  const { data: payerEntities, isLoading: isPayerEntitiesLoading } = useQuery({
    queryKey: ['/api/entidades-pagadoras'],
  });

  const form = useForm<NewProtocolFormData>({
    resolver: zodResolver(newProtocolSchema),
    defaultValues: {
      valor: "",
      data_vencimento: format(new Date(), 'yyyy-MM-dd'),
      faturamento_direto: false,
      tipo_pagamento: "BOLETO",
    },
  });

  async function onSubmit(data: NewProtocolFormData) {
    setIsSubmitting(true);
    
    try {
      // Criar FormData para upload de arquivos
      const formData = new FormData();
      
      // Adicionar dados do formulário
      formData.append('centro_custo_id', data.centro_custo_id.toString());
      formData.append('entidade_pagadora_id', data.entidade_pagadora_id.toString());
      formData.append('faturamento_direto', data.faturamento_direto.toString());
      formData.append('valor', data.valor);
      formData.append('data_vencimento', data.data_vencimento);
      formData.append('tipo_pagamento', data.tipo_pagamento);
      
      // Adicionar arquivos
      if (data.nota_fiscal[0]) formData.append('nota_fiscal', data.nota_fiscal[0]);
      if (data.ordem_compra[0]) formData.append('ordem_compra', data.ordem_compra[0]);
      if (data.boleto_pix[0]) formData.append('boleto_pix', data.boleto_pix[0]);
      
      // Enviar dados para o servidor (não podemos usar apiRequest diretamente para FormData)
      const response = await fetch('/api/protocolos', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      // Sucesso
      toast({
        title: "Protocolo criado",
        description: "O protocolo foi criado com sucesso e está aguardando aprovação.",
      });
      
      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/protocolos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/estatisticas'] });
      
      // Resetar formulário
      form.reset();
      
      // Callback de sucesso
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao criar protocolo:", error);
      toast({
        title: "Erro ao criar protocolo",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar o protocolo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isCostCentersLoading || isPayerEntitiesLoading || isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <FormField
            control={form.control}
            name="centro_custo_id"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Centro de Custo</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o centro de custo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {costCenters?.map((center) => (
                      <SelectItem key={center.id} value={center.id.toString()}>
                        {center.nome}
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
            name="entidade_pagadora_id"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Entidade Pagadora</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a entidade pagadora" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {payerEntities?.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {entity.nome}
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
            name="valor"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <Input
                      placeholder="0,00"
                      {...field}
                      disabled={isLoading}
                      className="pl-10"
                      onChange={(e) => {
                        // Formatar valor para aceitar valores decimais com vírgula
                        const value = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                        field.onChange(value);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_vencimento"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Data de Vencimento</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="faturamento_direto"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Faturamento Direto</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === "true")}
                    defaultValue={field.value.toString()}
                    disabled={isLoading}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="faturamento-sim" />
                      <Label htmlFor="faturamento-sim">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="faturamento-nao" />
                      <Label htmlFor="faturamento-nao">Não</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_pagamento"
            render={({ field }) => (
              <FormItem className="sm:col-span-3">
                <FormLabel>Tipo de Pagamento</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BOLETO" id="tipo-boleto" />
                      <Label htmlFor="tipo-boleto">Boleto</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PIX" id="tipo-pix" />
                      <Label htmlFor="tipo-pix">PIX</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-6">
            <FormLabel>Documentos</FormLabel>
            <div className="mt-2 grid grid-cols-1 gap-y-4">
              <FormField
                control={form.control}
                name="nota_fiscal"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel className="text-gray-500 text-sm">
                      Nota Fiscal (PDF/JPG, máx. 5MB)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        disabled={isLoading}
                        accept=".pdf,.jpg,.jpeg"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-light file:text-primary hover:file:bg-primary-light/90"
                        onChange={(e) => onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordem_compra"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel className="text-gray-500 text-sm">
                      Ordem de Compra (PDF/JPG, máx. 5MB)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        disabled={isLoading}
                        accept=".pdf,.jpg,.jpeg"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-light file:text-primary hover:file:bg-primary-light/90"
                        onChange={(e) => onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="boleto_pix"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel className="text-gray-500 text-sm">
                      Boleto/PIX (PDF/JPG, máx. 5MB)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        disabled={isLoading}
                        accept=".pdf,.jpg,.jpeg"
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-light file:text-primary hover:file:bg-primary-light/90"
                        onChange={(e) => onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess} 
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Protocolo
          </Button>
        </div>
      </form>
    </Form>
  );
}
