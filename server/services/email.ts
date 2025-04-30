import { MailService } from '@sendgrid/mail';
import { User } from '@shared/schema';
import { storage } from '../storage';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY não configurada. Emails não serão enviados.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Remetente padrão
const DEFAULT_FROM = 'noreply@sistemafinanceiroconstrutora.com.br';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Função genérica para envio de email
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Email não enviado porque SENDGRID_API_KEY não está configurada");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: DEFAULT_FROM,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

// Notificação de novo protocolo para administradores
export async function notifyNewProtocol(protocolId: number, cadastrador: User): Promise<boolean> {
  try {
    // Buscar todos administradores
    const admins = (await storage.getAllUsers()).filter(user => user.perfil === 'ADMINISTRADOR');
    
    if (admins.length === 0) {
      console.log("Nenhum administrador encontrado para notificar sobre novo protocolo");
      return false;
    }

    const protocol = await storage.getProtocolById(protocolId);
    if (!protocol) {
      console.error(`Protocolo ${protocolId} não encontrado para notificar`);
      return false;
    }

    const emailPromises = admins.map(admin => {
      return sendEmail({
        to: admin.email,
        subject: `Novo protocolo #${protocol.id} aguardando aprovação`,
        html: `
          <h1>Novo protocolo aguardando aprovação</h1>
          <p>Olá ${admin.nome},</p>
          <p>Um novo protocolo de pagamento foi cadastrado e aguarda sua aprovação:</p>
          <ul>
            <li><strong>Protocolo:</strong> #${protocol.id}</li>
            <li><strong>Cadastrador:</strong> ${cadastrador.nome}</li>
            <li><strong>Valor:</strong> R$ ${parseFloat(protocol.valor.toString()).toFixed(2)}</li>
            <li><strong>Vencimento:</strong> ${new Date(protocol.data_vencimento).toLocaleDateString('pt-BR')}</li>
          </ul>
          <p>Acesse o sistema para revisar e aprovar/reprovar este protocolo.</p>
        `
      });
    });

    const results = await Promise.all(emailPromises);
    return results.some(result => result === true);
  } catch (error) {
    console.error('Erro ao notificar administradores sobre novo protocolo:', error);
    return false;
  }
}

// Notificação de aprovação/reprovação de protocolo
export async function notifyProtocolStatusChange(protocolId: number, isApproved: boolean, justificativa?: string): Promise<boolean> {
  try {
    const protocol = await storage.getProtocolById(protocolId);
    if (!protocol) {
      console.error(`Protocolo ${protocolId} não encontrado para notificar`);
      return false;
    }

    const cadastrador = await storage.getUser(protocol.cadastrador_id);
    if (!cadastrador) {
      console.error(`Cadastrador do protocolo ${protocolId} não encontrado`);
      return false;
    }

    const status = isApproved ? 'aprovado' : 'reprovado';
    const subject = `Protocolo #${protocol.id} foi ${status}`;
    
    let html = `
      <h1>Atualização de protocolo</h1>
      <p>Olá ${cadastrador.nome},</p>
      <p>Seu protocolo #${protocol.id} foi <strong>${status}</strong>.</p>
      <ul>
        <li><strong>Valor:</strong> R$ ${parseFloat(protocol.valor.toString()).toFixed(2)}</li>
        <li><strong>Vencimento:</strong> ${new Date(protocol.data_vencimento).toLocaleDateString('pt-BR')}</li>
      </ul>
    `;

    if (!isApproved && justificativa) {
      html += `
        <h2>Justificativa da reprovação:</h2>
        <p>${justificativa}</p>
      `;
    }

    html += `<p>Acesse o sistema para mais detalhes.</p>`;

    return await sendEmail({
      to: cadastrador.email,
      subject,
      html
    });
  } catch (error) {
    console.error('Erro ao notificar sobre mudança de status do protocolo:', error);
    return false;
  }
}

// Notificação de novo chamado
export async function notifyNewTicket(ticketId: number): Promise<boolean> {
  try {
    const ticket = await storage.getTicketsByProtocolId(ticketId);
    if (ticket.length === 0) {
      console.error(`Chamado ${ticketId} não encontrado para notificar`);
      return false;
    }

    const currentTicket = ticket[0];
    const protocol = await storage.getProtocolById(currentTicket.protocolo_id);
    if (!protocol) {
      console.error(`Protocolo do chamado ${ticketId} não encontrado`);
      return false;
    }

    const operador = await storage.getUser(currentTicket.operador_id);
    const cadastrador = await storage.getUser(protocol.cadastrador_id);
    
    if (!operador || !cadastrador) {
      console.error(`Usuários do chamado ${ticketId} não encontrados`);
      return false;
    }

    // Notificar cadastrador
    const emailToCadastrador = sendEmail({
      to: cadastrador.email,
      subject: `Novo chamado aberto para o protocolo #${protocol.id}`,
      html: `
        <h1>Novo chamado aberto</h1>
        <p>Olá ${cadastrador.nome},</p>
        <p>Um novo chamado foi aberto para o protocolo #${protocol.id}:</p>
        <ul>
          <li><strong>Chamado:</strong> #${currentTicket.id}</li>
          <li><strong>Operador:</strong> ${operador.nome}</li>
          <li><strong>Descrição:</strong> ${currentTicket.descricao}</li>
        </ul>
        <p>Acesse o sistema para mais detalhes.</p>
      `
    });

    // Buscar e notificar administradores
    const admins = (await storage.getAllUsers()).filter(user => user.perfil === 'ADMINISTRADOR');
    const emailsToAdmins = admins.map(admin => {
      return sendEmail({
        to: admin.email,
        subject: `Novo chamado aberto para o protocolo #${protocol.id}`,
        html: `
          <h1>Novo chamado aberto</h1>
          <p>Olá ${admin.nome},</p>
          <p>Um novo chamado foi aberto para o protocolo #${protocol.id}:</p>
          <ul>
            <li><strong>Chamado:</strong> #${currentTicket.id}</li>
            <li><strong>Operador:</strong> ${operador.nome}</li>
            <li><strong>Cadastrador:</strong> ${cadastrador.nome}</li>
            <li><strong>Descrição:</strong> ${currentTicket.descricao}</li>
          </ul>
          <p>Acesse o sistema para mais detalhes.</p>
        `
      });
    });

    const results = await Promise.all([emailToCadastrador, ...emailsToAdmins]);
    return results.some(result => result === true);
  } catch (error) {
    console.error('Erro ao notificar sobre novo chamado:', error);
    return false;
  }
}

// Notificação de atualização de status do chamado
export async function notifyTicketStatusChange(ticketId: number, newStatus: string): Promise<boolean> {
  try {
    const tickets = await storage.getTicketsByProtocolId(ticketId);
    if (tickets.length === 0) {
      console.error(`Chamado ${ticketId} não encontrado para notificar`);
      return false;
    }

    const ticket = tickets[0];
    const protocol = await storage.getProtocolById(ticket.protocolo_id);
    if (!protocol) {
      console.error(`Protocolo do chamado ${ticketId} não encontrado`);
      return false;
    }

    const operador = await storage.getUser(ticket.operador_id);
    const cadastrador = await storage.getUser(protocol.cadastrador_id);
    
    if (!operador || !cadastrador) {
      console.error(`Usuários do chamado ${ticketId} não encontrados`);
      return false;
    }

    // Mapeamento de status para texto amigável
    const statusMap = {
      'ABERTO': 'aberto',
      'EM_ANDAMENTO': 'em andamento',
      'RESOLVIDO': 'resolvido'
    };
    
    const statusText = statusMap[newStatus as keyof typeof statusMap] || newStatus;

    // Notificar cadastrador e operador
    const emailPromises = [
      sendEmail({
        to: cadastrador.email,
        subject: `Chamado #${ticket.id} atualizado para ${statusText}`,
        html: `
          <h1>Atualização de chamado</h1>
          <p>Olá ${cadastrador.nome},</p>
          <p>O chamado #${ticket.id} para o protocolo #${protocol.id} foi atualizado:</p>
          <ul>
            <li><strong>Novo status:</strong> ${statusText}</li>
          </ul>
          <p>Acesse o sistema para mais detalhes.</p>
        `
      }),
      sendEmail({
        to: operador.email,
        subject: `Chamado #${ticket.id} atualizado para ${statusText}`,
        html: `
          <h1>Atualização de chamado</h1>
          <p>Olá ${operador.nome},</p>
          <p>O chamado #${ticket.id} para o protocolo #${protocol.id} foi atualizado:</p>
          <ul>
            <li><strong>Novo status:</strong> ${statusText}</li>
          </ul>
          <p>Acesse o sistema para mais detalhes.</p>
        `
      })
    ];

    const results = await Promise.all(emailPromises);
    return results.some(result => result === true);
  } catch (error) {
    console.error('Erro ao notificar sobre atualização de status do chamado:', error);
    return false;
  }
}