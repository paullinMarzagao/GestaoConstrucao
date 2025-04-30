import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { insertProtocolSchema } from "@shared/schema";
import { CostCenter, PayerEntity } from "@shared/schema";

// Componentes UI
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Estendendo o schema para incluir a validação de arquivos
const createFileSchema = z.object({
  centro_custo_id: z.string().min(1, "Centro de custo é obrigatório"),
  entidade_pagadora_id: z.string().min(1, "Entidade pagadora é obrigatória"),
  faturamento_direto: z.boolean(),
  valor: z.string().min(1, "Valor é obrigatório")
    .refine(value => !isNaN(parseFloat(value)), "Valor deve ser um número válido")
    .refine(value => parseFloat(value) > 0, "Valor deve ser maior que zero"),
  data_vencimento: z.date({
    required_error: "Data de vencimento é obrigatória",
  }),
  tipo_pagamento: z.enum(["BOLETO", "PIX"], {
    required_error: "Tipo de pagamento é obrigatório",
  }),
  nota_fiscal: z.instanceof(File, { message: "Nota fiscal é obrigatória" })
    .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
    .refine(
      file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
      "Arquivo deve ser PDF ou JPG"
    ),
  ordem_compra: z.instanceof(File, { message: "Ordem de compra é obrigatória" })
    .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
    .refine(
      file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
      "Arquivo deve ser PDF ou JPG"
    ),
  boleto_pix: z.union([
    // Caso seja boleto (arquivo)
    z.instanceof(File, { message: "Boleto é obrigatório" })
      .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
      .refine(
        file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
        "Arquivo deve ser PDF ou JPG"
      ),
    // Caso seja PIX (texto)
    z.string().min(1, "Chave PIX é obrigatória")
  ]),
});

// Schema condicional com base no tipo de pagamento
const createProtocolSchema = z.discriminatedUnion('tipo_pagamento', [
  // Schema para BOLETO
  z.object({
    tipo_pagamento: z.literal('BOLETO'),
    centro_custo_id: z.string().min(1, "Centro de custo é obrigatório"),
    entidade_pagadora_id: z.string().min(1, "Entidade pagadora é obrigatória"),
    faturamento_direto: z.boolean(),
    valor: z.string().min(1, "Valor é obrigatório")
      .refine(value => !isNaN(parseFloat(value)), "Valor deve ser um número válido")
      .refine(value => parseFloat(value) > 0, "Valor deve ser maior que zero"),
    data_vencimento: z.date({
      required_error: "Data de vencimento é obrigatória",
    }),
    nota_fiscal: z.instanceof(File, { message: "Nota fiscal é obrigatória" })
      .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
      .refine(
        file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
        "Arquivo deve ser PDF ou JPG"
      ),
    ordem_compra: z.instanceof(File, { message: "Ordem de compra é obrigatória" })
      .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
      .refine(
        file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
        "Arquivo deve ser PDF ou JPG"
      ),
    boleto_pix: z.instanceof(File, { message: "Boleto é obrigatório" })
      .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
      .refine(
        file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
        "Arquivo deve ser PDF ou JPG"
      )
  }),
  // Schema para PIX
  z.object({
    tipo_pagamento: z.literal('PIX'),
    centro_custo_id: z.string().min(1, "Centro de custo é obrigatório"),
    entidade_pagadora_id: z.string().min(1, "Entidade pagadora é obrigatória"),
    faturamento_direto: z.boolean(),
    valor: z.string().min(1, "Valor é obrigatório")
      .refine(value => !isNaN(parseFloat(value)), "Valor deve ser um número válido")
      .refine(value => parseFloat(value) > 0, "Valor deve ser maior que zero"),
    data_vencimento: z.date({
      required_error: "Data de vencimento é obrigatória",
    }),
    nota_fiscal: z.instanceof(File, { message: "Nota fiscal é obrigatória" })
      .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
      .refine(
        file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
        "Arquivo deve ser PDF ou JPG"
      ),
    ordem_compra: z.instanceof(File, { message: "Ordem de compra é obrigatória" })
      .refine(file => file.size <= 5 * 1024 * 1024, "Arquivo deve ter no máximo 5MB")
      .refine(
        file => ['.pdf', '.jpg', '.jpeg'].some(ext => file.name.toLowerCase().endsWith(ext)),
        "Arquivo deve ser PDF ou JPG"
      ),
    boleto_pix: z.string().min(1, "Chave PIX é obrigatória")
  })
]);

type CreateProtocolFormValues = z.infer<typeof createProtocolSchema>;

export default function CreateProtocolForm() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Consultar centros de custo
  const { data: costCenters = [] } = useQuery<CostCenter[]>({
    queryKey: ['/api/centros-custo'],
    queryFn: async () => {
      const res = await fetch('/api/centros-custo', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar centros de custo');
      return res.json();
    }
  });
  
  // Consultar entidades pagadoras
  const { data: payerEntities = [] } = useQuery<PayerEntity[]>({
    queryKey: ['/api/entidades-pagadoras'],
    queryFn: async () => {
      const res = await fetch('/api/entidades-pagadoras', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar entidades pagadoras');
      return res.json();
    }
  });

  // Definir formulário
  const form = useForm<CreateProtocolFormValues>({
    resolver: zodResolver(createProtocolSchema),
    defaultValues: {
      centro_custo_id: "",
      entidade_pagadora_id: "",
      faturamento_direto: false,
      valor: "",
      data_vencimento: new Date(),
      tipo_pagamento: "BOLETO",
    },
  });
  
  // Resetar o campo boleto_pix quando tipo_pagamento mudar
  const tipoPagamento = form.watch("tipo_pagamento");
  
  useEffect(() => {
    // Resetar o campo boleto_pix quando o tipo de pagamento mudar
    form.setValue('boleto_pix', tipoPagamento === 'PIX' ? '' : undefined, { shouldValidate: false });
  }, [tipoPagamento, form]);

  // Submeter formulário
  const onSubmit = async (data: CreateProtocolFormValues) => {
    setLoading(true);
    
    try {
      // Criar FormData para upload
      const formData = new FormData();
      formData.append('centro_custo_id', data.centro_custo_id);
      formData.append('entidade_pagadora_id', data.entidade_pagadora_id);
      formData.append('faturamento_direto', String(data.faturamento_direto));
      formData.append('valor', data.valor);
      formData.append('data_vencimento', data.data_vencimento.toISOString());
      formData.append('tipo_pagamento', data.tipo_pagamento);
      formData.append('nota_fiscal', data.nota_fiscal);
      formData.append('ordem_compra', data.ordem_compra);
      
      // Verificar se boleto_pix é um File (para BOLETO) ou string (para PIX)
      if (data.tipo_pagamento === 'BOLETO') {
        // Para boleto é um arquivo
        formData.append('boleto_pix', data.boleto_pix as File);
      } else {
        // Para PIX é um texto
        formData.append('boleto_pix', data.boleto_pix as string);
      }
      
      // Enviar para a API
      const response = await fetch('/api/protocolos', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar protocolo');
      }
      
      const result = await response.json();
      
      // Invalidar consultas para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/protocolos'] });
      
      toast({
        title: "Protocolo criado com sucesso",
        description: `Protocolo #${result.id} foi enviado para aprovação.`,
      });
      
      // Redirecionar para a lista de protocolos
      navigate('/protocolos');
    } catch (error: any) {
      toast({
        title: "Erro ao criar protocolo",
        description: error.message || "Ocorreu um erro ao criar o protocolo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.perfil !== 'CADASTRADOR' && user.perfil !== 'OPERADOR' && user.perfil !== 'ADMINISTRADOR')) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para cadastrar protocolos. Apenas usuários com perfil apropriado podem realizar esta ação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="centro_custo_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Centro de Custo</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um centro de custo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {costCenters.map((center) => (
                      <SelectItem key={center.id} value={center.id.toString()}>
                        {center.nome} ({center.codigo})
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
              <FormItem>
                <FormLabel>Entidade Pagadora</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma entidade pagadora" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {payerEntities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id.toString()}>
                        {entity.nome} ({entity.cnpj})
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
            name="faturamento_direto"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Faturamento Direto</FormLabel>
                  <FormDescription>
                    Ative se o faturamento for direto para a entidade pagadora
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_pagamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Pagamento</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de pagamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
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
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_vencimento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Vencimento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={`w-full pl-3 text-left font-normal ${
                          !field.value ? "text-muted-foreground" : ""
                        }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="nota_fiscal"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>Nota Fiscal</FormLabel>
                <FormControl>
                  <div className="flex flex-col space-y-2">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onChange(file);
                        }
                      }}
                      {...fieldProps}
                    />
                    <p className="text-xs text-gray-500">
                      PDF ou JPG (máx. 5MB)
                    </p>
                  </div>
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
                <FormLabel>Ordem de Compra</FormLabel>
                <FormControl>
                  <div className="flex flex-col space-y-2">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onChange(file);
                        }
                      }}
                      {...fieldProps}
                    />
                    <p className="text-xs text-gray-500">
                      PDF ou JPG (máx. 5MB)
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="boleto_pix"
            render={({ field: { value, onChange, ...fieldProps } }) => {
              // Pegar o valor atual do tipo de pagamento
              const tipoPagamento = form.watch("tipo_pagamento");
              
              return (
                <FormItem>
                  <FormLabel>{tipoPagamento === "BOLETO" ? "Boleto Bancário" : "Chave PIX"}</FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      {tipoPagamento === "BOLETO" ? (
                        <>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                              }
                            }}
                            {...fieldProps}
                          />
                          <p className="text-xs text-gray-500">
                            PDF ou JPG (máx. 5MB)
                          </p>
                        </>
                      ) : (
                        <>
                          <Input 
                            type="text" 
                            placeholder="Informe a chave PIX" 
                            onChange={(e) => onChange(e.target.value)}
                            value={typeof value === 'string' ? value : ''}
                            {...fieldProps}
                          />
                          <p className="text-xs text-gray-500">
                            Informe a chave PIX para pagamento
                          </p>
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => navigate('/protocolos')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Protocolo
          </Button>
        </div>
      </form>
    </Form>
  );
}