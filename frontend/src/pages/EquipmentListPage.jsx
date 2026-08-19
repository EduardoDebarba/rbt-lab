import { Download, Edit, Eye, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ConfirmDeleteModal from '../components/ConfirmDeleteModal.jsx';
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
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.perfil);
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
  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState(null);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState('');
  const [renameModalType, setRenameModalType] = useState(null);
  const [renameItems, setRenameItems] = useState([]);
  const [renameSearch, setRenameSearch] = useState('');
  const [renameDrafts, setRenameDrafts] = useState({});
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameSavingId, setRenameSavingId] = useState('');
  const [renameError, setRenameError] = useState('');
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

  function deleteEquipamento(equipamento) {
    setEquipamentoParaExcluir(equipamento);
    setError('');
    setNotice('');
    setImportWarnings([]);
  }

  async function confirmDeleteEquipamento() {
    if (!equipamentoParaExcluir) return;

    setError('');
    setNotice('');
    setImportWarnings([]);
    setDeletingEquipmentId(equipamentoParaExcluir.id);

    try {
      await api.delete(`/equipamentos/${equipamentoParaExcluir.id}`);
      setNotice('Equipamento excluído da listagem.');
      setEquipamentoParaExcluir(null);
      await loadEquipamentos(filters, pagination.page);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setDeletingEquipmentId('');
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

  async function openRenameModal(type) {
    setRenameModalType(type);
    setRenameSearch('');
    setRenameError('');
    await loadRenameItems(type, '');
  }

  async function loadRenameItems(type = renameModalType, query = renameSearch) {
    if (!type) return;

    setRenameLoading(true);
    setRenameError('');

    try {
      const endpoint = type === 'modelo' ? '/modelos-equipamento/valores' : '/motivos-equipamento/uso';
      const { data } = await api.get(endpoint, {
        params: {
          q: query,
          limit: 1000
        }
      });

      setRenameItems(data || []);
      setRenameDrafts((current) => ({
        ...Object.fromEntries((data || []).map((item) => [item.id, current[item.id] ?? item.nome]))
      }));
    } catch (requestError) {
      setRenameError(getBackendMessage(requestError));
    } finally {
      setRenameLoading(false);
    }
  }

  async function saveRenameItem(item) {
    const type = renameModalType;
    const nome = String(renameDrafts[item.id] || '').trim();

    if (!type || !nome || nome === item.nome) return;

    setRenameSavingId(item.id);
    setRenameError('');
    setNotice('');

    try {
      const endpoint = type === 'modelo'
        ? `/modelos-equipamento/${item.id}/renomear`
        : `/motivos-equipamento/${item.id}/renomear`;
      const { data } = await api.patch(endpoint, { nome });
      const field = type === 'modelo' ? 'modelo' : 'motivo';
      const nextFilters = {
        ...filters,
        [field]: replaceSelectedName(filters[field], data.nomeAntigo, data.nome)
      };

      setFilters(nextFilters);
      await Promise.all([
        loadModelos(),
        loadMotivos(),
        loadFilterOptions(),
        loadRenameItems(type, renameSearch),
        loadEquipamentos(nextFilters, pagination.page)
      ]);
      setNotice(`${type === 'modelo' ? 'Modelo' : 'Motivo'} renomeado em ${data.registrosAtualizados || 0} registro(s).`);
    } catch (requestError) {
      setRenameError(getBackendMessage(requestError));
    } finally {
      setRenameSavingId('');
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
          {isAdmin && (
            <>
              <button className="btn btn-secondary" type="button" onClick={() => openRenameModal('modelo')}>
                <Edit size={16} aria-hidden="true" />
                Modelos
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => openRenameModal('motivo')}>
                <Edit size={16} aria-hidden="true" />
                Motivos
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
              <button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={exporting}>
                <Download size={16} aria-hidden="true" />
                Exportar CSV
              </button>
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
            placeholder="Filtrar por SN"
            onChange={(event) => updateFilter('numeroSerie', event.target.value)}
          />
          <TextField
            label="Protocolo"
            value={filters.protocolo}
            placeholder="Filtrar por protocolo"
            onChange={(event) => updateFilter('protocolo', event.target.value)}
          />
          <SearchableMultiSelectField
            label="Cidade"
            value={filters.cidade}
            options={toSelectOptions(filterOptions.cidades || [])}
            placeholder="Filtrar por cidade"
            emptyText="Nenhuma cidade encontrada."
            allowCustom
            onChange={(values) => updateFilter('cidade', values)}
          />
          <SearchableMultiSelectField
            label="Equipe"
            value={filters.equipe}
            options={toSelectOptions(filterOptions.equipes || [])}
            placeholder="Filtrar por equipe"
            emptyText="Nenhuma equipe encontrada."
            allowCustom
            onChange={(values) => updateFilter('equipe', values)}
          />
          <MultiSelectField
            label="Origem"
            value={filters.origem}
            options={ORIGENS}
            placeholder="Filtrar por origem"
            onChange={(values) => updateFilter('origem', values)}
          />
          <SearchableMultiSelectField
            label="Modelo"
            value={filters.modelo}
            options={toSelectOptions(modelos)}
            placeholder="Filtrar por modelo"
            emptyText="Nenhum modelo encontrado."
            onChange={(values) => updateFilter('modelo', values)}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <SearchableMultiSelectField
              label="Marca"
              value={filters.fabricante}
              options={fabricanteOptions}
              placeholder="Filtrar por marca"
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
              placeholder="Filtrar por função"
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
            placeholder="Filtrar por motivo"
            emptyText="Nenhum motivo encontrado."
            onChange={(values) => updateFilter('motivo', values)}
          />
          <MultiSelectField
            label="Status"
            value={filters.status}
            options={STATUS}
            placeholder="Filtrar por status"
            onChange={(values) => updateFilter('status', values)}
          />
          <MultiSelectField
            label="Situação Final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            placeholder="Filtrar por situação final"
            onChange={(values) => updateFilter('situacaoFinal', values)}
          />
          <SelectField
            label="Resolvido"
            value={filters.resolvido}
            options={RESOLVIDO_OPTIONS}
            placeholder="Filtrar por resolvido"
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
                              disabled={deletingEquipmentId === equipamento.id}
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

      {equipamentoParaExcluir && (
        <ConfirmDeleteModal
          title="Excluir equipamento"
          message="Tem certeza que deseja excluir este equipamento da listagem?"
          itemName={equipamentoParaExcluir.modelo}
          confirmLabel="Excluir equipamento"
          loading={deletingEquipmentId === equipamentoParaExcluir.id}
          onCancel={() => setEquipamentoParaExcluir(null)}
          onConfirm={confirmDeleteEquipamento}
        />
      )}

      {renameModalType && (
        <RenameCatalogModal
          type={renameModalType}
          items={renameItems}
          search={renameSearch}
          drafts={renameDrafts}
          loading={renameLoading}
          savingId={renameSavingId}
          error={renameError}
          onSearchChange={setRenameSearch}
          onSearch={() => loadRenameItems(renameModalType, renameSearch)}
          onDraftChange={(id, value) => setRenameDrafts((current) => ({ ...current, [id]: value }))}
          onSave={saveRenameItem}
          onClose={() => {
            setRenameModalType(null);
            setRenameError('');
            setRenameItems([]);
            setRenameDrafts({});
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

function replaceSelectedName(items, oldName, newName) {
  if (!Array.isArray(items)) return [];

  return items.map((item) => (normalizeOptionText(item) === normalizeOptionText(oldName) ? newName : item));
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

function RenameCatalogModal({
  type,
  items,
  search,
  drafts,
  loading,
  savingId,
  error,
  onSearchChange,
  onSearch,
  onDraftChange,
  onSave,
  onClose
}) {
  const label = type === 'modelo' ? 'Modelo' : 'Motivo';

  function submitSearch(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="shrink-0 border-b border-line bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input
                  className="field pl-9"
                  value={search}
                  placeholder={`Buscar ${label.toLowerCase()}`}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </div>
              <button className="btn btn-secondary" type="submit" disabled={loading}>
                <Search size={16} aria-hidden="true" />
                Buscar
              </button>
            </form>
            <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="overflow-auto">
          <ErrorAlert message={error} />
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="sticky top-0 z-10 bg-panel text-left text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                <th className="px-3 py-2">Nome atual</th>
                <th className="px-3 py-2">Registros</th>
                <th className="px-3 py-2">Novo nome</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="4">Carregando...</td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="4">Nenhum item encontrado.</td>
                </tr>
              )}

              {!loading && items.map((item) => {
                const draft = drafts[item.id] ?? item.nome;
                const changed = String(draft || '').trim() && String(draft || '').trim() !== item.nome;

                return (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-semibold text-ink">{item.nome}</td>
                    <td className="px-3 py-2 text-slate-600">{Number(item.registrosUtilizados || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2">
                      <input
                        className="field min-w-72"
                        value={draft}
                        placeholder={`Novo ${label.toLowerCase()}`}
                        onChange={(event) => onDraftChange(item.id, event.target.value)}
                        disabled={savingId === item.id}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => onSave(item)}
                        disabled={!changed || savingId === item.id}
                      >
                        {savingId === item.id ? 'Salvando...' : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EquipmentDetailsModal({ equipamento, loading, error, onClose }) {
  const [showAllSerialNumbers, setShowAllSerialNumbers] = useState(false);
  const serialNumbers = parseSerialNumbers(equipamento.numeroSerie);
  const details = [
    ['Data', formatDate(equipamento.dataFinalizacao)],
    ['Modelo', equipamento.modelo],
    ['QTD', equipamento.quantidade],
    ['Origem', labelFrom(ORIGENS, equipamento.origem)],
    ['SN', formatSerialNumbersForDetails(serialNumbers, showAllSerialNumbers)],
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
  ].filter(([, value]) => hasDetailValue(value));

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
                <p className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-ink">{value || '-'}</p>
                {label === 'SN' && serialNumbers.length > 5 && (
                  <button
                    className="mt-2 text-xs font-bold text-slate-600 underline hover:text-ink"
                    type="button"
                    onClick={() => setShowAllSerialNumbers((current) => !current)}
                  >
                    {showAllSerialNumbers ? 'Ver menos' : `Ver todos (${serialNumbers.length})`}
                  </button>
                )}
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

function hasDetailValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized !== '' && normalized !== '-';
  }
  return true;
}

function parseSerialNumbers(value) {
  return String(value || '')
    .split(/[\r\n,;\t ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSerialNumbersForDetails(serialNumbers, showAll) {
  const visibleSerialNumbers = showAll ? serialNumbers : serialNumbers.slice(0, 5);
  return visibleSerialNumbers.length > 0 ? visibleSerialNumbers.join('\n') : '';
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
