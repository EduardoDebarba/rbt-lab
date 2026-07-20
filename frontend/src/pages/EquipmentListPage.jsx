import { Download, Edit, Eye, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { MultiSelectField, SearchableMultiSelectField, SelectField, TextField } from '../components/FormFields.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { getBackendMessage } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { labelFrom, ORIGENS, SITUACOES, STATUS } from '../lib/constants';

const initialFilters = {
  data: '',
  numeroSerie: '',
  protocolo: '',
  cidade: [],
  equipe: [],
  origem: [],
  modelo: [],
  fabricante: [],
  categoria: [],
  status: [],
  situacaoFinal: [],
  resolvido: ''
};

const RESOLVIDO_OPTIONS = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' }
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function EquipmentListPage() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'ADMIN';
  const [filters, setFilters] = useState(initialFilters);
  const [equipamentos, setEquipamentos] = useState([]);
  const [pageSize, setPageSize] = useState(20);
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
  const [motivos, setMotivos] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ cidades: [], equipes: [], fabricantes: [], categorias: [] });
  const [viewingEquipment, setViewingEquipment] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [viewingError, setViewingError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEquipamentos();
    loadModelos();
    loadMotivos();
    loadFilterOptions();
  }, []);

  async function loadModelos() {
    try {
      const { data } = await api.get('/modelos-equipamento', {
        params: { limit: 500 }
      });
      setModelos(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  async function loadMotivos() {
    try {
      const { data } = await api.get('/motivos-equipamento', {
        params: { limit: 500 }
      });
      setMotivos(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  async function loadFilterOptions() {
    try {
      const { data } = await api.get('/equipamentos/filtros-opcoes');
      setFilterOptions(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  async function loadEquipamentos(nextFilters = filters, page = 1, limit = pageSize) {
    setLoading(true);
    setError('');
    setImportWarnings([]);

    try {
      const params = compactFilters(nextFilters);
      params.page = page;
      params.limit = limit;
      const { data } = await api.get('/equipamentos', { params });
      setEquipamentos(data.items || []);
      setPagination(data.pagination || {
        page,
        limit,
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

  async function addCustomFilterOption(kind) {
    const isFabricante = kind === 'fabricante';
    const label = isFabricante ? 'marca' : 'função';
    const name = String(window.prompt(`Digite o nome da ${label}:`) || '').trim();

    if (!name) return;

    const currentOptions = isFabricante ? fabricanteOptions : categoriaOptions;
    const exists = currentOptions.some((option) => normalizeOptionText(option.label) === normalizeOptionText(name));

    if (exists) {
      setNotice(`${capitalize(label)} já existe na lista.`);
      return;
    }

    try {
      const { data } = await api.post('/equipamentos/filtros-opcoes', {
        tipo: isFabricante ? 'FABRICANTE' : 'CATEGORIA',
        nome: name
      });
      const field = isFabricante ? 'fabricante' : 'categoria';

      setFilterOptions((current) => ({
        ...current,
        fabricantes: isFabricante ? mergeNames(current.fabricantes || [], data.nome) : current.fabricantes,
        categorias: isFabricante ? current.categorias : mergeNames(current.categorias || [], data.nome)
      }));
      updateFilter(field, [...filters[field], data.nome]);
      setNotice(`${capitalize(label)} adicionada aos filtros.`);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  function clearFilters() {
    setFilters(initialFilters);
    loadEquipamentos(initialFilters);
  }

  function goToPage(page) {
    const nextPage = Math.min(Math.max(1, Number(page) || 1), pagination.totalPages);
    loadEquipamentos(filters, nextPage);
  }

  function changePageSize(value) {
    const nextPageSize = Number(value);
    setPageSize(nextPageSize);
    loadEquipamentos(filters, 1, nextPageSize);
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
      const params = compactFilters(filters);
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

  async function viewEquipamento(equipamento) {
    setViewingEquipment(equipamento);
    setViewingLoading(true);
    setViewingError('');

    try {
      const { data } = await api.get(`/equipamentos/${equipamento.id}`);
      setViewingEquipment(data);
    } catch (requestError) {
      setViewingError(getBackendMessage(requestError));
    } finally {
      setViewingLoading(false);
    }
  }

  const fabricanteOptions = toSelectOptions(filterOptions.fabricantes || []);
  const categoriaOptions = toSelectOptions(filterOptions.categorias || []);

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
          {isAdmin && (
            <>
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
            </>
          )}
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
          <SearchableMultiSelectField
            label="Cidade"
            value={filters.cidade}
            options={toSelectOptions(filterOptions.cidades || [])}
            placeholder="Digite a cidade"
            emptyText="Nenhuma cidade encontrada."
            allowCustom
            onChange={(values) => updateFilter('cidade', values)}
          />
          <SearchableMultiSelectField
            label="Equipe"
            value={filters.equipe}
            options={toSelectOptions(filterOptions.equipes || [])}
            placeholder="Digite a equipe"
            emptyText="Nenhuma equipe encontrada."
            allowCustom
            onChange={(values) => updateFilter('equipe', values)}
          />
          <MultiSelectField
            label="Origem"
            value={filters.origem}
            options={ORIGENS}
            onChange={(values) => updateFilter('origem', values)}
          />
          <SearchableMultiSelectField
            label="Modelo"
            value={filters.modelo}
            options={toSelectOptions(modelos)}
            placeholder="Digite o modelo"
            emptyText="Nenhum modelo encontrado."
            onChange={(values) => updateFilter('modelo', values)}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <SearchableMultiSelectField
              label="Marca"
              value={filters.fabricante}
              options={fabricanteOptions}
              placeholder="Digite a marca"
              emptyText="Nenhuma marca encontrada."
              allowCustom
              onChange={(values) => updateFilter('fabricante', values)}
            />
            <button
              className="btn btn-secondary h-10 w-10 px-0"
              type="button"
              onClick={() => addCustomFilterOption('fabricante')}
              title="Adicionar marca"
              aria-label="Adicionar marca"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <SearchableMultiSelectField
              label="Função"
              value={filters.categoria}
              options={categoriaOptions}
              placeholder="Digite a função"
              emptyText="Nenhuma função encontrada."
              allowCustom
              onChange={(values) => updateFilter('categoria', values)}
            />
            <button
              className="btn btn-secondary h-10 w-10 px-0"
              type="button"
              onClick={() => addCustomFilterOption('categoria')}
              title="Adicionar função"
              aria-label="Adicionar função"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
          <SearchableMultiSelectField
            label="Motivo"
            value={filters.motivo}
            options={toSelectOptions(motivos)}
            placeholder="Digite o motivo"
            emptyText="Nenhum motivo encontrado."
            onChange={(values) => updateFilter('motivo', values)}
          />
          <MultiSelectField
            label="Status"
            value={filters.status}
            options={STATUS}
            onChange={(values) => updateFilter('status', values)}
          />
          <MultiSelectField
            label="Situação Final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            onChange={(values) => updateFilter('situacaoFinal', values)}
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
                        <button
                          className="btn btn-secondary h-9 w-9 px-0"
                          type="button"
                          onClick={() => viewEquipamento(equipamento)}
                          title="Visualizar"
                          aria-label="Visualizar"
                        >
                          <Eye size={16} aria-hidden="true" />
                        </button>
                        {isAdmin && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-b-lg border-x border-b border-line bg-white px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 text-slate-600 sm:flex-row sm:items-center">
          <p>
            Mostrando {equipamentos.length} de {pagination.total} registro(s)
          </p>
          <label className="flex items-center gap-2 font-semibold text-slate-600">
            Ver
            <select
              className="field h-10 w-24"
              value={pageSize}
              onChange={(event) => changePageSize(event.target.value)}
              disabled={loading}
              aria-label="Registros por página"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            por página
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
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

      {viewingEquipment && (
        <EquipmentDetailsModal
          equipamento={viewingEquipment}
          loading={viewingLoading}
          error={viewingError}
          onClose={() => {
            setViewingEquipment(null);
            setViewingError('');
          }}
        />
      )}
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


function compactFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
      .filter(([, value]) => value !== '')
  );
}

function toSelectOptions(items) {
  return items.map((item) => ({
    value: typeof item === 'string' ? item : item.nome,
    label: typeof item === 'string' ? item : item.nome
  }));
}

function mergeNames(items, name) {
  const seen = new Set();

  return [...items, name]
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeOptionText(item);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

function normalizeOptionText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
}

function EquipmentDetailsModal({ equipamento, loading, error, onClose }) {
  const details = [
    ['Data', formatDate(equipamento.dataFinalizacao)],
    ['Modelo', equipamento.modelo],
    ['QTD', equipamento.quantidade],
    ['Origem', labelFrom(ORIGENS, equipamento.origem)],
    ['SN', equipamento.numeroSerie],
    ['Equipe', equipamento.equipe],
    ['Protocolo', equipamento.protocolo],
    ['Cidade', equipamento.cidade],
    ['Status', labelFrom(STATUS, equipamento.status)],
    ['Situação Final', labelFrom(SITUACOES, equipamento.situacaoFinal)],
    ['Motivo', equipamento.motivo],
    ...(equipamento.situacaoFinal === 'VENDA' ? [
      ['Valor vendido', formatCurrency(equipamento.valorVenda)],
      ['Comprador', equipamento.compradorVenda],
      ['CPF/CNPJ comprador', formatCpfCnpj(equipamento.documentoCompradorVenda)],
      ['Venda confirmada', formatBoolean(equipamento.vendaConfirmada)]
    ] : []),
    ['Resolvido', formatBoolean(equipamento.resolvido)],
    ['Responsável', equipamento.responsavel?.nome],
    ['Observações', equipamento.observacoes]
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Detalhes do equipamento</h3>
            <p className="text-sm text-slate-500">{equipamento.modelo || '-'}</p>
          </div>
          <button
            className="btn btn-secondary h-9 w-9 px-0"
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-64px)] overflow-auto p-4">
          {loading && (
            <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-slate-600">
              Carregando informações completas...
            </div>
          )}

          <ErrorAlert message={error} />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-md border border-line bg-panel px-3 py-2">
                <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-ink">{value || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBoolean(value) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '-';
}

function formatCurrency(value) {
  const number = Number(value || 0);
  if (!number) return '-';
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatCpfCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return value || '-';
}

export default EquipmentListPage;
