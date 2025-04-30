import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface PayerEntity {
  id: number;
  nome: string;
  cnpj: string;
  criado_em: string;
}

const payerEntityFormSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  cnpj: z.string().length(14, "O CNPJ deve ter 14 dígitos numéricos").refine(
    (value) => /^\d{14}$/.test(value),
    "O CNPJ deve conter apenas números"
  ),
});

type PayerEntityFormData = z.infer<typeof payerEntityFormSchema>;

export default function PayerEntitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewEntityModal, setShowNewEntityModal] = useState(false);
  
  const isAdmin = user?.perfil === "ADMINISTRADOR";
  
  // Formulário para nova entidade pagadora
  const form = useForm<PayerEntityFormData>({
    resolver: zodResolver(payerEntityFormSchema),
    defaultValues: {
      nome: "",
      cnpj: "",
    },
  });
  
  // Buscar entidades pagadoras
  const { data: payerEntities, isLoading } = useQuery<PayerEntity[]>({
    queryKey: ['/api/entidades-pagadoras'],
  });
  
  // Mutação para criar entidade pagadora
  const createPayerEntityMutation = useMutation({
    mutationFn: async (data: PayerEntityFormData) => {
      const res = await apiRequest("POST", "/api/entidades-pagadoras", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/entidades-pagadoras'] });
      toast({
        title: "Entidade pagadora criada",
        description: "A entidade pagadora foi criada com sucesso.",
      });
      setShowNewEntityModal(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar entidade pagadora",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmitNewEntity = (data: PayerEntityFormData) => {
    createPayerEntityMutation.mutate(data);
  };
  
  // Formatação de CNPJ
  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };
  
  return (
    <MainLayout title="Entidades Pagadoras">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Entidades Pagadoras</CardTitle>
          {isAdmin && (
            <Button onClick={() => setShowNewEntityModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Entidade Pagadora
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : payerEntities && payerEntities.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Data de Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payerEntities.map((entity) => (
                    <TableRow key={entity.id}>
                      <TableCell className="font-medium">{entity.nome}</TableCell>
                      <TableCell>{formatCNPJ(entity.cnpj)}</TableCell>
                      <TableCell>
                        {new Date(entity.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhuma entidade pagadora encontrada
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Nova Entidade Pagadora */}
      <Dialog open={showNewEntityModal} onOpenChange={setShowNewEntityModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Entidade Pagadora</DialogTitle>
            <DialogDescription>
              Crie uma nova entidade pagadora para utilização nos protocolos
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewEntity)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da entidade pagadora" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="CNPJ (apenas números)" 
                        {...field} 
                        onChange={(e) => {
                          // Permitir apenas números
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewEntityModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPayerEntityMutation.isPending}>
                  {createPayerEntityMutation.isPending ? "Criando..." : "Criar Entidade Pagadora"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
