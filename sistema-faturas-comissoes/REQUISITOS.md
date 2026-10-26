# Sistema de Faturas e Comissões — Levantamento de Requisitos

> Consolidado das reuniões com a equipe (Jussi, Tânia, Vinícius, Guilherme).
> Última atualização: 26/10/2026. Status: **aguardando materiais de exemplo**.

## 1. Objetivo

Criar um sistema próprio, online, que **substitui completamente o Quiver** (que será desligado),
cobrindo cadastro, lançamento de faturas/endossos, baixa de comissões, repasse aos comerciais
e relatórios.

## 2. Contexto do negócio

- Foco principal: **seguro de transporte de carga** (averbação). O segurado embarca cargas no mês;
  a seguradora aplica uma taxa sobre o total carregado → **fatura mensal = endosso**.
- Movimento = mês fechado (dia 1 ao último dia). Vencimento cai no mês seguinte.
- Produtos de transporte: **RCT (ramo 54), RCF (ramo 55), RCV**. Uma apólice por cliente + produto.
  Outras categorias (automóvel, aduaneiro…) devem caber no sistema (categoria → produto).
- Parcela sempre **1/1**. Não existe pagamento parcial: cada endosso/ramo está pago 100% ou não.
- **% de comissão da corretora e % do comercial vêm na apólice/endosso** — não são calculados.
- Volume: ~200 clientes, **~500 endossos por dia** (estimativa conservadora).
- Usuários: **mínimo 3 simultâneos**.
- Papéis: **Jussi** cadastra e lança faturas; **Tânia** dá baixa e paga comerciais.

## 3. Fluxo

```
Cliente → Apólice (cliente + produto + seguradora + %) → Endosso/fatura mensal
  → segurado paga a seguradora → seguradora envia extrato de comissão
  → baixa:          PENDENTE → LIBERADO   (data de liberação automática)
  → fechamento:     LIBERADO → PAGO       (recibo de quitação, data de corte)
```

## 4. Problemas atuais (Quiver) que o sistema deve resolver

1. **"Erro de layout" na baixa**: qualquer divergência (valor, nº endosso, %, apólice completa vs.
   parcial) impede a baixa sem dizer o quê; 20–30 min para achar cada erro, navegando entre telas lentas.
2. **Relatórios confusos**: status em páginas separadas, sem filtro por movimento, exige Excel e soma manual.
3. **Aparente duplicidade**: pagamentos atrasados aparecem junto com os do mês e parecem pagamento em dobro.
4. **Sem acesso ao banco** para BI.
5. Dados digitados duas vezes (portal da seguradora → Quiver).

Referência positiva: o **sistema antigo em VB** (baixa por ramo azul/vermelho, pendentes visíveis
mas fora do total, filtro pago / não pago / todos, simples e direto).

## 5. Decisões

- Sistema **online**, login por usuário, perfis de acesso, registro de quem alterou o quê.
- Desenvolvimento em **MVP + versões**.
- **Quiver será desligado** → todo histórico necessário (clientes, apólices, endossos em aberto,
  repasses liberados não pagos) precisa ser **migrado**.
- Movimento é campo **mês/ano** e principal filtro de relatórios.
- Status é **coluna filtrável**, não páginas separadas.
- Divergências exibidas **lado a lado** e corrigidas **na própria linha**.
- Nada é baixado sem confirmação humana (a "trava" continua).

## 6. Escopo do MVP

| # | Módulo | Descrição |
|---|---|---|
| 1 | Migração | Importar clientes, apólices, endossos e repasses em aberto do Quiver (Excel) |
| 2 | Cadastros | Categorias/produtos, seguradoras, comerciais, clientes, apólices (com % corretora e % comercial) |
| 3 | Lançamento de endossos | **Importação do Excel da seguradora** ("Gestão de parcelas") em lote com conferência; manual para exceções; endosso único por apólice; nº do endosso pode ser completado depois |
| 4 | Baixa de comissão | Tela única pago/não pago por ramo, **baixa em lote**, data de liberação automática, correção na linha |
| 5 | Fechamento do comercial | Lista tudo liberado e não pago (qualquer movimento), gera **recibo de quitação em PDF** para assinatura, lote vira pago e não pode entrar em outro recibo; estorno registrado |
| 6 | Relatórios | Corretora (produção / recebido / pendente por movimento) e comercial (azul/vermelho, agrupado por movimento, atrasos sinalizados, totais "a pagar" e "pendente") |

Três datas por endosso: **movimento** (lançamento), **liberação** (baixa, automática),
**pagamento ao comercial** (fechamento, automática).

## 7. Próximas versões

1. Importação do extrato de comissão com **baixa por semelhança** (tudo bate → baixa; quase tudo → sugere;
   nada → lista com motivo; correção atualiza o cadastro).
2. Leitura de PDF com IA (tolerante a mudança de layout).
3. Agente de IA que baixa relatórios dos portais das seguradoras (atenção: captcha/2FA, senhas,
   termos de uso, custo).

## 8. Arquitetura (a estudar)

- Python (**Django**) + **Postgres**; hospedagem gerenciada (Render/Railway/Vercel + Supabase/Neon).
- Plano **pago básico** (gratuitos pausam/limitam) — volume ~10–11 mil endossos/mês, >120 mil/ano.
- Índices por movimento/status/comercial para relatórios rápidos; backup automático.
- Subdomínio do site da corretora.

### Modelo de dados (rascunho)

```
categoria (id, nome)
produto (id, categoria_id, nome, ramo)
seguradora (id, nome)
comercial (id, nome)
cliente (id, razao_social, cnpj, ativo, comercial_id)
apolice (id, cliente_id, produto_id, seguradora_id, numero,
         pct_comissao_corretora, pct_comissao_comercial)          -- 1 por cliente+produto
fatura_endosso (id, apolice_id, numero_fatura, endosso, movimento [mês/ano],
                vencimento, premio_liquido,
                pct_comissao_corretora, pct_comissao_comercial,  -- cópia da apólice, editável
                valor_comissao, status [pendente/liberado], data_liberacao)
                UNIQUE (apolice_id, endosso)
repasse (id, fatura_endosso_id, comercial_id, valor,
         status [liberado/pago], fechamento_id)
fechamento_comercial (id, comercial_id, data_corte, total_producao, total_comissao,
                      recibo_pdf, estornado_em, estornado_por)
auditoria (id, usuario, tabela, registro_id, campo, valor_antigo, valor_novo, data)
```

## 9. Pendências

- [ ] Materiais (prometidos): Excel de clientes/apólices do Quiver; Excel "Gestão de parcelas" das
      principais seguradoras + print do "Ver detalhes"; extrato de comissão (Yellow); relatório do comercial atual
- [ ] Levantar **tudo o que o Quiver faz hoje e é usado** (ex.: orçamentos, outros ramos, sinistros) para não perder funcionalidade no desligamento
- [ ] Definir prazo de desligamento do Quiver e período de uso em paralelo
- [ ] Fluxograma do processo (equipe vai desenhar)
- [ ] Perguntar às seguradoras: nº do endosso na exportação? API para corretoras?
- [ ] Pedir ao desenvolvedor do sistema antigo: banco (.mdb) e/ou código-fonte (opcional)
- [ ] Assistente (Paulo Ferreira) recebe comissão? — fora do escopo por enquanto
