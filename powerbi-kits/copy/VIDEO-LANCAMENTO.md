# Prompt — vídeo de lançamento com avatar

Para HeyGen, Synthesia, D-ID ou similar. O roteiro é a parte que importa;
a descrição de cena serve para as ferramentas que aceitam direção visual.

**Regra que atravessa tudo:** o avatar só afirma o que o produto entrega
hoje. O HANDOFF §10 é explícito sobre o que NÃO foi verificado — nenhuma
medida foi vista renderizada dentro do Power BI Desktop, o visual HTML
Content nunca foi instalado, e não houve teste em Service nem mobile.
Prometer isso no lançamento é comprar reembolso.

---

## PROMPT

```
Crie um vídeo de lançamento de produto, 85 segundos, formato 16:9,
com avatar falando em PORTUGUÊS DO BRASIL, sotaque neutro.

AVATAR
Homem ou mulher, 30-45 anos, aparência de analista sênior brasileiro —
camisa ou blusa lisa, sem terno, sem jaleco de "coach". Postura calma,
mãos visíveis e usadas com moderação. Nada de sorriso permanente nem
gesticulação de vendedor: o público é analista de dados e desconfia de
entusiasmo.

CENÁRIO
Escritório neutro, profundidade rasa, fundo escuro grafite (#111726).
Iluminação suave lateral. Avatar enquadrado à esquerda, dois terços do
quadro livres à direita para o screencast entrar.

TOM
Técnico e direto. Frases curtas. Zero hype, zero superlativo, zero
"revolucionário". Quem fala é alguém que já apanhou do Power BI.

RITMO
Pausa de 0,4s a cada troca de bloco. Sem música nos primeiros 8 segundos —
a fala precisa entrar limpa.

---------------------------------------------------------------------
ROTEIRO COM MARCAÇÃO
---------------------------------------------------------------------

[0:00-0:10] PROBLEMA — avatar em close, sem screencast
Fala:
"Você precisa de um gráfico de progresso no Power BI. Vai no AppSource,
acha o visual customizado, e o TI da empresa bloqueia. Ou libera, e ele
para de funcionar na próxima atualização."
Texto na tela: "Visual customizado = dependência"

[0:10-0:22] VIRADA — screencast começa a entrar pela direita
Fala:
"Existe outro caminho. O Power BI desenha imagem a partir de texto. Se a
medida devolve um SVG, o visual nasce dentro do próprio modelo. Sem
instalar nada, sem pedir permissão pra ninguém."
Screencast: uma célula de matriz vazia; cola-se a medida; a barra de
progresso aparece.

[0:22-0:32] O QUE É
Fala:
"Esse é o Kit de Visuais em DAX. Vinte e seis medidas prontas: barra de
progresso, sparkline, velocímetro, bullet chart, waffle, donut, KPI card,
seta de variação, rating, lollipop e heatmap de célula."
Screencast: grade mostrando os visuais lado a lado, 1 segundo cada.

[0:32-0:52] COMO USAR — a parte mais importante do vídeo
Fala:
"São três passos. Um: cola as oito medidas base — Vendas, Meta,
Pedidos, Ticket Médio. Dois: cola o visual que você quer. Três, e é aqui
que quase todo mundo erra: seleciona a medida, Ferramentas de medida,
Categoria de dados, URL da Imagem."
Screencast: a sequência real dos três passos, sem corte.
Texto na tela no passo 3: "Categoria de dados → URL da Imagem"
Fala (fechando o bloco):
"Sem esse terceiro passo o Power BI mostra o texto do SVG em vez do
desenho. É o erro número um de quem começa."

[0:52-1:05] RESULTADO
Fala:
"O resultado é um relatório que não parece template. Cinco paletas
prontas — BLACK, MODERN, CLEAN, WHITE e EXECUTIVE — e o arquivo de tema
do Power BI sai junto, na mesma cor das medidas."
Screencast: o MESMO dashboard trocando de paleta, 1,2s por estilo.

[1:05-1:18] PROVA
Fala:
"Vem com um modelo de demonstração que se monta sozinho: quatro tabelas
calculadas em DAX, seis mil linhas, dois anos de histórico. Sem CSV, sem
banco, sem conexão. Você cola e já tem dados pra testar."
Texto na tela: "6.000 linhas · 730 datas · zero fonte externa"

[1:18-1:25] FECHAMENTO
Fala:
"Kit de Visuais em DAX, dentro do Atlas Insight AI. O link está aqui
embaixo."
Texto na tela: logo Atlas + endereço

---------------------------------------------------------------------
O QUE O AVATAR NÃO PODE DIZER
---------------------------------------------------------------------
Não afirmar que foi testado no Power BI Service nem no aplicativo mobile.
Não mostrar nem citar os três visuais em HTML, que dependem de um visual
externo ainda não validado.
Não usar o número de variação contra ano anterior: no primeiro ano da base
não existe ano anterior e o total fica inflado.
Não prometer suporte, atualização vitalícia nem garantia que ainda não
esteja definida por escrito.
Não usar a palavra "fácil". Usar "direto", "sem instalar", "três passos".

---------------------------------------------------------------------
ENTREGA
---------------------------------------------------------------------
1920x1080, 30fps, legenda queimada em português (o público assiste sem
som). Versão 9:16 de 30 segundos usando só os blocos de 0:00-0:10 e
0:32-0:52 — a armadilha da Categoria de dados é o trecho de maior
retenção, porque é utilidade pura.
```

---

## Por que o roteiro está nessa ordem

O bloco de **como usar** vem antes do de **resultado**, ao contrário do
comum. O público é analista: ele compra quando entende o mecanismo, não
quando vê o antes-e-depois. Mostrar o passo 3 — e dizer que é onde todo
mundo erra — entrega utilidade antes de pedir dinheiro, e é o trecho que
sobrevive ao corte de 30 segundos.

Os números de §2 e §3 do HANDOFF são saída real do modelo. Podem ir para a
tela sem ressalva — menos a variação contra ano anterior.
