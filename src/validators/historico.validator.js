const { pickDefined, requireFields, result } = require('./base.validator');

function createHistoricoValidator(body) {
  const data = pickDefined({
    equipamentoId: body.equipamentoId,
    usuarioId: body.usuarioId,
    acao: body.acao,
    entidade: body.entidade,
    campo: body.campo,
    valorAntigo: body.valorAntigo,
    valorNovo: body.valorNovo,
    dadosAnteriores: body.dadosAnteriores,
    dadosNovos: body.dadosNovos,
    observacao: body.observacao
  });

  const errors = requireFields(data, ['usuarioId', 'acao', 'entidade', 'campo']);
  return result(data, errors);
}

module.exports = { createHistoricoValidator };
