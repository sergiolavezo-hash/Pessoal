# Playbook Operacional — TikTok Shop

Versão operacional condensada do `prompt-mestre.md`. Aqui ficam as regras de cálculo, pesos, limiares e frameworks usados em toda análise.

---

## 1. Rubrica de análise de produto (0–100)

Cada produto recebe nota de 0 a 100 em 11 critérios. A nota final é a **média ponderada** com os pesos abaixo:

| # | Critério | Peso | Observação |
|---|----------|------|------------|
| 1 | Potencial de viralização | 10 | Apelo visual, reação emocional, "efeito uau" em <3s |
| 2 | Potencial de conversão | 12 | Problema claro + solução óbvia + preço acessível |
| 3 | Comissão | 12 | Avaliar R$ absolutos por venda, não só o % |
| 4 | Demanda | 10 | Volume de busca, vendas existentes, avaliações |
| 5 | Compra por impulso | 10 | Preço ideal R$20–120; decisão em segundos |
| 6 | Facilidade de demonstração | 8 | Resultado visível em vídeo curto |
| 7 | Potencial de UGC | 6 | Parece natural em selfie/POV/unboxing |
| 8 | Potencial para lives | 4 | Demonstrável ao vivo repetidamente |
| 9 | Potencial de recompra | 6 | Consumível ou colecionável |
| 10 | Concorrência (invertida) | 8 | Menos concorrência = nota MAIOR |
| 11 | Potencial de escala | 14 | Vários públicos, vários ângulos, estoque, anúncios |

**Nota final = Σ (nota do critério × peso) ÷ 100**

### Classificação

| Nota final | Classificação | Ação |
|------------|---------------|------|
| ≥ 80 | 🔥 EXCELENTE OPORTUNIDADE | Testar imediatamente, prioridade máxima |
| 65–79 | 🟢 BOA OPORTUNIDADE | Entrar na fila de testes |
| 50–64 | 🟡 TESTAR | Testar com poucos vídeos antes de investir |
| < 50 | 🔴 EVITAR | Não vale o custo de oportunidade |

Toda análise termina com o veredito: **"EU TESTARIA OU NÃO TESTARIA?"** + justificativa + estratégia.

### Dados mínimos para analisar um produto

Se algum destes faltar, pedir explicitamente:

1. Nome/link do produto
2. Preço de venda
3. Comissão (% e/ou R$)
4. Categoria
5. Há amostra grátis para o criador? (sim/não)
6. Quantidade de vendas/avaliações visíveis na plataforma
7. Quantos criadores já promovem (se visível)

---

## 2. Fórmulas financeiras

- **Comissão por venda** = preço × % de comissão
- **Vendas p/ meta** = meta ÷ comissão por venda (ex.: R$1.000 ÷ R$7,50 = 134 vendas)
- **Vendas por vídeo** = views × CTR × conversão
- **Comissão por 1.000 views (CPM de comissão)** = (comissão total ÷ views) × 1.000
- **Views necessárias p/ meta** = vendas p/ meta ÷ (CTR × conversão)
- **Custo por venda (com mídia)** = investimento ÷ vendas atribuídas
- **ROAS de comissão** = comissão gerada ÷ investimento (só escalar mídia se > 1,5–2×)

Metas padrão a calcular sempre: **R$1.000 / R$5.000 / R$10.000 / R$20.000 por mês.**

### Benchmarks de referência (ajustar com dados reais da conta)

| Métrica | Ruim | OK | Bom | Excelente |
|---------|------|-----|------|-----------|
| Retenção 3s | <50% | 50–65% | 65–80% | >80% |
| Taxa de conclusão | <15% | 15–30% | 30–45% | >45% |
| CTR no produto | <1% | 1–2% | 2–4% | >4% |
| Conversão (clique→pedido) | <2% | 2–5% | 5–10% | >10% |
| Comissão por 1.000 views | <R$5 | R$5–15 | R$15–40 | >R$40 |

**Regra de decisão:** a métrica que manda é comissão por 1.000 views, não visualização. Vídeo com 20 mil views vendendo bem > vídeo com 1 milhão de views e zero vendas.

---

## 3. Funil de conteúdo

| Etapa | Objetivo | Tipo de conteúdo | % do mix |
|-------|----------|------------------|----------|
| TOPO | Viralização e descoberta | Reação, "efeito uau", curiosidade pura, trend adaptada | ~30% |
| MEIO | Problema + demonstração | "Se você sofre com X…", teste na câmera, antes/depois | ~50% |
| FUNDO | Conversão | Review completo, prova social, oferta, comparação, FAQ | ~20% |

---

## 4. Matriz de testes (padrão)

Para cada produto novo: **5 ângulos × 2 hooks = 10 vídeos de teste** antes de julgar o produto.

Ângulos padrão (adaptar ao produto):

- A — Economia ("custa 1/3 do que eu pagava")
- B — Dor ("se você sofre com X…")
- C — Curiosidade ("eu achei que era golpe")
- D — Demonstração pura (resultado na tela em 5s)
- E — Transformação (antes vs depois)

Critérios para declarar vencedor: ≥2× a comissão/1.000 views da média dos testes, com no mínimo ~2.000 views para dar significância.

**Vencedor identificado → gerar 10–30 variações**: novos hooks, aberturas, CTAs, cenas, personas, durações e narrativas. Nunca apenas repostar o mesmo vídeo.

---

## 5. Estrutura padrão de vídeo

**HOOK (0–2s) → PROBLEMA (2–6s) → SOLUÇÃO (6–10s) → DEMONSTRAÇÃO (10–20s) → PROVA (20–25s) → CTA (final)**

Proibido: "Oi pessoal, hoje eu vim mostrar…"

Banco de hooks base (adaptar ao produto):

1. "Eu queria ter descoberto isso antes."
2. "Se você sofre com X, olha isso."
3. "Eu achei que era besteira até testar."
4. "Isso aqui resolveu um problema que eu tinha há anos."
5. "Não compre X antes de ver isso."
6. "Eu não esperava que isso funcionasse."
7. "Para de fazer X do jeito difícil."
8. "Isso custa menos que um lanche e resolve X."
9. "Testei o produto que todo mundo tá falando."
10. "O motivo de X acontecer com você é esse."

Entrega de cada roteiro no formato do template `templates/roteiro-video.md`.

---

## 6. Gatilhos psicológicos permitidos

Curiosidade, prova social (real), autoridade, especificidade, demonstração, contraste, urgência legítima (promoção real, estoque real), redução de risco, transformação, identificação, dor, desejo, conveniência, novidade, efeito "eu preciso disso".

**Nunca:** depoimentos inventados, números falsos, claims médicos/resultados não comprovados, urgência falsa.

---

## 7. UGC — formatos padrão

Selfie falando direto, câmera frontal no espelho, POV, unboxing, demonstração caseira, review sincero (citar pontos fracos leves aumenta credibilidade), reação genuína, storytelling ("eu tinha esse problema…"), "comprei para testar", "não esperava isso", comparação com alternativa cara, rotina (produto inserido no dia a dia), problema real filmado.

Regra: parecer nativo do TikTok. Luz natural, cortes rápidos, áudio direto do celular, imperfeição controlada.

---

## 8. Estrutura de live (blocos de 15 min, repetíveis)

1. **0–2 min** — Gancho de abertura: mostrar o produto mais visual + anunciar oferta/brinde do dia
2. **2–6 min** — Demonstração do produto principal com resultado visível
3. **6–8 min** — Interação: perguntas para o chat ("quem aqui já passou por X?"), responder comentários pelo nome
4. **8–11 min** — Oferta + CTA forte ("toca no carrinho laranja, item nº X")
5. **11–13 min** — Produto complementar (aumenta ticket)
6. **13–15 min** — Prova social real (vendas na live, avaliações) + reset do gancho para quem entrou agora

Repetir o bloco trocando o produto em destaque. A cada entrada de espectadores, tratar como se fosse o minuto zero.

---

## 9. Estratégia de perfil

- **Posicionamento:** curador de achados — "essa pessoa sempre encontra produtos bons"
- **Nome/bio:** nicho claro + promessa ("Achados que resolvem" / "Testo antes de indicar")
- **Vitrine:** organizada por problema resolvido, não por categoria da loja
- **Frequência mínima viável:** 2–4 vídeos/dia na fase de testes; 1–2 lives/semana quando houver produto validado
- **Prova social:** fixar os vídeos com mais vendas (não os com mais views)

---

## 10. Calendário base (fase de testes)

| Dia | Vídeos | Conteúdo |
|-----|--------|----------|
| Seg | 3 | Produto A: ângulos A, B, C |
| Ter | 3 | Produto A: ângulos D, E + melhor hook do dia anterior variado |
| Qua | 3 | Produto B: ângulos A, B, C |
| Qui | 3 | Produto B: ângulos D, E + variação |
| Sex | 3 | Variações dos 2 melhores vídeos da semana |
| Sáb | 2 + live | Reciclagem de vencedores + live de demonstração |
| Dom | 2 | Topo de funil (viralização) |

Horários de teste inicial: 12h–13h, 18h–20h, 21h–22h (refinar com os dados da própria conta).

---

## 11. MODO MÁQUINA DE VENDAS (checklist de execução)

Quando o comando for dado, executar em sequência:

1. Pesquisar/priorizar produtos (rubrica §1) → ranking TOP 10 + 🏆 Produto #1
2. Definir ângulos (matriz §4)
3. Criar hooks, scripts e CTAs (formato §5 + template de roteiro)
4. Montar matriz de testes com cronograma (§10)
5. Definir métricas de corte e metas financeiras (§2)
6. Ao receber dados: identificar vencedores, gerar 10–30 variações, sugerir escala (mais frequência → live → mídia paga se ROAS > 1,5)
7. Estimar comissão projetada por cenário (conservador / realista / otimista)

---

## 12. Limites (inegociáveis)

Sem spam, bots, seguidores comprados, métricas manipuladas, avaliações/depoimentos falsos, claims médicos não comprovados, ou qualquer violação das regras do TikTok Shop. Crescimento agressivo, mas 100% dentro das regras.
