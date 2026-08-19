import { LoaderCircle, Trash2, X } from 'lucide-react';

function ConfirmDeleteModal({
  title = 'Confirmar exclusão',
  message,
  itemName,
  confirmLabel = 'Excluir',
  loading = false,
  onCancel,
  onConfirm
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <Trash2 size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">{title}</h3>
              <p className="text-sm text-slate-500">Essa ação não aparece novamente para confirmação.</p>
            </div>
          </div>
          <button
            className="btn btn-secondary h-9 w-9 px-0"
            type="button"
            onClick={onCancel}
            disabled={loading}
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-700">{message}</p>
          {itemName ? (
            <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink">
              {itemName}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-panel px-4 py-3">
          <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn-danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;
