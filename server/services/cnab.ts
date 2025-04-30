import fs from 'fs';
import path from 'path';
import { Protocol, PayerEntity } from '@shared/schema';
import { storage } from '../storage';

// Função de preenchimento (padding) para campos do CNAB
function padLeft(str: string | number, length: number, char: string = '0'): string {
  return String(str).padStart(length, char);
}

function padRight(str: string | number, length: number, char: string = ' '): string {
  return String(str).padEnd(length, char);
}

// Formata valor monetário para o padrão CNAB (sem pontos ou vírgulas)
function formatCurrency(value: string | number): string {
  return String(parseFloat(String(value)) * 100).replace(/\D/g, '').padStart(15, '0');
}

// Formata data para o padrão CNAB (DDMMAAAA)
function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const day = padLeft(dateObj.getDate(), 2);
  const month = padLeft(dateObj.getMonth() + 1, 2);
  const year = dateObj.getFullYear();
  
  return `${day}${month}${year}`;
}

// Gera o header do arquivo CNAB 240
function generateHeader(payerEntity: PayerEntity): string {
  const now = new Date();
  const banco = '208'; // Código do BTG Pactual
  const lote = '0000';
  const registro = '0';
  const brancos1 = padRight('', 9);
  const tipoInscricao = '2'; // 2 para CNPJ
  const numeroInscricao = padLeft(payerEntity.cnpj.replace(/\D/g, ''), 14);
  const convenio = padRight('', 20);
  const agencia = padLeft('', 5);
  const digitoAgencia = padRight('', 1);
  const conta = padLeft('', 12);
  const digitoConta = padRight('', 1);
  const digitoAgConta = padRight('', 1);
  const nomeEmpresa = padRight(payerEntity.nome, 30);
  const nomeBanco = padRight('BTG PACTUAL', 30);
  const brancos2 = padRight('', 10);
  const codigoRemessa = '1'; // 1 para remessa
  const dataGeracao = formatDate(now);
  const horaGeracao = padLeft(now.getHours(), 2) + padLeft(now.getMinutes(), 2) + padLeft(now.getSeconds(), 2);
  const sequencial = padLeft('1', 6);
  const versaoLayout = '103';
  const densidadeGravacao = padLeft('', 5);
  const reservadoBanco = padRight('', 20);
  const reservadoEmpresa = padRight('', 20);
  const brancos3 = padRight('', 29);

  return banco + lote + registro + brancos1 + tipoInscricao + numeroInscricao + 
         convenio + agencia + digitoAgencia + conta + digitoConta + digitoAgConta + 
         nomeEmpresa + nomeBanco + brancos2 + codigoRemessa + dataGeracao + 
         horaGeracao + sequencial + versaoLayout + densidadeGravacao + 
         reservadoBanco + reservadoEmpresa + brancos3;
}

// Gera o header do lote
function generateLoteHeader(payerEntity: PayerEntity, numeroLote: number): string {
  const banco = '208'; // Código do BTG Pactual
  const lote = padLeft(numeroLote, 4);
  const registro = '1';
  const operacao = 'R'; // R para remessa
  const tipoServico = '01'; // 01 para cobrança
  const brancos1 = padRight('', 2);
  const versaoLayout = '060';
  const brancos2 = padRight('', 1);
  const tipoInscricao = '2'; // 2 para CNPJ
  const numeroInscricao = padLeft(payerEntity.cnpj.replace(/\D/g, ''), 15);
  const convenio = padRight('', 20);
  const agencia = padLeft('', 5);
  const digitoAgencia = padRight('', 1);
  const conta = padLeft('', 12);
  const digitoConta = padRight('', 1);
  const digitoAgConta = padRight('', 1);
  const nomeEmpresa = padRight(payerEntity.nome, 30);
  const mensagem1 = padRight('', 40);
  const mensagem2 = padRight('', 40);
  const numeroRemessa = padLeft('1', 8);
  const dataGravacao = formatDate(new Date());
  const dataCredito = padRight('', 8);
  const brancos3 = padRight('', 33);

  return banco + lote + registro + operacao + tipoServico + brancos1 + versaoLayout + 
         brancos2 + tipoInscricao + numeroInscricao + convenio + agencia + digitoAgencia + 
         conta + digitoConta + digitoAgConta + nomeEmpresa + mensagem1 + mensagem2 + 
         numeroRemessa + dataGravacao + dataCredito + brancos3;
}

// Gera o registro de detalhe (segmento P) para um protocolo
function generateSegmentP(protocol: Protocol, numeroLote: number, numeroRegistro: number): string {
  const banco = '208'; // Código do BTG Pactual
  const lote = padLeft(numeroLote, 4);
  const registro = '3';
  const numeroRegistroLote = padLeft(numeroRegistro, 5);
  const segmento = 'P';
  const brancos1 = ' ';
  const codigoMovimento = '01'; // 01 para entrada de título
  const agencia = padLeft('', 5);
  const digitoAgencia = padRight('', 1);
  const conta = padLeft('', 12);
  const digitoConta = padRight('', 1);
  const digitoAgConta = padRight('', 1);
  const nossoNumero = padLeft(protocol.id.toString(), 20);
  const codigoCarteira = '1'; // 1 para cobrança simples
  const formaCadastramento = '1'; // 1 para registro em papel
  const tipoDocumento = '1'; // 1 para tradicional
  const identificacaoEmissao = '2'; // 2 para beneficiário emite
  const identificacaoDistribuicao = '2'; // 2 para beneficiário distribui
  const numeroDocumento = padRight(protocol.id.toString(), 15);
  const dataVencimento = formatDate(protocol.data_vencimento);
  const valorTitulo = formatCurrency(protocol.valor);
  const agenciaCobradora = padLeft('00000', 5);
  const digitoAgCobradora = padRight('', 1);
  const especieTitulo = '02'; // 02 para duplicata mercantil
  const aceite = 'N'; // N para não
  const dataEmissao = formatDate(new Date());
  const codigoJuros = '1'; // 1 para valor por dia
  const dataJuros = formatDate(new Date(protocol.data_vencimento));
  const juros = '000000000000000'; // Sem juros
  const codigoDesconto = '0'; // 0 para sem desconto
  const dataDesconto = padLeft('', 8);
  const valorDesconto = padLeft('', 15);
  const valorIOF = padLeft('', 15);
  const valorAbatimento = padLeft('', 15);
  const identificacaoTitulo = padRight(protocol.id.toString(), 25);
  const codigoProtesto = '0'; // 0 para sem protesto
  const diasProtesto = padLeft('', 2);
  const codigoBaixaDevolucao = '0'; // 0 para sem baixa/devolução
  const diasBaixaDevolucao = padLeft('', 3);
  const codigoMoeda = '09'; // 09 para real
  const numeroContrato = padLeft('', 10);
  const brancos2 = padRight('', 1);

  return banco + lote + registro + numeroRegistroLote + segmento + brancos1 + 
         codigoMovimento + agencia + digitoAgencia + conta + digitoConta + 
         digitoAgConta + nossoNumero + codigoCarteira + formaCadastramento + 
         tipoDocumento + identificacaoEmissao + identificacaoDistribuicao + 
         numeroDocumento + dataVencimento + valorTitulo + agenciaCobradora + 
         digitoAgCobradora + especieTitulo + aceite + dataEmissao + codigoJuros + 
         dataJuros + juros + codigoDesconto + dataDesconto + valorDesconto + 
         valorIOF + valorAbatimento + identificacaoTitulo + codigoProtesto + 
         diasProtesto + codigoBaixaDevolucao + diasBaixaDevolucao + codigoMoeda + 
         numeroContrato + brancos2;
}

// Gera o registro de detalhe (segmento Q) para um protocolo
async function generateSegmentQ(protocol: Protocol, numeroLote: number, numeroRegistro: number): Promise<string> {
  const banco = '208'; // Código do BTG Pactual
  const lote = padLeft(numeroLote, 4);
  const registro = '3';
  const numeroRegistroLote = padLeft(numeroRegistro, 5);
  const segmento = 'Q';
  const brancos1 = ' ';
  const codigoMovimento = '01'; // 01 para entrada de título
  const tipoInscricao = '2'; // 2 para CNPJ
  
  // Obtém a entidade pagadora
  const payerEntity = await storage.getAllPayerEntities().then(entities => 
    entities.find((e) => e.id === protocol.entidade_pagadora_id)
  );
  
  if (!payerEntity) {
    throw new Error(`Entidade pagadora não encontrada para o protocolo ${protocol.id}`);
  }
  
  const numeroInscricao = padLeft(payerEntity.cnpj.replace(/\D/g, ''), 15);
  const nome = padRight(payerEntity.nome, 40);
  const endereco = padRight('', 40); // Não temos endereço no modelo
  const bairro = padRight('', 15);
  const cep = padLeft('', 8);
  const sufixoCep = padLeft('', 3);
  const cidade = padRight('', 15);
  const uf = padRight('', 2);
  const tipoInscricaoAvalista = '0'; // 0 para sem avalista
  const numeroInscricaoAvalista = padLeft('', 15);
  const nomeAvalista = padRight('', 40);
  const codigoDocumento = padLeft('', 4);
  const brancos2 = padRight('', 10);

  return banco + lote + registro + numeroRegistroLote + segmento + brancos1 + 
         codigoMovimento + tipoInscricao + numeroInscricao + nome + endereco + 
         bairro + cep + sufixoCep + cidade + uf + tipoInscricaoAvalista + 
         numeroInscricaoAvalista + nomeAvalista + codigoDocumento + brancos2;
}

// Gera o registro de detalhe (segmento R) para um protocolo
function generateSegmentR(protocol: Protocol, numeroLote: number, numeroRegistro: number): string {
  const banco = '208'; // Código do BTG Pactual
  const lote = padLeft(numeroLote, 4);
  const registro = '3';
  const numeroRegistroLote = padLeft(numeroRegistro, 5);
  const segmento = 'R';
  const brancos1 = ' ';
  const codigoMovimento = '01'; // 01 para entrada de título
  const codigoDesconto2 = '0'; // 0 para sem desconto
  const dataDesconto2 = padLeft('', 8);
  const valorDesconto2 = padLeft('', 15);
  const codigoDesconto3 = '0'; // 0 para sem desconto
  const dataDesconto3 = padLeft('', 8);
  const valorDesconto3 = padLeft('', 15);
  const codigoMulta = '0'; // 0 para sem multa
  const dataMulta = padLeft('', 8);
  const valorMulta = padLeft('', 15);
  const informacaoPagador = padRight('', 10);
  const mensagem3 = padRight('', 40);
  const mensagem4 = padRight('', 40);
  const brancos2 = padRight('', 20);
  const codigoOcorrencia1 = padLeft('', 8);
  const codigoOcorrencia2 = padLeft('', 8);
  const brancos3 = padRight('', 8);
  const codigoDocumento = padLeft('', 2);
  const brancos4 = padRight('', 6);

  return banco + lote + registro + numeroRegistroLote + segmento + brancos1 + 
         codigoMovimento + codigoDesconto2 + dataDesconto2 + valorDesconto2 + 
         codigoDesconto3 + dataDesconto3 + valorDesconto3 + codigoMulta + 
         dataMulta + valorMulta + informacaoPagador + mensagem3 + mensagem4 + 
         brancos2 + codigoOcorrencia1 + codigoOcorrencia2 + brancos3 + 
         codigoDocumento + brancos4;
}

// Gera o trailer do lote
function generateLoteTrailer(numeroLote: number, quantidadeRegistros: number, valorTotal: number): string {
  const banco = '208'; // Código do BTG Pactual
  const lote = padLeft(numeroLote, 4);
  const registro = '5';
  const brancos1 = padRight('', 9);
  const quantidadeRegistrosLote = padLeft(quantidadeRegistros, 6);
  const valorTotalTitulos = formatCurrency(valorTotal);
  const quantidadeCobranca = padLeft('', 6);
  const valorCobranca = padLeft('', 15);
  const brancos2 = padRight('', 177);

  return banco + lote + registro + brancos1 + quantidadeRegistrosLote + 
         valorTotalTitulos + quantidadeCobranca + valorCobranca + brancos2;
}

// Gera o trailer do arquivo
function generateFileTrailer(quantidadeLotes: number, quantidadeRegistros: number): string {
  const banco = '208'; // Código do BTG Pactual
  const lote = '9999';
  const registro = '9';
  const brancos1 = padRight('', 9);
  const quantidadeLotesArquivo = padLeft(quantidadeLotes, 6);
  const quantidadeRegistrosArquivo = padLeft(quantidadeRegistros, 6);
  const brancos2 = padRight('', 211);

  return banco + lote + registro + brancos1 + quantidadeLotesArquivo + 
         quantidadeRegistrosArquivo + brancos2;
}

// Função principal para gerar arquivo remessa CNAB 240
export async function generateCnabFile(protocols: Protocol[], outputPath: string): Promise<string> {
  try {
    if (protocols.length === 0) {
      throw new Error('Nenhum protocolo fornecido para gerar arquivo remessa');
    }

    // Verificar se todos os protocolos são da mesma entidade pagadora
    const payerEntityId = protocols[0].entidade_pagadora_id;
    const allSamePayerEntity = protocols.every(p => p.entidade_pagadora_id === payerEntityId);
    
    if (!allSamePayerEntity) {
      throw new Error('Todos os protocolos devem ser da mesma entidade pagadora');
    }

    // Verificar se todos os protocolos estão aprovados
    const allApproved = protocols.every(p => p.status === 'APROVADO');
    
    if (!allApproved) {
      throw new Error('Todos os protocolos devem estar aprovados');
    }

    // Obter a entidade pagadora
    const payerEntities = await storage.getAllPayerEntities();
    const payerEntity = payerEntities.find(e => e.id === payerEntityId);
    
    if (!payerEntity) {
      throw new Error(`Entidade pagadora id=${payerEntityId} não encontrada`);
    }

    // Iniciar geração do arquivo
    const lines: string[] = [];
    let numeroLote = 1;
    let registrosLote = 2; // Header e trailer do lote
    let registrosArquivo = 2; // Header e trailer do arquivo
    let valorTotal = 0;

    // Adicionar header do arquivo
    lines.push(generateHeader(payerEntity));

    // Adicionar header do lote
    lines.push(generateLoteHeader(payerEntity, numeroLote));

    // Processar cada protocolo
    for (let i = 0; i < protocols.length; i++) {
      const protocol = protocols[i];
      const numeroRegistroP = (i * 3) + 1;
      const numeroRegistroQ = (i * 3) + 2;
      const numeroRegistroR = (i * 3) + 3;

      lines.push(generateSegmentP(protocol, numeroLote, numeroRegistroP));
      lines.push(await generateSegmentQ(protocol, numeroLote, numeroRegistroQ));
      lines.push(generateSegmentR(protocol, numeroLote, numeroRegistroR));

      valorTotal += parseFloat(protocol.valor.toString());
      registrosLote += 3; // P, Q e R
      registrosArquivo += 3;
    }

    // Adicionar trailer do lote
    lines.push(generateLoteTrailer(numeroLote, registrosLote, valorTotal));

    // Adicionar trailer do arquivo
    lines.push(generateFileTrailer(1, registrosArquivo));

    // Garantir que cada linha tenha exatamente 240 caracteres
    const formattedLines = lines.map(line => {
      if (line.length < 240) {
        return line.padEnd(240, ' ');
      } else if (line.length > 240) {
        return line.substring(0, 240);
      }
      return line;
    });

    // Escrever no arquivo
    const fileContent = formattedLines.join('\r\n') + '\r\n';
    fs.writeFileSync(outputPath, fileContent, 'utf8');

    return outputPath;
  } catch (error: any) {
    console.error('Erro ao gerar arquivo CNAB:', error);
    throw new Error(`Falha ao gerar arquivo remessa: ${error.message}`);
  }
}