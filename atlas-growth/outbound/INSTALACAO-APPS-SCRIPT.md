# Instalação do disparo — Google Apps Script

~20 minutos, uma vez só.

---

## 1. Preparar a planilha

Renomeie a aba para **`Contatos`** e deixe a primeira linha assim:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| email | nome | status | enviado_em | thread_id | etapa | observacao |

Preencha só A e B. O resto o script preenche sozinho — **não mexa nessas colunas
enquanto o disparo estiver rodando.**

## 2. Colar o script

Na planilha: **Extensões → Apps Script**. Apague o conteúdo do `Código.gs`,
cole o arquivo `Codigo.gs` inteiro e salve.

Recarregue a planilha. Vai aparecer um menu novo: **Atlas Outbound**.

## 3. O rascunho template — já está pronto

O HTML **não fica no código** — fica num rascunho do Gmail. Assim você edita o
design no próprio Gmail, sem tocar em programação.

**O rascunho já foi criado na sua conta**, com assunto exatamente
`TEMPLATE Atlas Outbound`. Ele preserva o design do e-mail original e traz o
parágrafo de abertura já corrigido:

> {{nome}}, na maioria das operações o dado existe — ele só não chega a tempo,
> não chega inteiro, ou chega com três versões do mesmo número.
>
> Se isso aparece de perto no seu dia, o resto deste e-mail vale dois minutos.

Só confira que ele está lá e **deixe parado** na caixa de rascunhos. Não envie.

O script recusa rodar se o rascunho não tiver `{{nome}}` — proteção contra
disparar a versão com o nome fixo de novo.

### Sobre os links e o aviso de redirecionamento

O Gmail reembrulha **todo** link de mensagem armazenada em
`https://www.google.com/url?q=...`. Não adianta limpar no rascunho: ele reescreve
de novo na próxima vez que salvar.

Isso importa num disparo em massa — redirecionador de terceiro é padrão de
phishing para os filtros. Por isso a limpeza acontece **no envio**, pela função
`limparUrls_()`, e o link sai assim:

```
https://atlas-partner.com/?utm_source=email&utm_medium=outbound&utm_campaign=prospeccao#contato
```

**O que a limpeza resolve e o que não resolve.** Ela garante que o HTML enviado
carrega o endereço direto. O que ela não controla é a camada de exibição do
próprio Gmail: ao **abrir** a mensagem dentro do Gmail — inclusive a sua cópia
em Enviados — o Google reescreve os links na hora de mostrar a página e exibe o
aviso de "você está saindo". É comportamento antiphishing do cliente, não tem
chave para desligar do lado de quem envia.

Ou seja: **teste no Outlook/Hotmail ou no celular, nunca na cópia do Gmail.** Se
lá o link abrir direto, está correto — é só o Gmail enfeitando o que ele mesmo
exibe.

Se o aviso aparecer também fora do Gmail, aí o embrulho veio junto na mensagem e
a limpeza falhou: rode **2. Conferir links do template** e me avise.

**Texto puro.** A versão sem HTML agora imprime a URL completa com `https://`.
Antes, a âncora "atlas-partner.com" virava texto solto e o leitor auto-linkava
como `http://` — sem o s, o que dispara aviso de site não seguro.

### Quando hospedar a apresentação

O link "Conhecer a Atlas" hoje aponta para a seção de cases do site. Quando você
subir o `Atlas-Tec-Apresentacao.pdf`, edite o rascunho e troque o texto e o
destino para:

```
Apresentação institucional (PDF, 25 páginas)
https://atlas-partner.com/apresentacao
```

A UTM o script acrescenta sozinho.

## 4. Ajustar a configuração

No topo do `Codigo.gs`, no bloco `CFG`:

```js
ASSUNTO_ENVIO: 'O dado existe. A decisão é que demora.',
MAX_POR_EXECUCAO: 20,
```

`ASSUNTO_ENVIO` é o assunto que o destinatário vê — **diferente** do assunto do
rascunho. Troque para testar as variantes.

## 5. Validar antes de enviar nada

**Atlas Outbound → 1. Validar planilha**

Não envia nada. Percorre a lista e escreve na coluna `observacao` o que seria
pulado e por quê: nome vazio, caixa genérica, e-mail inválido. Também mostra o
primeiro nome que cada contato receberia — **confira essa coluna antes de
seguir.**

Corrija a planilha e rode de novo até ficar limpo.

Depois rode **2. Conferir links do template**. Ele mostra como cada link vai
sair depois da limpeza e avisa se sobrou algum `google.com/url`. Se aparecer o
aviso, não dispare — me avise.

## 6. Teste em você mesmo

Coloque 2 ou 3 linhas com os seus próprios e-mails no topo da planilha e rode
**3. Enviar lote**. Na primeira execução o Google pede autorização: vai aparecer
"app não verificado" — é o seu próprio script, clique em Avançado → Acessar.

Abra no Gmail, no Outlook e no celular. Confirme que o nome apareceu certo e que
os links não estão embrulhados no `google.com/url`.

## 7. Ligar o automático

**Atlas Outbound → ▶ Ligar automação**

A partir daí você não precisa abrir a planilha. O script passa a:

- rodar **de hora em hora, das 9h às 17h**, só em **dias úteis** (Brasília);
- dividir a cota do dia pelas horas que ainda restam, em vez de despejar tudo
  de uma vez — 8 segundos entre cada envio;
- **subir o volume sozinho**, uma semana por degrau: 20 → 40 → 60 → 100/dia;
- disparar os **follow-ups** D+3 e D+7 todo dia às 14h40;
- te mandar um **resumo por e-mail às 17h50** com enviados no dia, respostas,
  opt-outs, erros e quanto falta na lista.

Para parar: **⏸ Pausar automação**. Remove os gatilhos e não apaga nada da
planilha — religar continua de onde parou.

**Atlas Outbound → Ver status da campanha** mostra a qualquer momento em que
semana da rampa você está, o teto do dia, quantos já saíram e quanto falta.

### Mudar o ritmo

No bloco `CFG`, no topo do arquivo:

```js
SOMENTE_DIAS_UTEIS: true,
HORA_INICIO: 9,
HORA_FIM: 17,
RAMPA_DIARIA: [20, 40, 60, 100],
ENVIAR_RELATORIO: true,
```

`RAMPA_DIARIA` é um degrau por semana; depois do último, fica no teto para
sempre. Se quiser começar mais devagar, troque para `[10, 20, 40, 60, 100]`.

Depois de mexer em `HORA_INICIO`, `HORA_FIM` ou `ENVIAR_RELATORIO`, rode
**▶ Ligar automação** de novo — os gatilhos são recriados com os novos horários.

---

## O que o script faz sozinho

**Primeiro nome.** `EMERSON SILVA RODRIGUES` vira `Emerson`. Acentuação preservada.

**Pula o que estragaria o envio.** Nome vazio (sairia começando com vírgula),
caixa genérica (`contato@`, `comercial@`, `sac@` e mais 13 prefixos), e-mail
malformado, nome que é número.

**Não duplica.** Linha com status `ENVIADO`, `PULADO`, `RESPONDEU` ou `REMOVER`
é ignorada nas execuções seguintes.

**Follow-up na mesma thread.** D+3 e D+7 saem como resposta ao primeiro e-mail,
não como mensagem nova. Muda bastante a taxa de resposta.

**Para quando a pessoa responde.** Antes de cada follow-up, lê a thread. Se
apareceu mensagem de alguém que não é você, marca `RESPONDEU` e encerra a
sequência — ninguém recebe follow-up depois de ter respondido.

**Respeita o opt-out.** Se a resposta contém "remover", "descadastrar",
"unsubscribe" ou "não contatar", marca `REMOVER` e nunca mais toca naquele
contato.

**Protege a quota.** Para o lote quando faltam 5 envios para o limite diário do
Gmail, em vez de estourar no meio.

**Sobe o volume sozinho.** Conta os dias desde que você ligou a automação e
aplica o degrau da semana. Não precisa lembrar de editar nada na segunda-feira.

**Não trabalha de madrugada nem no fim de semana.** E-mail frio chegando
sábado às 3h é sinal de robô.

**Espaça os envios.** 8 segundos entre um e outro. Rajada de 20 e-mails no mesmo
segundo é padrão de robô.

---

## Escalonar o volume

Domínio novo em disparo frio queima rápido, e recuperar reputação leva meses.
A rampa já está no código (`RAMPA_DIARIA`) e sobe sozinha:

| Semana | E-mails/dia |
|---|---|
| 1 | 20 |
| 2 | 40 |
| 3 | 60 |
| 4+ | 100 |

**Confira o bounce no fim de cada semana.** Se passar de 3%, edite
`RAMPA_DIARIA` para segurar no degrau atual e limpe a lista antes de subir.
A rampa é automática; a decisão de continuar não é.

## Antes do primeiro disparo real

- [ ] SPF, DKIM e DMARC configurados no domínio — sem os três, metade vai pra spam
- [ ] Rodou a validação e a coluna `observacao` está limpa
- [ ] Testou em Gmail, Outlook e celular
- [ ] Conferiu que os links não têm `google.com/url`
- [ ] O rodapé de opt-out continua no template

## Se algo der errado

| Sintoma | Causa |
|---|---|
| "Rascunho não encontrado" | O assunto do rascunho não é exatamente `TEMPLATE Atlas Outbound` |
| Link sai com `google.com/url` | A limpeza falhou. Rode "Conferir links" e me avise |
| "Não contém {{nome}}" | Falta a variável no corpo — é a proteção funcionando |
| `thread_id` vazio | A busca não achou a thread; o follow-up daquela linha não sai. Preencha à mão ou reenvie |
| Status `ERRO` | O motivo está na coluna `observacao` |
| Nada dispara no horário | Gatilhos não criados, ou a autorização expirou. Rode "▶ Ligar automação" de novo |
| Enviou menos do que o esperado | Normal: a cota do dia é dividida pelas horas restantes. Veja "Ver status da campanha" |
| Não chegou o resumo das 17h50 | `ENVIAR_RELATORIO` está `false`, ou é fim de semana |

## Limites do Gmail

Conta Workspace: **1.500 envios/dia**. Conta gratuita: **500/dia**.
O menu **Ver quota restante hoje** mostra quanto sobrou.
