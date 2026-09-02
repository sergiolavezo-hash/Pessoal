# Kits de visuais Power BI em DAX

O produto vendido no marketplace. Cada kit é um conjunto de medidas DAX que
desenham visuais em SVG dentro de uma tabela ou matriz — **sem visual
customizado, sem importar nada**.

## Como está organizado

```
tokens/TOKENS.dax        o bloco de tema, idêntico no topo de toda medida
tokens/paletas.json      as 5 paletas (BLACK, MODERN, CLEAN, WHITE, EXECUTIVE)
temas/                   tema .json do Power BI, um por estilo (gerado)
ferramentas/validar.mjs        confere as armadilhas do HANDOFF §5
ferramentas/gerar-estilos.mjs  1 medida → 5 estilos
ferramentas/gerar-temas.mjs    paletas → temas do Power BI
kits/<nome>/fonte/       a medida escrita UMA vez, com o bloco de tokens
kits/<nome>/<ESTILO>/    gerado; não editar à mão
```

## Por que existe um gerador

A variação de estilo é uma **troca de paleta**, não um redesenho. Escrever
10 kits × 5 estilos à mão seriam centenas de edições, e uma cor esquecida
quebra o estilo **em silêncio** — o SVG não avisa, a célula só sai errada.

O gerador troca o bloco e **para** se a paleta não definir algum token. Meia
troca é o pior resultado: parece pronto e sai errado na tela.

## Por que existe um validador

As armadilhas do §5 do HANDOFF falham sem erro nenhum. A pior delas: em
modelo pt-BR, concatenar um decimal produz vírgula, o parser SVG descarta o
elemento e segue. Sem mensagem, sem log, célula vazia.

O validador rastreia as definições — sabe se a variável já passou por
`FORMAT(...,"en-US")`, por arredondamento, se é literal, ou se só combina
outras já seguras. Isso importa: a primeira versão acusou 34 erros no kit
original, **todos falsos**, e um linter ruidoso é pior que nenhum.

```bash
node ferramentas/validar.mjs kits/          # antes de qualquer entrega
node ferramentas/gerar-estilos.mjs kits/01-vendas-metas
node ferramentas/gerar-temas.mjs
```

## O que estas ferramentas NÃO fazem

Não montam o `.pbix`. Páginas, navegação, marcadores e ícones são trabalho
no Power BI Desktop — é o item mais lento da lista do HANDOFF §9 e o que
mais pesa na percepção de valor. As medidas e o tema saem daqui prontos;
a montagem é manual.
