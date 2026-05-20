import { Download, Edit, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { SelectField, TextField } from '../components/FormFields.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { getBackendMessage } from '../lib/api';
import { labelFrom, ORIGENS, SITUACOES, STATUS } from '../lib/constants';

const initialFilters = {
  data: '',
  numeroSerie: '',
  protocolo: '',
  cidade: '',
  equipe: '',
  modelo: '',
  status: '',
  situacaoFinal: '',
  resolvido: ''
};

const RESOLVIDO_OPTIONS = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' }
];

function EquipmentListPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [equipamentos, setEquipamentos] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [importWarnings, setImportWarnings] = useState([]);
  const [modelos, setModelos] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEquipamentos();
    loadModelos();
  }, []);

  async function loadModelos() {
    try {
      const { data } = await api.get('/modelos-equipamento', {
        params: { limit: 100 }
      });
      setModelos(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  async function loadEquipamentos(nextFilters = filters, page = 1) {
    setLoading(true);
    setError('');
    setImportWarnings([]);

    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== '')
      );
      params.page = page;
      params.limit = 20;
      const { data } = await api.get('/equipamentos', { params });
      setEquipamentos(data.items || []);
      setPagination(data.pagination || {
        page,
        limit: 20,
        total: 0,
        totalPages: 1
      });
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters(initialFilters);
    loadEquipamentos(initialFilters);
  }

  function goToPage(page) {
    const nextPage = Math.min(Math.max(1, Number(page) || 1), pagination.totalPages);
    loadEquipamentos(filters, nextPage);
  }

  function submitPage(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    goToPage(formData.get('page'));
  }

  async function exportCsv() {
    setExporting(true);
    setError('');
    setNotice('');
    setImportWarnings([]);

    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '')
      );
      const response = await api.get('/equipamentos/export.csv', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `equipamentos-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setExporting(false);
    }
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setImporting(true);
    setError('');
    setNotice('');
    setImportWarnings([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/equipamentos/import.csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      await loadEquipamentos(filters, pagination.page);
      setNotice(formatImportMessage(data));
      setImportWarnings(data.avisos || []);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setImporting(false);
    }
  }

  async function deleteEquipamento(equipamento) {
    if (!window.confirm(`Excluir o equipamento ${equipamento.modelo}?`)) return;

    setError('');
    setNotice('');
    setImportWarnings([]);

    try {
      await api.delete(`/equipamentos/${equipamento.id}`);
      setNotice('Equipamento excluído da listagem.');
      await loadEquipamentos(filters, pagination.page);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Equipamentos</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" type="button" onClick={() => loadEquipamentos()}>
            <RefreshCw size={16} aria-hidden="true" />
            Atualizar
          </button>
          <button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={exporting}>
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={16} aria-hidden="true" />
            Importar CSV
          </button>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={importCsv}
          />
          <Link className="btn btn-primary" to="/equipamentos/novo">
            <Plus size={16} aria-hidden="true" />
            Novo
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-3">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <TextField
            label="Data"
            type="date"
            value={filters.data}
            onChange={(event) => updateFilter('data', event.target.value)}
          />
          <TextField
            label="SN"
            value={filters.numeroSerie}
            onChange={(event) => updateFilter('numeroSerie', event.target.value)}
          />
          <TextField
            label="Protocolo"
            value={filters.protocolo}
            onChange={(event) => updateFilter('protocolo', event.target.value)}
          />
          <TextField
            label="Cidade"
            value={filters.cidade}
            onChange={(event) => updateFilter('cidade', event.target.value)}
          />
          <TextField
            label="Equipe"
            value={filters.equipe}
            onChange={(event) => updateFilter('equipe', event.target.value)}
          />
          <TextField
            label="Modelo"
            value={filters.modelo}
            list="equipamentos-modelos"
            onChange={(event) => updateFilter('modelo', event.target.value)}
          />
          <datalist id="equipamentos-modelos">
            {modelos.map((modelo) => (
              <option key={modelo.id} value={modelo.nome} />
            ))}
          </datalist>
          <SelectField
            label="Status"
            value={filters.status}
            options={STATUS}
            onChange={(event) => updateFilter('status', event.target.value)}
          />
          <SelectField
            label="Situação Final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            onChange={(event) => updateFilter('situacaoFinal', event.target.value)}
          />
          <SelectField
            label="Resolvido"
            value={filters.resolvido}
            options={RESOLVIDO_OPTIONS}
            onChange={(event) => updateFilter('resolvido', event.target.value)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={() => loadEquipamentos(filters, 1)}>
            <Search size={16} aria-hidden="true" />
            Filtrar
          </button>
          <button className="btn btn-secondary" type="button" onClick={clearFilters}>
            <X size={16} aria-hidden="true" />
            Limpar
          </button>
        </div>
      </div>

      <ErrorAlert message={error} />
      {notice && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">Revise os dados importados</p>
              <p className="mt-1 text-amber-800">
                A importação foi concluída, mas algumas linhas possuem campos que merecem revisão.
              </p>
            </div>
            <button
              className="btn btn-secondary h-8 px-2"
              type="button"
              onClick={() => setImportWarnings([])}
              title="Fechar aviso"
              aria-label="Fechar aviso"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-3 max-h-40 space-y-1 overflow-auto">
            {importWarnings.map((warning, index) => (
              <li key={`${warning.linha}-${warning.campo}-${index}`}>
                Linha {warning.linha} - {warning.campo}: {warning.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-panel">
              <tr>
                <th className="px-3 py-3 text-left font-bold">Data</th>
                <th className="px-3 py-3 text-left font-bold">Modelo</th>
                <th className="px-3 py-3 text-left font-bold">QTD</th>
                <th className="px-3 py-3 text-left font-bold">Origem</th>
                <th className="px-3 py-3 text-left font-bold">Situação Final</th>
                <th className="px-3 py-3 text-left font-bold">Motivo</th>
                <th className="px-3 py-3 text-right font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="7">
                    Carregando...
                  </td>
                </tr>
              )}

              {!loading && equipamentos.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="7">
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              )}

              {!loading &&
                equipamentos.map((equipamento) => (
                  <tr key={equipamento.id} className="hover:bg-panel/70">
                    <td className="px-3 py-3">{formatDate(equipamento.dataFinalizacao)}</td>
                    <td className="px-3 py-3 font-semibold">{equipamento.modelo}</td>
                    <td className="px-3 py-3">{equipamento.quantidade}</td>
                    <td className="px-3 py-3">{labelFrom(ORIGENS, equipamento.origem)}</td>
                    <td className="px-3 py-3">
                        <StatusBadge type="situacao" value={equipamento.situacaoFinal} />
                      </td>
                    <td className="px-3 py-3">{equipamento.motivo || '-'}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                      <Link
                        className="btn btn-secondary h-9 w-9 px-0"
                        to={`/equipamentos/${equipamento.id}/editar`}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Edit size={16} aria-hidden="true" />
                      </Link>
                      <button
                        className="btn btn-danger h-9 w-9 px-0"
                        type="button"
                        onClick={() => deleteEquipamento(equipamento)}
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-b-lg border-x border-b border-line bg-white px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <p className="text-slate-600">
          Mostrando {equipamentos.length} de {pagination.total} registro(s)
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => goToPage(pagination.page - 1)}
          >
            Anterior
          </button>
          <span className="min-w-24 text-center font-semibold">
            {pagination.page} / {pagination.totalPages}
          </span>
          <form className="flex items-center gap-2" onSubmit={submitPage}>
            <input
              className="field h-10 w-20"
              name="page"
              type="number"
              min="1"
              max={pagination.totalPages}
              defaultValue={pagination.page}
              key={pagination.page}
              aria-label="Página"
            />
            <button className="btn btn-secondary" type="submit" disabled={loading}>
              Ir
            </button>
          </form>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => goToPage(pagination.page + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </section>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '-';
}

function formatImportMessage(data) {
  const base = data.mensagem || 'Importação concluída.';

  if (data.ignorados > 0) {
    return `${base} ${data.ignorados} linha(s) ignorada(s).`;
  }

  return base;
}

export default EquipmentListPage;
