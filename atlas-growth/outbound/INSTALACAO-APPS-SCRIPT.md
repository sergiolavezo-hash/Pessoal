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

### Sobre os links: o Gmail reescreve, o script desfaz

O Gmail reembrulha **todo** link de mensagem armazenada em
`https://www.google.com/url?q=...`. Não adianta limpar no rascunho: ele reescreve
de novo na próxima vez que salvar.

Num disparo em massa isso importa — redirecionador de terceiro é padrão de
phishing para os filtros e derruba entregabilidade.

Por isso a limpeza acontece **no envio**, pela função `limparUrls_()`. O link sai
assim para o destinatário:

```
https://atlas-partner.com/?utm_source=email&utm_medium=outbound&utm_campaign=prospeccao#contato
```

Você não precisa fazer nada. Só não se assuste ao ver `google.com/url` dentro do
rascunho — é esperado.

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
| Link sai com `google.com/url` | A limpeza falhou. Rode "Conferir links" e me avise |
| "Não contém {{nome}}" | Falta a variável no corpo — é a proteção funcionando |
| `thread_id` vazio | A busca não achou a thread; o follow-up daquela linha não sai. Preencha à mão ou reenvie |
| Status `ERRO` | O motivo está na coluna `observacao` |
| Nada dispara no horário | Gatilhos não criados, ou a autorização expirou. Rode o menu uma vez à mão |

## Limites do Gmail

Conta Workspace: **1.500 envios/dia**. Conta gratuita: **500/dia**.
O menu **Ver quota restante hoje** mostra quanto sobrou.
