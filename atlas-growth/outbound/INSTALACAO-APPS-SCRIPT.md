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

## 3. Criar o rascunho que serve de template

O HTML **não fica no código** — fica num rascunho do Gmail. Assim você edita o
design no próprio Gmail, sem tocar em programação.

1. No Gmail, abra o e-mail que você já montou (o "Dados que chegam tarde demais")
2. Encaminhe para você mesmo e **salve como rascunho**, sem enviar
3. Mude o assunto do rascunho para exatamente: **`TEMPLATE Atlas Outbound`**
4. No corpo, aplique as três alterações do `sequencia-outbound.md`:
   - o parágrafo de abertura com **`{{nome}}`**
   - as URLs limpas com UTM
   - o link da apresentação
5. Salve e **deixe o rascunho parado** na caixa de rascunhos

O script recusa rodar se o rascunho não tiver `{{nome}}` — proteção contra
disparar a versão com o nome fixo de novo.

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

## 6. Teste em você mesmo

Coloque 2 ou 3 linhas com os seus próprios e-mails no topo da planilha e rode
**2. Enviar lote**. Na primeira execução o Google pede autorização: vai aparecer
"app não verificado" — é o seu próprio script, clique em Avançado → Acessar.

Abra no Gmail, no Outlook e no celular. Confirme que o nome apareceu certo e que
os links não estão embrulhados no `google.com/url`.

## 7. Ligar o automático

**Atlas Outbound → Criar gatilhos diários**

- Lote principal: todo dia às **9h20**
- Follow-ups: todo dia às **14h40**

Horário de Brasília, minutos quebrados de propósito para não cair no mesmo
instante que todo mundo.

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

**Espaça os envios.** 8 segundos entre um e outro. Rajada de 20 e-mails no mesmo
segundo é padrão de robô.

---

## Escalonar o volume

Domínio novo em disparo frio queima rápido, e recuperar reputação leva meses.
Suba `MAX_POR_EXECUCAO` só se o bounce ficar abaixo de 3%:

| Semana | MAX_POR_EXECUCAO |
|---|---|
| 1 | 20 |
| 2 | 40 |
| 3 | 60 |
| 4+ | 100 |

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
| "Não contém {{nome}}" | Falta a variável no corpo — é a proteção funcionando |
| `thread_id` vazio | A busca não achou a thread; o follow-up daquela linha não sai. Preencha à mão ou reenvie |
| Status `ERRO` | O motivo está na coluna `observacao` |
| Nada dispara no horário | Gatilhos não criados, ou a autorização expirou. Rode o menu uma vez à mão |

## Limites do Gmail

Conta Workspace: **1.500 envios/dia**. Conta gratuita: **500/dia**.
O menu **Ver quota restante hoje** mostra quanto sobrou.
