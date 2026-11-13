# -*- coding: utf-8 -*-
"""Vitrine de Especialistas & Squads: doze entregas em três frentes, cada uma
com o seu dashboard de exemplo (só formas, sem dados reais)."""
import vitrine_core
from vitrine_squads_panes import P

GRUPOS = [('Perfis que alocamos', [
  ('engenharia', 'Engenheiro de dados', 'Constrói e mantém a base de dados dentro do seu time: pipelines, armazenamento e qualidade.', 'Escolha uma atuação e veja onde ele entra.'),
  ('analytics', 'Analista e desenvolvedor de BI', 'Transforma o dado em indicador que o negócio usa: modelo, dashboards e governança, dentro do seu time.', 'Escolha uma atuação e veja onde ele entra.'),
  ('preditivo', 'Cientista de dados', 'Leva modelos preditivos e análises avançadas até a decisão, dentro do seu time.', 'Escolha uma atuação e veja onde ele entra.'),
  ('arquitetura', 'Arquiteto de dados', 'Desenha a base: o que guarda o quê, onde roda e como tudo se conecta, para o time construir sobre ela.', 'Escolha uma atuação e veja onde ele entra.')]),
 ('Como funciona', [
  ('contrato', 'Contratos com o prazo de cada cliente', 'O prazo da alocação é combinado caso a caso, conforme a necessidade de cada cliente e do projeto.', 'Escolha um prazo e veja a alocação se ajustar.'),
  ('permanencia', 'Alocações por tempo indeterminado', 'Quando o time precisa de continuidade, a alocação não tem data final: segue enquanto fizer sentido.', 'Alterne entre prazo fechado e tempo indeterminado.'),
  ('time', 'Sob a gestão do cliente, com respaldo técnico da Atlas', 'O especialista responde à sua gestão e trabalha como parte do seu time, com o respaldo técnico da Atlas por trás.', 'Destaque a gestão ou o respaldo.'),
  ('modernizacao', 'Substituição sem quebra de ritmo', 'Se um especialista precisar sair, a Atlas faz a substituição para o time não parar.', 'Compare as duas formas e simule uma saída.')]),
 ('Squads completos', [
  ('pessoas', 'Time montado por perfil e senioridade', 'O squad é composto pelos perfis e pelas senioridades que o projeto pede, não por um pacote fechado.', 'Ligue perfis e escolha a senioridade de cada um.'),
  ('governanca', 'Liderança técnica da Atlas', 'Um líder técnico da Atlas acompanha o squad: orienta as decisões técnicas e cuida da qualidade da entrega.', 'Alterne entre sem e com liderança técnica.'),
  ('sequencia', 'Ritmo de entrega acordado', 'Frequência e formato das entregas combinados no início, para o negócio saber quando esperar resultado.', 'Alterne entre ciclo curto e ciclo longo.'),
  ('documento', 'Transferência de conhecimento', 'O conhecimento construído no projeto passa para o seu time de forma contínua, e não fica só na cabeça de quem entregou.', 'Percorra as fases do projeto.')])]
SUB = 'Doze entregas, três frentes. Escolha uma e veja como funciona na prática: clique, alterne e monte o seu squad.'
ARIA = 'Entregas de Especialistas e Squads'


def secao():
    return vitrine_core.secao(GRUPOS, P, SUB, ARIA)


def css():
    return vitrine_core.css('squads.css')


def js():
    return vitrine_core.js('squads.js')
