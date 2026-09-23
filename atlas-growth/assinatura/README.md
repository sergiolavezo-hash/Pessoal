# Assinatura de e-mail — Atlas Tecnologia

Atualizada para a identidade atual do site: azul `#1B62F0`, marca ATLAS TECNOLOGIA.
A versão anterior usava verde-água e "ATLAS.TEC" — não batia mais com o site.

## Arquivos

| Arquivo | Uso |
|---|---|
| `assinatura-clara.png` | Versão principal. Fundo branco, funciona em qualquer cliente |
| `assinatura-escura.png` | Alternativa. Só use se o time todo usar tema escuro |
| `assinatura.html` | **Recomendada.** Texto real, links clicáveis, sem imagem gigante |
| `logo-assinatura.png` | Só o logo, para a versão HTML |
| `logo-assinatura-dark.png` | Idem, para fundo escuro |

## Qual usar

**Prefira a HTML.** Numa assinatura em imagem, o telefone e o e-mail não são
clicáveis, não podem ser copiados, não aparecem em busca e somem quando o cliente
bloqueia imagens — que é o padrão de muitos servidores corporativos. A HTML resolve
os quatro problemas e pesa uma fração.

A PNG serve para onde não dá para colar HTML (alguns apps de celular, assinatura
em PDF, rodapé de apresentação).

## Como instalar a versão HTML

**Antes de tudo:** hospede `logo-assinatura.png` numa URL pública e troque o
endereço no `<img>` do arquivo. Sugestão: `atlas-partner.com/assets/logo-assinatura.png`.
E-mail não exibe imagem de arquivo local.

**Gmail:** abra `assinatura.html` no navegador → selecione tudo (Ctrl+A) → copie →
Configurações → Assinatura → cole.

**Outlook (desktop):** mesma coisa. Arquivo → Opções → E-mail → Assinaturas → cole.

**Outlook Web:** Configurações → E-mail → Compor e responder → cole.

## Como instalar a versão PNG

Exibir a **797 px de largura**. O arquivo está em 2x (1594 px) para ficar nítido em
tela retina — não use no tamanho original, fica gigante.

Gmail: Configurações → Assinatura → ícone de imagem → envie o PNG → redimensione.

## Dados

Sérgio Lavezo · Founder & CEO
11 95498-1494 · sergio.lavezo@atlas-partner.com
atlas-partner.com · @atlas_tecnologia

O link do site já vai com UTM (`utm_source=email&utm_medium=assinatura`), então
dá para medir quanto tráfego a assinatura gera.

## Observação sobre o logo

O triângulo foi desenhado a partir do que aparece no site. Para precisão de pixel,
substitua pelo SVG oficial da marca — o layout aceita sem ajuste.
