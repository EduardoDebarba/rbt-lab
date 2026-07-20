export const ORIGENS = [
  { value: 'RECOLHIMENTO', label: 'Recolhimento' },
  { value: 'CAIXA_OS', label: 'Caixa de OS' },
  { value: 'CASA_VELHA', label: 'Casa Velha' }
];

export const STATUS = [
  { value: 'RESET_LIMPEZA', label: 'Reset/Limpeza' },
  { value: 'EM_TESTE', label: 'Em Teste' },
  { value: 'FINALIZADO', label: 'Finalizado' }
];

export const SITUACOES = [
  { value: 'REAPROVEITADO', label: 'Reaproveitado' },
  { value: 'DESCARTE', label: 'Descarte' },
  { value: 'RMA', label: 'RMA' },
  { value: 'VENDA', label: 'Venda' }
];

export const PERFIS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TECNICO', label: 'Técnico' }
];

export const CATEGORIAS_EQUIPAMENTO = [
  { value: 'ACESS POINT', label: 'Acess Point' },
  { value: 'ANTENA', label: 'Antena' },
  { value: 'ATA', label: 'ATA' },
  { value: 'CONVERSOR DE MIDIA', label: 'Conversor de Mídia' },
  { value: 'CONVERSOR DIGITAL', label: 'Conversor Digital' },
  { value: 'MODEM', label: 'Modem' },
  { value: 'ONU', label: 'ONU' },
  { value: 'PATCH PANEL', label: 'Patch Panel' },
  { value: 'ROTEADOR', label: 'Roteador' },
  { value: 'SWITCH', label: 'Switch' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'TV BOX', label: 'TV Box' }
];

export const FABRICANTES_EQUIPAMENTO = [
  { value: 'UBIQUITI', label: 'Ubiquiti' },
  { value: 'MIKROTIK', label: 'Mikrotik' },
  { value: 'INTELBRAS', label: 'Intelbras' },
  { value: 'TP-LINK', label: 'TP-Link' },
  { value: 'VISIONTEC', label: 'Visiontec' },
  { value: 'FIBERHOME', label: 'Fiberhome' },
  { value: 'MULTILASER', label: 'Multilaser' },
  { value: 'PARKS', label: 'Parks' },
  { value: 'ZTE', label: 'ZTE' },
  { value: 'CIANET', label: 'Cianet' },
  { value: 'D-LINK', label: 'D-Link' },
  { value: 'GREATEK', label: 'Greatek' },
  { value: 'LINK ONE', label: 'Link One' },
  { value: 'OIW', label: 'OIW' },
  { value: 'MERCUSYS', label: 'Mercusys' },
  { value: 'TENDA', label: 'Tenda' },
  { value: 'GRANDSTREAM', label: 'Grandstream' },
  { value: 'AQUARIO', label: 'Aquário' }
];

export function labelFrom(options, value) {
  return options.find((option) => option.value === value)?.label || value || '-';
}
