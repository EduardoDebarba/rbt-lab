import { Filter, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { MultiSelectField, SearchableMultiSelectField, TextField } from '../components/FormFields.jsx';
import api, { getBackendMessage } from '../lib/api';
import { SITUACOES } from '../lib/constants';

const initialFilters = {
  dataInicial: '',
  dataFinal: '',
  modelo: [],
  fabricante: [],
  categoria: [],
  situacaoFinal: []
};

function LabEquipmentSummaryPage() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [modelos, setModelos] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ fabricantes: [], categorias: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
    loadModelos();
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

  async function loadFilterOptions() {
    try {
      const { data } = await api.get('/equipamentos/filtros-opcoes');
      setFilterOptions(data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    }
  }

  async function loadItems(nextFilters = filters) {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/dashboard/equipamentos-laboratorio', {
        params: compact(nextFilters)
      });
      setItems(data || []);
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
    loadItems(initialFilters);
  }

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantidade || 0), 0),
    [items]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Equipamentos do laboratório</h2>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => loadItems()} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <div className="rounded-lg border border-line bg-white p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            label="Data inicial"
            type="date"
            value={filters.dataInicial}
            onChange={(event) => updateFilter('dataInicial', event.target.value)}
          />
          <TextField
            label="Data final"
            type="date"
            value={filters.dataFinal}
            onChange={(event) => updateFilter('dataFinal', event.target.value)}
          />
          <SearchableMultiSelectField
            label="Modelo"
            value={filters.modelo}
            options={toSelectOptions(modelos)}
            placeholder="Digite o modelo"
            emptyText="Nenhum modelo encontrado."
            onChange={(values) => updateFilter('modelo', values)}
          />
          <SearchableMultiSelectField
            label="Marca"
            value={filters.fabricante}
            options={toSelectOptions(filterOptions.fabricantes || [])}
            placeholder="Digite a marca"
            emptyText="Nenhuma marca encontrada."
            allowCustom
            onChange={(values) => updateFilter('fabricante', values)}
          />
          <SearchableMultiSelectField
            label="Função"
            value={filters.categoria}
            options={toSelectOptions(filterOptions.categorias || [])}
            placeholder="Digite a função"
            emptyText="Nenhuma função encontrada."
            allowCustom
            onChange={(values) => updateFilter('categoria', values)}
          />
          <MultiSelectField
            label="Situação Final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            onChange={(values) => updateFilter('situacaoFinal', values)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={() => loadItems(filters)} disabled={loading}>
            <Filter size={16} aria-hidden="true" />
            Filtrar
          </button>
          <button className="btn btn-secondary" type="button" onClick={clearFilters} disabled={loading}>
            <X size={16} aria-hidden="true" />
            Limpar
          </button>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-3 md:grid-cols-2">
        <MetricCard label="Modelos com movimentação" value={items.length.toLocaleString('pt-BR')} />
        <MetricCard label="Total de equipamentos" value={total.toLocaleString('pt-BR')} />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-panel">
              <tr>
                <th className="px-3 py-3 text-left font-bold">Equipamento</th>
                <th className="w-44 px-3 py-3 text-right font-bold">Quantidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="2">
                    Carregando...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan="2">
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              )}

              {!loading && items.map((item) => (
                <tr key={item.modelo} className="hover:bg-panel/70">
                  <td className="px-3 py-3 font-semibold">{item.modelo}</td>
                  <td className="px-3 py-3 text-right font-bold">
                    {Number(item.quantidade || 0).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function compact(filters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])
      .filter(([, value]) => value !== '')
  );
}

function toSelectOptions(items) {
  return items.map((item) => ({
    value: item.nome,
    label: item.nome
  }));
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default LabEquipmentSummaryPage;
