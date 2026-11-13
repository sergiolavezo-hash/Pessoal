# -*- coding: utf-8 -*-
"""Vitrine de Analytics & BI: doze entregas em três frentes, cada uma com o seu
dashboard de exemplo (só formas, sem dados reais). A estrutura e o JS comum
ficam em vitrine_core.py; o JS de cada painel, em tools/vitrine/bi.js."""
import vitrine_core
from vitrine_bi_panes import P as _P

GRUPOS=[('Camada semântica',[
  ('modelagem','Modelagem dimensional','Organizamos o dado em fatos (o que aconteceu) e dimensões (como você quer cortar), no desenho que o BI lê melhor. Os dados de várias fontes passam pelo modelo antes de virarem indicador.','Passe o mouse numa fonte ou num indicador para ver o caminho do dado.'),
  ('qualidade','Definição única por métrica','Cada indicador tem uma única conta, escrita uma vez no modelo. Todos os painéis leem a mesma definição, e a reunião deixa de discutir qual número está certo.','Alterne entre "por conta própria" e "definição única".'),
  ('modernizacao','Regra de negócio versionada','A regra de cada métrica vive no modelo, com histórico. Dá para saber o que mudou e quando, e voltar atrás sem refazer painéis.','Clique numa versão para ver a regra e o resultado.'),
  ('semantica','Catálogo de indicadores','Um lugar para consultar o que cada indicador significa, de onde ele vem e quem responde por ele.','Filtre por área e selecione um indicador.')]),
 ('Dashboards que se usam',[
  ('analytics','Visão executiva e operacional','O mesmo modelo alimenta a leitura de quem decide e o acompanhamento de quem opera, cada um com a visão que precisa.','Alterne a visão e filtre por área.'),
  ('autoatendimento','Self-service para as áreas','As áreas montam a própria pergunta sobre o modelo governado, sem abrir chamado para o time de dados.','Escolha a medida, o corte e o tipo de gráfico.'),
  ('design','Padrão visual definido antes do desenvolvimento','Grade, paleta e tipografia definidas antes do primeiro painel, para todo dashboard nascer com a cara do mesmo produto.','Ligue as guias e troque a paleta.'),
  ('anomalia','Performance e otimização de DAX','Medidas DAX bem escritas e modelo enxuto: o painel responde na hora em que a pessoa filtra, mesmo com o volume crescendo.','Compare o carregamento e rode de novo.')]),
 ('Governança de BI',[
  ('arquitetura','Padrão de nomenclatura e layout','Nomes e posições padronizados: quem abre qualquer painel sabe onde está cada coisa, e painel novo nasce dentro do padrão.','Alterne entre antes e depois.'),
  ('governanca','Controle de acesso por perfil','Cada perfil enxerga só o que precisa, definido por regra e não por exceção.','Clique na matriz para dar ou retirar acesso.'),
  ('migracao','Migração e consolidação de painéis','Painéis dispersos são migrados e consolidados num conjunto padronizado, sobre o mesmo modelo.','Alterne para ver a consolidação.'),
  ('documento','Documentação do modelo','Tabelas, campos e regras descritos para que o time novo entenda o modelo sem depender de quem o criou.','Navegue pelas tabelas do modelo.')])]

SUB = 'Doze entregas, três frentes. Escolha uma e veja como ela aparece num dashboard de verdade: clique, filtre e compare.'
ARIA = 'Entregas de Analytics e BI'


def secao():
    P = dict(_P)
    P[3] = P[3].replace('<div class="cat">', '<div class="cat cv" data-fios=""><svg class="wires" aria-hidden="true"></svg>', 1).replace('  <div class="cv"><svg class="wires" aria-hidden="true"></svg>\n', '  <div>\n', 1)
    P[11] = P[11].replace('<div class="dc" data-fios="t0>d;t1>d;t2>d;t3>d">\n  <div class="cv" style="display:contents"></div>', '<div class="dc cv" data-fios="t0>d;t1>d;t2>d;t3>d"><svg class="wires" aria-hidden="true"></svg>', 1)
    return vitrine_core.secao(GRUPOS, P, SUB, ARIA)


def css():
    return vitrine_core.css('bi.css')


def js():
    return vitrine_core.js('bi.js')
