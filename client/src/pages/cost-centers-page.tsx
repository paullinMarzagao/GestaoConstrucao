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

interface CostCenter {
  id: number;
  nome: string;
  codigo: string;
  criado_em: string;
}

const costCenterFormSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  codigo: z.string().min(2, "O código deve ter pelo menos 2 caracteres"),
});

type CostCenterFormData = z.infer<typeof costCenterFormSchema>;

export default function CostCentersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewCostCenterModal, setShowNewCostCenterModal] = useState(false);
  
  const isAdmin = user?.perfil === "ADMINISTRADOR";
  
  // Formulário para novo centro de custo
  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterFormSchema),
    defaultValues: {
      nome: "",
      codigo: "",
    },
  });
  
  // Buscar centros de custo
  const { data: costCenters, isLoading } = useQuery<CostCenter[]>({
    queryKey: ['/api/centros-custo'],
  });
  
  // Mutação para criar centro de custo
  const createCostCenterMutation = useMutation({
    mutationFn: async (data: CostCenterFormData) => {
      const res = await apiRequest("POST", "/api/centros-custo", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/centros-custo'] });
      toast({
        title: "Centro de custo criado",
        description: "O centro de custo foi criado com sucesso.",
      });
      setShowNewCostCenterModal(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar centro de custo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmitNewCostCenter = (data: CostCenterFormData) => {
    createCostCenterMutation.mutate(data);
  };
  
  return (
    <MainLayout title="Centros de Custo">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Centros de Custo</CardTitle>
          {isAdmin && (
            <Button onClick={() => setShowNewCostCenterModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Centro de Custo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : costCenters && costCenters.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data de Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map((center) => (
                    <TableRow key={center.id}>
                      <TableCell className="font-medium">{center.codigo}</TableCell>
                      <TableCell>{center.nome}</TableCell>
                      <TableCell>
                        {new Date(center.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum centro de custo encontrado
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de Novo Centro de Custo */}
      <Dialog open={showNewCostCenterModal} onOpenChange={setShowNewCostCenterModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Centro de Custo</DialogTitle>
            <DialogDescription>
              Crie um novo centro de custo para utilização nos protocolos
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewCostCenter)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do centro de custo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Código do centro de custo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewCostCenterModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCostCenterMutation.isPending}>
                  {createCostCenterMutation.isPending ? "Criando..." : "Criar Centro de Custo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
