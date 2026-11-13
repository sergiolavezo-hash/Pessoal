# -*- coding: utf-8 -*-
"""Vitrine de Engenharia de Dados: doze entregas em três frentes, cada uma com o
seu dashboard de exemplo (só formas, sem dados reais)."""
import vitrine_core
from vitrine_eng_panes import P

GRUPOS = [('Ingestão e integração', [
  ('pipeline', 'Conectores gerenciados', 'Cada fonte entra por um conector com agenda e monitoramento, em vez de um script avulso que quebra sem ninguém ver.', 'Alterne entre scripts avulsos e conectores gerenciados.'),
  ('anomalia', 'Streaming de eventos', 'Quando a decisão não pode esperar o lote da noite, o evento chega ao destino no momento em que acontece.', 'Alterne entre lote e streaming.'),
  ('arquitetura', 'Integração de sistemas legados', 'Em vez de cada sistema falar com todos os outros, uma camada de integração concentra a conversa entre o legado e a plataforma atual.', 'Alterne entre ponto a ponto e camada de integração.'),
  ('documento', 'APIs e arquivos', 'Dado que chega por API ou por arquivo vira tabela, sem retrabalho manual a cada envio.', 'Escolha a origem e ingira de novo.')]),
 ('Armazenamento', [
  ('datalake', 'Data Lake', 'Guarda o dado como ele chega, em qualquer formato, para quando alguém precisar dele.', 'Filtre por tipo de dado.'),
  ('engenharia', 'Data Warehouse', 'Dado estruturado e organizado para responder consultas analíticas com rapidez.', 'Escolha uma consulta e veja as colunas que ela usa.'),
  ('plataforma', 'Lakehouse', 'Junta a flexibilidade do lake com a organização do warehouse: uma só cópia do dado, lida por BI e por ciência de dados.', 'Alterne entre lake + warehouse e lakehouse.'),
  ('modelagem', 'Modelagem de dados', 'Do desenho da origem, pensado para o sistema que grava, ao modelo analítico, pensado para quem pergunta.', 'Alterne entre a origem e o modelo analítico.')]),
 ('Transformação e orquestração', [
  ('migracao', 'ETL e ELT', 'A diferença está na ordem: transformar antes de gravar (ETL) ou gravar primeiro e transformar no próprio destino (ELT).', 'Alterne entre ETL e ELT.'),
  ('stack', 'Transformação versionada e testada', 'A regra de negócio sai de scripts avulsos e vira código versionado, com teste em cada etapa.', 'Clique num modelo e quebre um teste.'),
  ('orquestracao', 'Orquestração de pipelines', 'Cada etapa roda na ordem certa, na hora certa, e a falha de uma não passa despercebida pelas seguintes.', 'Execute o fluxo, com e sem falha.'),
  ('qualidade', 'Testes de qualidade', 'O dado é verificado antes de chegar ao usuário: a falha fica visível primeiro para o time de dados.', 'Injete um dado ruim e veja o teste falhar.')])]
SUB = 'Doze entregas, três frentes. Escolha uma e veja como ela funciona na prática: clique, alterne e compare.'
ARIA = 'Entregas de Engenharia de Dados'


def secao():
    return vitrine_core.secao(GRUPOS, P, SUB, ARIA)


def css():
    return vitrine_core.css('eng.css')


def js():
    return vitrine_core.js('eng.js')
