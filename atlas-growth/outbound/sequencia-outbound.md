# Sequência de outbound — Atlas Tecnologia

Planilha: **coluna A = e-mail · coluna B = nome**.
Variável única: `{{nome}}`. Sem cargo, sem empresa.

---

# E-MAIL 1 — o principal

Mantenha o template HTML que você já tem. Três alterações.

## Alteração 1 — o parágrafo de abertura 🔴

**Localize** o parágrafo que começa com *"Emerson, na maioria das operações"*
(logo abaixo do título "Seus dados estão ajudando a empresa a decidir?").

**Substitua o texto inteiro por:**

```
{{nome}}, na maioria das operações o dado existe — ele só não chega a tempo,
não chega inteiro, ou chega com três versões do mesmo número.

Se isso aparece de perto no seu dia, o resto deste e-mail vale dois minutos.
```

Some o cargo e a empresa. O gancho continua de pé e passa a funcionar para
qualquer destinatário da lista.

## Alteração 2 — limpar as URLs 🟠

Os links do template estão embrulhados no redirecionador do Gmail:

```
https://www.google.com/url?q=https://atlas-partner.com/%23contato&source=gmail&ust=...
```

Isso aconteceu porque o e-mail foi composto dentro do Gmail. Num disparo em
massa, URL de redirecionamento de terceiro **derruba entregabilidade** — é
padrão de phishing para os filtros.

**Troque por URLs diretas com UTM:**

| Onde | URL |
|---|---|
| Botão "Falar com um especialista" | `https://atlas-partner.com/?utm_source=email&utm_medium=outbound&utm_campaign=prospeccao#contato` |
| Link "Conhecer a Atlas" | `https://atlas-partner.com/?utm_source=email&utm_medium=outbound&utm_campaign=prospeccao#cases` |
| Site na assinatura | `https://atlas-partner.com/?utm_source=email&utm_medium=assinatura` |
| Instagram | `https://instagram.com/atlas_tecnologia` |
| LinkedIn | `https://www.linkedin.com/company/108583529/` |

## Alteração 3 — a apresentação 🟡

**Não anexe.** Substitua o link "Conhecer a Atlas" por:

```
Apresentação institucional (PDF, 25 páginas) →
https://atlas-partner.com/apresentacao?utm_source=email&utm_medium=outbound
```

Hospede o `Atlas-Tec-Apresentacao.pdf` (1,7 MB, já comprimido) nesse endereço.
Você ganha entregabilidade e passa a saber **quem abriu** — sinal de interesse
muito mais forte do que abertura de e-mail.

Se insistir em anexar, use a versão comprimida. Nunca a de 15 MB.

## Assuntos para testar

Rode um por lote e compare taxa de abertura.

```
A) Dados que chegam tarde demais para decidir     (o atual)
B) {{nome}}, uma pergunta sobre os dados da operação
C) O dado existe. A decisão é que demora.
D) Três versões do mesmo número
```

O **C** vem da página 2 da sua apresentação institucional — é a melhor linha que
vocês escreveram e ninguém está usando. O **D** é o mais curto e o mais
intrigante; assunto curto costuma ganhar em mobile.

---

# E-MAIL 2 — follow-up (D+3)

Enviar **na mesma thread**, como resposta ao primeiro. Sem imagem, sem HTML
pesado: texto simples aumenta resposta em follow-up.

**Assunto:** `Re: [assunto do e-mail 1]`

```
{{nome}}, tudo bem?

Voltando ao e-mail anterior com uma pergunta mais direta:

quando a diretoria pede um número que cruza duas áreas, quanto tempo leva
até a resposta chegar — e quantas pessoas precisam ser acionadas?

Se a resposta for "depende de quem está disponível", o gargalo não é de
ferramenta. É de arquitetura.

É exatamente o tipo de coisa que a gente mapeia numa conversa de 30 minutos.
Sem compromisso e sem proposta no final se não fizer sentido.

Abraço,
Sérgio
```

---

# E-MAIL 3 — encerramento (D+7)

O que mais gera resposta da sequência inteira. Funciona porque devolve o
controle e não pressiona.

**Assunto:** `Re: [assunto do e-mail 1]`

```
{{nome}},

Como não tive retorno, assumo que não é prioridade agora — o que é
completamente justo.

Encerro o contato por aqui. Se em algum momento o assunto voltar à mesa,
é só responder este e-mail que retomo de onde paramos.

Deixo uma coisa que pode ser útil independente da Atlas: antes de decidir
qualquer arquitetura de dados, vale responder quatro perguntas.

1. Que dado você tem — só tabela de sistema, ou também log, texto e arquivo?
2. Quem vai consumir — analista num dashboard, ou cientista num notebook?
3. Precisa reprocessar o passado se descobrir um erro de regra em seis meses?
4. Quem mantém isso depois que o projeto acabar?

Responde essas quatro e a escolha de tecnologia quase se faz sozinha.

Abraço,
Sérgio
```

---

# Configuração do disparo

## Merge

**Use só o primeiro nome.** A coluna B costuma trazer nome completo, e
*"Emerson Silva Rodrigues, na maioria das operações…"* denuncia automação na
primeira linha.

Se a ferramenta não tiver função de primeiro nome, crie uma coluna C na planilha:

```
=PROPER(TRIM(INDEX(SPLIT(B2;" ");1)))
```

E use `{{primeiro_nome}}` no lugar.

**Antes de disparar, filtre a planilha:**
- linhas com coluna B vazia → remova (senão sai ", na maioria das operações…")
- nomes em CAIXA ALTA → o `PROPER` acima resolve
- e-mails genéricos (`contato@`, `comercial@`, `sac@`) → remova, não têm dono

## Volume

Domínio novo em disparo frio queima rápido. Escalone:

| Semana | E-mails/dia |
|---|---|
| 1 | 20 |
| 2 | 40 |
| 3 | 60 |
| 4+ | 100 (teto) |

Só suba se a taxa de bounce ficar **abaixo de 3%**. Acima disso, pare e limpe
a lista antes de continuar.

## Antes do primeiro disparo

- [ ] SPF, DKIM e DMARC configurados no domínio — sem os três, metade vai pra spam
- [ ] Testar em Gmail, Outlook e celular antes do lote
- [ ] Opt-out já está no rodapé ("responder com remover") — mantenha
- [ ] Quem responder "remover" sai da lista **no mesmo dia**
- [ ] Parar a sequência automaticamente quando a pessoa responder

## O que medir

| Métrica | Referência de partida |
|---|---|
| Entrega | > 97% |
| Abertura | 35–45% |
| Resposta | 3–8% |
| Reunião agendada | 1–2% da lista |

São benchmarks de teste, não promessa. Meça os seus por duas semanas e ajuste
a partir do número real.

---

# Conferência de conteúdo

Os números do e-mail foram checados contra a apresentação institucional
(página 23) e **batem**:

500+ projetos entregues · 249k+ horas trabalhadas · 95% satisfação ·
10+ setores atendidos · 6+ anos de alocação · 20+ clientes atendidos

Os três cases do e-mail também correspondem às páginas 15, 16 e 17, com nomes
de clientes preservados. Pode disparar sem receio nessa parte.
