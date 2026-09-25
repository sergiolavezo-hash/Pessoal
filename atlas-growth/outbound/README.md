# Outbound — Atlas Tecnologia

## Diagnóstico do e-mail de 25/09 (etapa 1)

**Mensagem:** "Dados que chegam tarde demais para decidir", enviada 25/09 12:21.
**Destinatários:** `sergio.lavezo@atlas-partner.com` e `sergioviniciusp@hotmail.com`
— ambos do próprio remetente. Foi um teste; nenhum prospect recebeu.

### O achado

Nome, cargo e empresa estão **escritos fixos no corpo**, não são variáveis de merge:

> "Emerson, na maioria das operações o dado existe (…) Pela sua atuação como
> Head of Data & Analytics no Grupo DPSP, imagino que esse tipo de atrito
> apareça de perto."

Disparar essa versão para a lista faz **todos** os contatos receberem
"Emerson… Head of Data & Analytics no Grupo DPSP". Em e-mail frio isso gera
marcação de spam e compromete a reputação do domínio.

### Correção definida

A planilha tem e-mail na coluna A e nome na coluna B. Decisão: usar **apenas
`{{nome}}`** — sem cargo, sem empresa. Dado scrapeado de cargo erra com
frequência, e errar o cargo de um decisor custa mais do que omiti-lo.

Como a frase original depende de cargo e empresa, ela precisa ser trocada por:

```
{{nome}}, na maioria das operações o dado existe — ele só não chega a
tempo, não chega inteiro, ou chega com três versões do mesmo número.

Se isso aparece de perto no seu dia, o resto deste e-mail vale dois minutos.
```

**Atenção no merge:** a coluna B costuma trazer nome completo. Configure para
usar só o primeiro nome.

## Apresentação institucional

`Atlas-Tec-Apresentacao.pdf` — 25 páginas, **1,7 MB** (original tinha 15,1 MB).
Imagens recomprimidas a 1600px / JPEG 72; todo o texto preservado.

Números conferidos contra a página 23 do original e consistentes com o e-mail:
500+ projetos entregues · 249k+ horas · 95% satisfação · 10+ setores ·
6+ anos de alocação · 20+ clientes.

### Recomendação de uso

**Não anexar no primeiro contato.** Anexo em e-mail frio reduz entregabilidade
e aumenta desconfiança. Prefira hospedar em `atlas-partner.com/apresentacao` e
linkar — assim dá para medir quem abriu, que é sinal de interesse muito mais
forte do que abertura de e-mail.

Se for anexar mesmo assim, use esta versão comprimida: 15 MB é sinal clássico
de spam e vários servidores corporativos barram acima de 10 MB.
