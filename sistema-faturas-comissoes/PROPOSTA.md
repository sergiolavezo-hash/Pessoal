# Proposta — Sistema de Faturas e Comissões

> Rascunho para negociação. Valores e prazos são estimativas a ajustar depois de analisar os
> materiais de exemplo (Excel da seguradora, Excel do Quiver, extrato, relatório do comercial).

## 1. Escopo (MVP — substitui o Quiver)

**Incluído**

1. Sistema web online, login individual, perfis de acesso (ex.: administrador, lançamento, financeiro),
   mínimo 3 usuários simultâneos, registro de alterações (auditoria) e backup automático.
2. Cadastros: categorias/produtos (RCT, RCF, RCV e outros ramos), seguradoras, comerciais e assistentes,
   clientes, apólices (com % de comissão da corretora e do comercial).
3. Migração única dos dados do Quiver (clientes, apólices, endossos em aberto, repasses liberados).
4. Lançamento de endossos: importação do Excel da seguradora em lote (layouts de até **3 seguradoras**)
   com tela de conferência + lançamento manual com validações (endosso único, movimento mês/ano).
5. Baixa de comissão **manual**: tela única pago/não pago por ramo, busca, baixa em lote, data de
   liberação automática, correção na própria linha.
6. Fechamento do comercial: lista de liberados não pagos, recibo de quitação em PDF, trava contra
   pagamento em dobro, estorno registrado.
7. Relatórios: corretora (produção / recebido / pendente por movimento) e comercial (azul/vermelho,
   agrupado por movimento, totais a pagar e pendente), com exportação para Excel e PDF.
8. Treinamento da equipe e manual rápido de uso.

**Fora do escopo (orçado à parte, se desejado)**

- Leitura de PDF/extrato com IA, agentes que acessam portais das seguradoras.
- Integrações com seguradoras, Quiver ou sistemas contábeis.
- Aplicativo mobile (o sistema web funciona no celular, mas sem app nativo).
- Layouts de importação além das 3 seguradoras incluídas (cada novo: **4 a 8 h**).
- Módulos não ligados a faturas/comissões (ex.: orçamentos, sinistros) — avaliar no levantamento do Quiver.

## 2. Estimativa de horas

| Etapa | Horas (mín–máx) |
|---|---|
| Análise dos materiais, fluxograma e validação do escopo | 12–16 |
| Estrutura: projeto, banco, login, perfis, auditoria, publicação online | 16–20 |
| Cadastros | 24–32 |
| Migração do Quiver (scripts, limpeza, conferência) | 16–24 |
| Importação do Excel da seguradora + tela de conferência | 24–32 |
| Lançamento manual de endosso + validações | 12–16 |
| Baixa de comissão (filtros, lote, edição na linha) | 24–32 |
| Fechamento do comercial + recibo PDF + estorno | 20–28 |
| Relatórios + exportação Excel/PDF | 28–36 |
| Testes, homologação com a equipe e ajustes | 20–28 |
| Treinamento, manual e acompanhamento do paralelo | 8–12 |
| **Total** | **204–276 h** (referência: **~240 h**) |

## 3. Valor

**Valor-hora sugerido: R$ 100/h** (faixa de mercado para desenvolvedor Python freelancer pleno/sênior
no Brasil: ~R$ 80 a R$ 150/h; R$ 100 é um meio-termo justo para empresa de pequeno porte).

| Cenário | Horas | Valor |
|---|---|---|
| Mínimo | 204 h | R$ 20.400 |
| Referência | 240 h | R$ 24.000 |
| Máximo | 276 h | R$ 27.600 |

**Recomendação: preço fechado de R$ 22.000 a R$ 24.000** para o escopo acima (o risco de estouro
fica com o desenvolvedor, o cliente tem previsibilidade). Mudanças de escopo: R$ 100/h, aprovadas antes.

**Forma de pagamento sugerida (por entrega):**

| Marco | % | Valor (base R$ 24.000) |
|---|---|---|
| Assinatura / início | 20% | R$ 4.800 |
| Entrega 1 — estrutura, cadastros, migração | 25% | R$ 6.000 |
| Entrega 2 — endossos e baixa | 25% | R$ 6.000 |
| Entrega 3 — fechamento, relatórios, homologação | 30% | R$ 7.200 |

Alternativa: parcelamento em 6 a 10 vezes, se fizer mais sentido para o caixa da empresa.

## 4. Prazo

| Dedicação | Prazo de desenvolvimento |
|---|---|
| Meio período (~20 h/semana) | **12 a 14 semanas** (~3 meses) |
| Integral (~40 h/semana) | 6 a 7 semanas |

Cronograma (meio período):

| Semanas | Entrega |
|---|---|
| 1–4 | Entrega 1: estrutura online, cadastros, migração dos dados do Quiver |
| 5–8 | Entrega 2: importação/lançamento de endossos, baixa de comissão |
| 9–12 | Entrega 3: fechamento do comercial, relatórios, homologação |
| +2–4 | Uso em **paralelo com o Quiver**, ajustes, desligamento do Quiver |

Dependência: o prazo começa a contar com os materiais de exemplo e o acesso aos dados do Quiver.

## 5. Garantia, suporte e melhorias

**Garantia: 90 dias** após a entrega final — correção de defeitos sem custo
(defeito = algo do escopo que não funciona como combinado; não inclui novas funções).

**Plano mensal (após a garantia), escolher um:**

| Plano | Mensalidade | Inclui |
|---|---|---|
| Essencial | R$ 600 | Até 5 h/mês: correções, monitoramento, verificação de backup, atualizações de segurança, ajuste de layout de importação quando a seguradora mudar |
| Evolução | R$ 1.200 | Até 12 h/mês: tudo do Essencial + pequenas melhorias e novos relatórios |

- Horas não usadas não acumulam (ou acumulam por no máximo 1 mês — a combinar).
- Horas excedentes: R$ 100/h, com aprovação prévia.
- Atendimento: urgente (sistema fora do ar / bloqueio de trabalho) em até 4 h úteis;
  demais em até 2 dias úteis. Horário comercial.
- Melhorias grandes (ex.: leitura de PDF com IA, estimada em 40–60 h) orçadas à parte.

## 6. Custos de infraestrutura (pagos direto pela empresa)

| Item | Estimativa |
|---|---|
| Hospedagem da aplicação | ~R$ 50–150/mês |
| Banco de dados Postgres gerenciado com backup | ~R$ 100–150/mês |
| Domínio | já existente (subdomínio do site) |
| **Total** | **~R$ 150–300/mês** |

As contas ficam **no nome da empresa** (o sistema e os dados são dela). Valores a confirmar na contratação.

## 7. Propriedade e garantias para o cliente

- Código-fonte e dados pertencem à empresa; repositório entregue ao final.
- Documentação técnica mínima para que outro desenvolvedor consiga dar manutenção
  (evitar repetir o problema do sistema antigo).
- Comparativo sugerido: mensalidade atual do Quiver × custo de infraestrutura + plano de suporte.
