import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const registerSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmarSenha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  perfil: z.enum(["ADMINISTRADOR", "OPERADOR", "CADASTRADOR"]),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  // Formulário de login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      senha: "",
    },
  });

  // Função de login
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  // Redirecionar se já estiver autenticado
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Banner/Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-8 flex-col justify-center items-center text-white">
        <div className="max-w-md text-center">
          <div className="mb-6 mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center">
            <Building className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Sistema Financeiro Construtora</h1>
          <p className="text-lg mb-6">
            Gerencie protocolos de pagamento, aprovações e remessas bancárias com eficiência e segurança.
          </p>
          <div className="space-y-3 text-left bg-white/10 p-6 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-medium">Principais recursos:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Criação e aprovação de protocolos financeiros</li>
              <li>Geração de arquivos remessa para o banco BTG</li>
              <li>Controle de divergências via chamados</li>
              <li>Gerenciamento de usuários e permissões</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Auth Form Section */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entrar no Sistema</CardTitle>
            <CardDescription>Faça login para acessar sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="senha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Entrar
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-gray-500">
            Sistema Financeiro Construtora &copy; {new Date().getFullYear()}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
