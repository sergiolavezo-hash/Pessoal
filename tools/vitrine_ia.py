# -*- coding: utf-8 -*-
"""Vitrine de IA & Automação: seis entregas (as que o site já lista) em duas
frentes, cada uma com o seu visual de exemplo (só formas, sem dados reais)."""
import vitrine_core
from vitrine_ia_panes import P

GRUPOS = [('Prever e detectar', [
  ('preditivo', 'Modelos preditivos', 'Aprendem com o histórico da operação para estimar o que tende a acontecer — demanda, ruptura, risco, churn — enquanto ainda dá tempo de agir.', 'Escolha o que prever.'),
  ('aprendizado', 'Machine Learning', 'Modelos que aprendem com os dados da sua operação, em vez de regras escritas à mão.', 'Compare antes e depois de aprender.'),
  ('anomalia', 'Detecção de anomalias', 'Apontam o que foge do padrão no momento em que acontece, em vez de o desvio aparecer só no fechamento do mês.', 'Alterne entre o fechamento do mês e o momento em que acontece.')]),
 ('Conversar, ler e automatizar', [
  ('agente', 'GenAI e agentes', 'Uma camada de conversa sobre a sua própria base: a pergunta em linguagem natural volta como número, com o contexto de onde ele veio.', 'Escolha uma área e passe o mouse sobre a resposta.'),
  ('documento', 'Document AI', 'Leitura automática de contratos, notas e relatórios — o que estava preso em PDF passa a ser dado consultável.', 'Escolha o tipo de documento.'),
  ('automacao', 'Automação de processos', 'Tarefas repetitivas que passam a rodar sozinhas, em vez de passar de mão em mão.', 'Compare as duas formas e execute.')])]
SUB = 'IA sobre a sua própria base. Escolha uma entrega e veja como ela funciona na prática: clique, alterne e compare.'
ARIA = 'Entregas de IA e Automação'


def secao():
    return vitrine_core.secao(GRUPOS, P, SUB, ARIA, aba_id='perfis')


def css():
    return vitrine_core.css('ia.css')


def js():
    return vitrine_core.js('ia.js')
