export const ORIGENS = [
  { value: 'RECOLHIMENTO', label: 'Recolhimento' },
  { value: 'CAIXA_OS', label: 'Caixa de OS' }
];

export const STATUS = [
  { value: 'RESET_LIMPEZA', label: 'Reset/Limpeza' },
  { value: 'EM_TESTE', label: 'Em Teste' },
  { value: 'FINALIZADO', label: 'Finalizado' }
];

export const SITUACOES = [
  { value: 'REAPROVEITADO', label: 'Reaproveitado' },
  { value: 'DESCARTE', label: 'Descarte' },
  { value: 'RMA', label: 'RMA' }
];

export const PERFIS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TECNICO', label: 'Técnico' }
];

export function labelFrom(options, value) {
  return options.find((option) => option.value === value)?.label || value || '-';
}
