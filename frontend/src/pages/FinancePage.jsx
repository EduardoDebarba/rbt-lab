import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { BarChart3, Edit, Filter, RefreshCw, Save, Search, Tags, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { MultiSelectField, SearchableMultiSelectField, TextField } from '../components/FormFields.jsx';
import api, { getBackendMessage } from '../lib/api';
import { CATEGORIAS_EQUIPAMENTO, FABRICANTES_EQUIPAMENTO, SITUACOES } from '../lib/constants.js';
import { useAuth } from '../lib/auth.jsx';
import { useThemeMode } from '../lib/theme.js';

ChartJS.register(
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

const initialFilters = {
  dataInicial: '',
  dataFinal: '',
  modelo: [],
  fabricante: [],
  categoria: [],
  situacaoFinal: [],
  cidade: [],
  equipe: [],
  motivo: []
};

const CHART_COLORS = ['#264653', '#2a6f73', '#52796f', '#7f8c6f', '#b08968', '#8d6e63', '#6d597a', '#355070'];
const DARK_CHART_COLORS = ['#7aa2a9', '#8bb8a8', '#a3b18a', '#c2a878', '#d6a47f', '#b99bb7', '#8fa8c8', '#c7b7a3'];

function FinancePage() {
  const { user } = useAuth();
  const { isDark } = useThemeMode();
  const isSuperAdmin = user?.perfil === 'SUPER_ADMIN';
  const canEditModelValues = ['ADMIN', 'SUPER_ADMIN'].includes(user?.perfil);
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ cidades: [], equipes: [], fabricantes: [], categorias: [] });
  const [modelSearch, setModelSearch] = useState('');
  const [modelUsageFilter, setModelUsageFilter] = useState('TODOS');
  const [valueDrafts, setValueDrafts] = useState({});
  const [savingModelId, setSavingModelId] = useState('');
  const [modelChartAliases, setModelChartAliases] = useState({});
  const [modelAliasesOpen, setModelAliasesOpen] = useState(false);
  const [modelAliasesLoading, setModelAliasesLoading] = useState(false);
  const [modelAliasesSaving, setModelAliasesSaving] = useState(false);
  const [modelAliasesError, setModelAliasesError] = useState('');
  const [cityChartAliases, setCityChartAliases] = useState({});
  const [cityAliasesOpen, setCityAliasesOpen] = useState(false);
  const [cityAliasesLoading, setCityAliasesLoading] = useState(false);
  const [cityAliasesSaving, setCityAliasesSaving] = useState(false);
  const [cityAliasesError, setCityAliasesError] = useState('');
  const [modelValuesOpen, setModelValuesOpen] = useState(false);
  const [allRowsModal, setAllRowsModal] = useState(null);
  const [financialEvolutionModal, setFinancialEvolutionModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (canEditModelValues) {
      loadModelValues();
    }

    if (isSuperAdmin) {
      loadFinance();
      loadMotivos();
      loadFilterOptions();
      loadModelChartAliases();
      loadCityChartAliases();
    }
  }, [user?.perfil]);

  async function loadFinance(nextFilters = filters) {
    if (!isSuperAdmin) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get('/dashboard/financeiro', {
        params: compact(nextFilters)
      });
      setData(response.data);
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadModelValues(q = modelSearch) {
    try {
      const { data } = await api.get('/modelos-equipamento/valores', {
        params: { q, limit: 1000 }
      });
      setModelos(data);
      setValueDrafts((current) => ({
        ...Object.fromEntries(data.map((modelo) => [modelo.id, moneyInputValue(modelo.valorReposicao)])),
        ...current
      }));
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

  async function loadModelChartAliases() {
    setModelAliasesLoading(true);
    setModelAliasesError('');

    try {
      const { data } = await api.get('/dashboard/modelos-apelidos');
      setModelChartAliases(data || {});
    } catch (requestError) {
      setModelAliasesError(getBackendMessage(requestError));
    } finally {
      setModelAliasesLoading(false);
    }
  }

  async function saveModelChartAliases(nextAliases) {
    setModelAliasesSaving(true);
    setModelAliasesError('');

    try {
      const { data } = await api.put('/dashboard/modelos-apelidos', { aliases: nextAliases });
      setModelChartAliases(data || {});
      setModelAliasesOpen(false);
    } catch (requestError) {
      setModelAliasesError(getBackendMessage(requestError));
    } finally {
      setModelAliasesSaving(false);
    }
  }

  async function loadCityChartAliases() {
    setCityAliasesLoading(true);
    setCityAliasesError('');

    try {
      const { data } = await api.get('/dashboard/cidades-apelidos');
      setCityChartAliases(data || {});
    } catch (requestError) {
      setCityAliasesError(getBackendMessage(requestError));
    } finally {
      setCityAliasesLoading(false);
    }
  }

  async function saveCityChartAliases(nextAliases) {
    setCityAliasesSaving(true);
    setCityAliasesError('');

    try {
      const { data } = await api.put('/dashboard/cidades-apelidos', { aliases: nextAliases });
      setCityChartAliases(data || {});
      setCityAliasesOpen(false);
    } catch (requestError) {
      setCityAliasesError(getBackendMessage(requestError));
    } finally {
      setCityAliasesSaving(false);
    }
  }

  async function saveModelValue(modelo) {
    setSavingModelId(modelo.id);
    setError('');

    try {
      const { data } = await api.patch(`/modelos-equipamento/${modelo.id}/valor`, {
        valorReposicao: valueDrafts[modelo.id] || null
      });
      setModelos((current) => current.map((item) => (item.id === data.id ? data : item)));
      setValueDrafts((current) => ({ ...current, [data.id]: moneyInputValue(data.valorReposicao) }));
      if (isSuperAdmin) await loadFinance();
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setSavingModelId('');
    }
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters(initialFilters);
    loadFinance(initialFilters);
  }

  function updateDraft(id, value) {
    setValueDrafts((current) => ({ ...current, [id]: value }));
  }

  const resumo = data?.resumo || {};
  const modelosSemValor = data?.modelosSemValor || [];
  const economiaRows = useMemo(() => applyModelChartAliases(data?.economiaPorModelo || [], modelChartAliases), [data, modelChartAliases]);
  const perdaRows = useMemo(() => applyModelChartAliases(data?.perdaPorModelo || [], modelChartAliases), [data, modelChartAliases]);
  const motivoRows = data?.perdaPorMotivo || [];
  const cidadeRows = useMemo(() => applyChartAliases(data?.perdaPorCidade || [], cityChartAliases), [data, cityChartAliases]);
  const economiaChart = useMemo(() => makeMoneyBarChart(economiaRows.slice(0, 5), 'Economia', isDark), [economiaRows, isDark]);
  const perdaChart = useMemo(() => makeMoneyBarChart(perdaRows.slice(0, 5), 'Perda', isDark), [perdaRows, isDark]);
  const motivoChart = useMemo(() => makeMoneyBarChart(motivoRows.slice(0, 5), 'Perda', isDark), [motivoRows, isDark]);
  const evolucaoChart = useMemo(() => makeEvolutionChart(data?.evolucaoPorMes || [], isDark), [data, isDark]);
  const cidadeChart = useMemo(() => makeMoneyBarChart(cidadeRows.slice(0, 5), 'Perda', isDark), [cidadeRows, isDark]);
  const modelOptions = toSelectOptions(modelos);
  const filteredModelValues = useMemo(() => {
    if (modelUsageFilter === 'UTILIZADOS') return modelos.filter((modelo) => modelo.utilizado);
    if (modelUsageFilter === 'NAO_UTILIZADOS') return modelos.filter((modelo) => !modelo.utilizado);
    return modelos;
  }, [modelos, modelUsageFilter]);
  const modelAliasRows = useMemo(() => mergeRows(data?.economiaPorModelo || [], data?.perdaPorModelo || []), [data]);
  const canManageModelAliases = isSuperAdmin;
  const canManageCityAliases = isSuperAdmin;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Financeiro</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" type="button" onClick={() => setModelValuesOpen(true)}>
            <Tags size={16} aria-hidden="true" />
            Valores dos modelos
          </button>
          {isSuperAdmin && (
            <button className="btn btn-secondary" type="button" onClick={() => loadFinance()} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" />
              Atualizar
            </button>
          )}
        </div>
      </div>

      {isSuperAdmin && (
      <div className="rounded-lg border border-line bg-white p-3">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
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
            options={modelOptions}
            placeholder="Filtrar por modelo"
            emptyText="Nenhum modelo encontrado."
            onChange={(values) => updateFilter('modelo', values)}
          />
          <SearchableMultiSelectField
            label="Marca"
            value={filters.fabricante}
            options={toSelectOptions(filterOptions.fabricantes || FABRICANTES_EQUIPAMENTO)}
            placeholder="Filtrar por marca"
            emptyText="Nenhuma marca encontrada."
            allowCustom
            onChange={(values) => updateFilter('fabricante', values)}
          />
          <SearchableMultiSelectField
            label="Função"
            value={filters.categoria}
            options={toSelectOptions(filterOptions.categorias || CATEGORIAS_EQUIPAMENTO)}
            placeholder="Filtrar por função"
            emptyText="Nenhuma função encontrada."
            allowCustom
            onChange={(values) => updateFilter('categoria', values)}
          />
          <MultiSelectField
            label="Situação Final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            placeholder="Filtrar por situação"
            onChange={(values) => updateFilter('situacaoFinal', values)}
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
          <SearchableMultiSelectField
            label="Motivo"
            value={filters.motivo}
            options={toSelectOptions(motivos)}
            placeholder="Filtrar por motivo"
            emptyText="Nenhum motivo encontrado."
            allowCustom
            onChange={(values) => updateFilter('motivo', values)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={() => loadFinance()} disabled={loading}>
            <Filter size={16} aria-hidden="true" />
            Aplicar filtros
          </button>
          <button className="btn btn-secondary" type="button" onClick={clearFilters} disabled={loading}>
            <X size={16} aria-hidden="true" />
            Limpar
          </button>
        </div>
      </div>
      )}

      <ErrorAlert message={error} />

      {isSuperAdmin && modelosSemValor.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Existem {modelosSemValor.length} modelo(s) processado(s) sem valor de reposição cadastrado. Preencha os valores na tabela para completar os cálculos.
        </div>
      )}

      {isSuperAdmin && (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Economia estimada"
          value={formatCurrency(resumo.economiaEstimada)}
          detail={`${formatNumber(resumo.qtdReaproveitados)} reaproveitado(s)`}
          buttonLabel="Ver evolução mensal"
          onClick={() => setFinancialEvolutionModal({
            title: 'Evolução da economia estimada',
            label: 'Economia',
            valueKey: 'economia',
            color: isDark ? '#8bb8a8' : '#2a6f73'
          })}
        />
        <MetricCard
          label="Perda estimada"
          value={formatCurrency(resumo.perdaEstimada)}
          detail={`${formatNumber(resumo.qtdDescartes)} descarte(s)`}
          buttonLabel="Ver evolução mensal"
          onClick={() => setFinancialEvolutionModal({
            title: 'Evolução da perda estimada',
            label: 'Perda',
            valueKey: 'perda',
            color: isDark ? '#d6a47f' : '#b08968'
          })}
        />
        <MetricCard
          label="Valor em RMA"
          value={formatCurrency(resumo.valorRma)}
          detail={`${formatNumber(resumo.qtdRma)} em RMA`}
          buttonLabel="Ver evolução mensal"
          onClick={() => setFinancialEvolutionModal({
            title: 'Evolução do valor em RMA',
            label: 'RMA',
            valueKey: 'rma',
            color: isDark ? '#b99bb7' : '#7a4f74'
          })}
        />
        <MetricCard
          label="Receita com vendas"
          value={formatCurrency(resumo.receitaVendas)}
          detail={`${formatNumber(resumo.qtdVendas)} vendido(s)`}
          buttonLabel="Ver evolução mensal"
          onClick={() => setFinancialEvolutionModal({
            title: 'Evolução da receita com vendas',
            label: 'Vendas',
            valueKey: 'vendas',
            color: isDark ? '#8fa8c8' : '#355070'
          })}
        />
      </div>
      )}

      {isSuperAdmin && (loading ? (
        <div className="rounded-lg border border-line bg-white p-6 text-sm text-slate-500">Carregando financeiro...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel
            title="Economia por modelo"
            action={
              <ChartActions
                rows={economiaRows}
                onShowAll={() => setAllRowsModal({ title: 'Economia por modelo', label: 'Modelo', rows: economiaRows })}
                onEditNames={canManageModelAliases ? () => setModelAliasesOpen(true) : null}
              />
            }
          >
            <Bar data={economiaChart} options={chartOptions('Valor economizado', isDark)} />
          </ChartPanel>
          <ChartPanel
            title="Perda por modelo"
            action={
              <ChartActions
                rows={perdaRows}
                onShowAll={() => setAllRowsModal({ title: 'Perda por modelo', label: 'Modelo', rows: perdaRows })}
                onEditNames={canManageModelAliases ? () => setModelAliasesOpen(true) : null}
              />
            }
          >
            <Bar data={perdaChart} options={chartOptions('Valor perdido', isDark)} />
          </ChartPanel>
          <ChartPanel
            title="Perda por motivo"
            action={
              <ChartActions
                rows={motivoRows}
                onShowAll={() => setAllRowsModal({ title: 'Perda por motivo', label: 'Motivo', rows: motivoRows })}
              />
            }
          >
            <Bar data={motivoChart} options={chartOptions('Valor perdido', isDark)} />
          </ChartPanel>
          <ChartPanel
            title="Cidades com maior perda"
            action={
              <ChartActions
                rows={cidadeRows}
                onShowAll={() => setAllRowsModal({ title: 'Cidades com maior perda', label: 'Cidade', rows: cidadeRows })}
                onEditNames={canManageCityAliases ? () => setCityAliasesOpen(true) : null}
              />
            }
          >
            <Bar data={cidadeChart} options={chartOptions('Valor perdido', isDark)} />
          </ChartPanel>
          <ChartPanel title="Evolução financeira por mês" wide>
            <Line data={evolucaoChart} options={chartOptions('Valor', isDark)} />
          </ChartPanel>
        </div>
      ))}

      {modelValuesOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
          <section className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl">
        <div className="shrink-0 border-b border-line bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="inline-flex h-10 overflow-hidden rounded-md border border-line bg-white">
              <button
                className={`px-3 text-sm font-semibold ${modelUsageFilter === 'TODOS' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-panel'}`}
                type="button"
                onClick={() => setModelUsageFilter('TODOS')}
              >
                Todos
              </button>
              <button
                className={`border-l border-line px-3 text-sm font-semibold ${modelUsageFilter === 'UTILIZADOS' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-panel'}`}
                type="button"
                onClick={() => setModelUsageFilter('UTILIZADOS')}
              >
                Utilizados
              </button>
              <button
                className={`border-l border-line px-3 text-sm font-semibold ${modelUsageFilter === 'NAO_UTILIZADOS' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-panel'}`}
                type="button"
                onClick={() => setModelUsageFilter('NAO_UTILIZADOS')}
              >
                Nunca utilizados
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <input
                className="field pl-9"
                value={modelSearch}
                placeholder="Buscar modelo"
                onChange={(event) => setModelSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') loadModelValues(event.currentTarget.value);
                }}
              />
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => loadModelValues()}>
              <Filter size={16} aria-hidden="true" />
              Buscar
            </button>
          </div>
          <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={() => setModelValuesOpen(false)} title="Fechar" aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="sticky top-0 z-10 bg-panel text-left text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm">
              <tr>
                <th className="px-3 py-2">Modelo</th>
                <th className="px-3 py-2">Uso</th>
                <th className="px-3 py-2">Marca</th>
                <th className="px-3 py-2">Valor de Reposição</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredModelValues.map((modelo) => (
                <tr key={modelo.id}>
                  <td className="px-3 py-2 font-semibold text-ink">{modelo.nome}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${modelo.utilizado ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-line bg-panel text-slate-500'}`}>
                        {modelo.utilizado ? 'Utilizado' : 'Nunca utilizado'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{inferFabricante(modelo.nome)}</td>
                  <td className="px-3 py-2">
                    <input
                      className="field max-w-40"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canEditModelValues}
                      value={valueDrafts[modelo.id] ?? ''}
                      placeholder="0,00"
                      onChange={(event) => updateDraft(modelo.id, event.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canEditModelValues && (
                      <button className="btn btn-primary" type="button" onClick={() => saveModelValue(modelo)} disabled={savingModelId === modelo.id}>
                        <Save size={16} aria-hidden="true" />
                        Salvar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </section>
        </div>
      )}

      {modelAliasesOpen && (
        <ModelChartAliasModal
          rows={modelAliasRows}
          aliases={modelChartAliases}
          loading={modelAliasesLoading}
          saving={modelAliasesSaving}
          error={modelAliasesError}
          onSave={saveModelChartAliases}
          onClose={() => setModelAliasesOpen(false)}
        />
      )}

      {cityAliasesOpen && (
        <ModelChartAliasModal
          rows={data?.perdaPorCidade || []}
          aliases={cityChartAliases}
          loading={cityAliasesLoading}
          saving={cityAliasesSaving}
          error={cityAliasesError}
          entityLabel="cidade"
          onSave={saveCityChartAliases}
          onClose={() => setCityAliasesOpen(false)}
        />
      )}

      {allRowsModal && (
        <FinancialListModal
          title={allRowsModal.title}
          label={allRowsModal.label}
          rows={allRowsModal.rows}
          onClose={() => setAllRowsModal(null)}
        />
      )}

      {financialEvolutionModal && (
        <FinancialEvolutionModal
          title={financialEvolutionModal.title}
          rows={data?.evolucaoPorMes || []}
          valueKey={financialEvolutionModal.valueKey}
          label={financialEvolutionModal.label}
          color={financialEvolutionModal.color}
          isDark={isDark}
          onClose={() => setFinancialEvolutionModal(null)}
        />
      )}
    </section>
  );
}

function MetricCard({ label, value, detail, buttonLabel, onClick }) {
  return (
    <div className="relative rounded-lg border border-line bg-white p-4 pr-12">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
      {onClick ? (
        <button
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-slate-50 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          type="button"
          onClick={onClick}
          title={buttonLabel || 'Ver evolução mensal'}
          aria-label={buttonLabel || 'Ver evolução mensal'}
        >
          <BarChart3 size={18} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function ChartPanel({ title, children, wide = false, action }) {
  return (
    <section className={`rounded-lg border border-line bg-white p-4 ${wide ? 'xl:col-span-2' : ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      <div className="mt-3 h-80">{children}</div>
    </section>
  );
}

function ChartActions({ rows, onShowAll, onEditNames }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {rows.length > 0 && (
        <button className="btn btn-secondary h-9" type="button" onClick={onShowAll}>
          Ver todos
        </button>
      )}
      {onEditNames && (
        <button
          className="btn btn-secondary h-9 w-9 px-0"
          type="button"
          onClick={onEditNames}
          title="Editar nomes no gráfico"
          aria-label="Editar nomes no gráfico"
        >
          <Edit size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ModelChartAliasModal({ rows, aliases, loading, saving, error, entityLabel = 'modelo', onSave, onClose }) {
  const [draftAliases, setDraftAliases] = useState(aliases || {});
  const isCidade = entityLabel === 'cidade';
  const emptyLabel = isCidade ? 'Nenhuma cidade encontrada no gráfico atual.' : 'Nenhum modelo encontrado no gráfico atual.';
  const helpText = isCidade ? 'Esses nomes aparecem apenas nos gráficos financeiros de cidades.' : 'Esses nomes aparecem apenas nos gráficos financeiros.';

  function updateAlias(originalName, value) {
    const next = { ...draftAliases };
    const alias = value.trimStart();

    if (alias.trim()) {
      next[originalName] = alias;
    } else {
      delete next[originalName];
    }

    setDraftAliases(next);
  }

  function clearAliases() {
    setDraftAliases({});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Editar nomes do gráfico</h3>
            <p className="text-sm text-slate-500">{helpText}</p>
          </div>
          <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <ErrorAlert message={error} />

          {loading ? (
            <div className="rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-slate-500">
              Carregando nomes do gráfico...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-slate-500">
              {emptyLabel}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="max-h-[55vh] overflow-auto">
                <table className="min-w-full divide-y divide-line text-sm">
                  <thead className="sticky top-0 z-10 bg-panel shadow-sm">
                    <tr>
                      <th className="bg-panel px-3 py-3 text-left font-bold">Nome completo</th>
                      <th className="bg-panel px-3 py-3 text-left font-bold">Nome no gráfico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row) => {
                      const originalName = row.originalLabel || row.label;

                      return (
                      <tr key={originalName}>
                        <td className="px-3 py-3 align-top font-semibold text-slate-700">{originalName}</td>
                        <td className="px-3 py-3">
                          <input
                            className="field"
                            value={draftAliases[originalName] || ''}
                            placeholder="Digite o nome curto"
                            onChange={(event) => updateAlias(originalName, event.target.value)}
                            disabled={saving}
                          />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn btn-secondary" type="button" onClick={clearAliases} disabled={saving || Object.keys(draftAliases).length === 0}>
              Limpar nomes
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSave(draftAliases)} disabled={saving}>
              {saving ? 'Salvando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialListModal({ title, label, rows, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            <p className="text-sm text-slate-500">Lista completa ordenada pelo maior valor.</p>
          </div>
          <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="max-h-[65vh] overflow-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="sticky top-0 z-10 bg-panel shadow-sm">
                  <tr>
                    <th className="bg-panel px-3 py-3 text-left font-bold">{label}</th>
                    <th className="bg-panel px-3 py-3 text-right font-bold">Quantidade</th>
                    <th className="bg-panel px-3 py-3 text-right font-bold">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.originalLabel || row.label}>
                      <td className="px-3 py-3 font-semibold text-slate-700">{row.label}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatNumber(row.quantidade || 0)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(row.valor || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialEvolutionModal({ title, rows, valueKey, label, color, isDark, onClose }) {
  const chartData = makeSingleFinanceEvolutionChart(rows, { valueKey, label, color });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            <p className="text-sm text-slate-500">Valores mensais calculados conforme os filtros aplicados no Financeiro.</p>
          </div>
          <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-slate-500">
              Nenhum dado financeiro encontrado para exibir.
            </div>
          ) : (
            <div className="h-[420px] rounded-lg border border-line bg-white p-3">
              <Line data={chartData} options={chartOptions('Valor mensal', isDark)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function makeMoneyBarChart(rows, label, isDark) {
  const palette = getChartPalette(isDark);

  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label,
        data: rows.map((item) => Number(item.valor || 0)),
        backgroundColor: rows.map((_, index) => palette[index % palette.length]),
        borderRadius: 4,
        maxBarThickness: 42
      }
    ]
  };
}

function applyModelChartAliases(rows, aliases) {
  return applyChartAliases(rows, aliases);
}

function applyChartAliases(rows, aliases) {
  return rows.map((row) => ({
    ...row,
    label: aliases[row.label]?.trim() || row.label,
    originalLabel: row.label
  }));
}

function mergeRows(...groups) {
  const map = new Map();

  groups.flat().forEach((row) => {
    if (!row?.label || map.has(row.label)) return;
    map.set(row.label, row);
  });

  return [...map.values()];
}

function makeEvolutionChart(rows, isDark) {
  return {
    labels: rows.map((item) => item.mes),
    datasets: [
      makeLineDataset('Economia', rows.map((item) => item.economia || 0), isDark ? '#8bb8a8' : '#2a6f73'),
      makeLineDataset('Perda', rows.map((item) => item.perda || 0), isDark ? '#d6a47f' : '#b08968'),
      makeLineDataset('RMA', rows.map((item) => item.rma || 0), isDark ? '#b99bb7' : '#7a4f74'),
      makeLineDataset('Vendas', rows.map((item) => item.vendas || 0), isDark ? '#8fa8c8' : '#355070'),
      makeLineDataset('Saldo', rows.map((item) => item.saldo || 0), isDark ? '#c7b7a3' : '#6d597a')
    ]
  };
}

function makeSingleFinanceEvolutionChart(rows, config) {
  return {
    labels: rows.map((item) => item.mes),
    datasets: [
      makeLineDataset(
        config.label,
        rows.map((item) => Number(item[config.valueKey] || 0)),
        config.color
      )
    ]
  };
}

function makeLineDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    tension: 0.25
  };
}

function chartOptions(label, isDark) {
  const textColor = isDark ? '#d6dee7' : '#1f2933';
  const gridColor = isDark ? '#253142' : '#e5e7eb';

  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { labels: { color: textColor }, position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? context.parsed)}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, maxRotation: 35, minRotation: 0 }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor, callback: (value) => formatCurrency(value) },
        title: { color: textColor, display: true, text: label }
      }
    }
  };
}

function getChartPalette(isDark) {
  return isDark ? DARK_CHART_COLORS : CHART_COLORS;
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
    value: item.nome || item.value || item,
    label: item.nome || item.label || item
  }));
}

function inferFabricante(modelo) {
  const normalized = normalizeSearch(modelo);
  const fabricante = FABRICANTES_EQUIPAMENTO.find((item) => normalized.includes(normalizeSearch(item.label)) || normalized.includes(normalizeSearch(item.value)));
  return fabricante?.label || '-';
}

function inferCategoria(modelo) {
  const normalized = normalizeSearch(modelo);
  const categoria = CATEGORIAS_EQUIPAMENTO.find((item) => normalized.startsWith(normalizeSearch(item.label)) || normalized.startsWith(normalizeSearch(item.value)));
  return categoria?.label || '-';
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function moneyInputValue(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export default FinancePage;
