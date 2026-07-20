import { labelFrom, SITUACOES, STATUS } from '../lib/constants';

const styles = {
  RESET_LIMPEZA: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  EM_TESTE: 'bg-amber-50 text-amber-800 border-amber-200',
  FINALIZADO: 'bg-slate-100 text-slate-800 border-slate-200',
  REAPROVEITADO: 'bg-teal-50 text-teal-800 border-teal-200',
  DESCARTE: 'bg-red-50 text-red-800 border-red-200',
  RMA: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  VENDA: 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

function StatusBadge({ type, value }) {
  const options = type === 'situacao' ? SITUACOES : STATUS;

  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2 text-xs font-bold ${
        styles[value] || 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {labelFrom(options, value)}
    </span>
  );
}

export default StatusBadge;
