import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  ArcElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Cable, Download, Edit, ExternalLink, FileText, Filter, Plus, RefreshCw, Trash2, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { MultiSelectField, SearchableMultiSelectField, SelectField, TextField } from '../components/FormFields.jsx';
import api, { getBackendMessage } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { ORIGENS, SITUACOES, STATUS } from '../lib/constants';
import { useThemeMode } from '../lib/theme.js';

ChartJS.register(
  ArcElement,
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
  cidade: [],
  equipe: [],
  origem: [],
  responsavel: [],
  modelo: [],
  fabricante: [],
  categoria: [],
  motivo: [],
  evolucaoAno: '',
  resolvido: '',
  status: [],
  situacaoFinal: []
};

const RESOLVIDO_OPTIONS = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' }
];

const DEFAULT_CABLE_SIZES = [2, 3, 4, 5, 6, 8, 9, 10];
const CABLE_STORAGE_KEY = 'rbt_lab_cabos_rede';
const TEAM_CITY_TYPES = [
  { value: 'EQUIPE', label: 'Equipe' },
  { value: 'SUPORTE', label: 'Suporte' }
];
const BAR_CHART_COLORS = ['#1f4e79', '#2f6f73', '#6b5b95', '#8a6d3b', '#9b4d4d', '#5f6f52'];
const CITY_TEAM_CHART_COLORS = ['#1f4e79', '#2f6f73', '#6b5b95', '#8a6d3b', '#9b4d4d', '#5f6f52'];
const initialTeamCityForm = {
  tipo: 'EQUIPE',
  equipe: '',
  cidade: '',
  supervisor: ''
};

function normalizeFilterText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeChartKey(value) {
  return normalizeFilterText(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function DashboardPage() {
  const { isDark } = useThemeMode();
  const { user } = useAuth();
  const canEditCables = Boolean(user);
  const canManageTeamCities = user?.perfil === 'ADMIN';
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modelos, setModelos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ cidades: [], equipes: [], responsaveis: [], fabricantes: [], categorias: [] });
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportCsvLoading, setReportCsvLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [cablesOpen, setCablesOpen] = useState(false);
  const [networkCables, setNetworkCables] = useState([]);
  const [cablesLoading, setCablesLoading] = useState(false);
  const [cablesError, setCablesError] = useState('');
  const [teamCitiesOpen, setTeamCitiesOpen] = useState(false);
  const [teamCities, setTeamCities] = useState([]);
  const [teamCitiesLoading, setTeamCitiesLoading] = useState(false);
  const [teamCitiesSaving, setTeamCitiesSaving] = useState(false);
  const [teamCitiesError, setTeamCitiesError] = useState('');
  const [teamCityForm, setTeamCityForm] = useState(initialTeamCityForm);
  const [teamCityMode, setTeamCityMode] = useState('create');
  const [selectedTeamCity, setSelectedTeamCity] = useState(null);

  useEffect(() => {
    loadDashboard();
    loadModelos();
    loadMotivos();
    loadFilterOptions();
    loadNetworkCables();
    loadTeamCities();
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

  async function loadDashboard(nextFilters = filters) {
    setLoading(true);
    setError('');

    try {
      const params = compact(nextFilters);
      const response = await api.get('/dashboard', { params });
      setData(response.data);
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
    loadDashboard(initialFilters);
  }

  function changeEvolutionYear(value) {
    const nextFilters = { ...filters, evolucaoAno: value };
    setFilters(nextFilters);
    loadDashboard(nextFilters);
  }

  async function downloadReportCsv() {
    setReportCsvLoading(true);
    setReportError('');

    try {
      const response = await api.get('/dashboard/relatorio-diario/export.csv', {
        params: {
          dataInicial: reportStartDate,
          dataFinal: reportEndDate
        },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-equipamentos-${reportStartDate}-a-${reportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setReportError(getBackendMessage(requestError));
    } finally {
      setReportCsvLoading(false);
    }
  }

  async function loadNetworkCables() {
    setCablesLoading(true);
    setCablesError('');

    try {
      const { data } = await api.get('/cabos-rede');
      const cables = canEditCables ? await migrateLocalCablesToDatabase(data) : data;
      setNetworkCables(cables);
    } catch (requestError) {
      setCablesError(getBackendMessage(requestError));
    } finally {
      setCablesLoading(false);
    }
  }

  async function updateCableQuantity(cable, quantidade) {
    if (!canEditCables) return;

    const nextQuantidade = Math.max(0, Number(quantidade) || 0);
    setCablesError('');
    setNetworkCables((current) => current.map((item) => (
      item.id === cable.id ? { ...item, quantidade: nextQuantidade } : item
    )));

    try {
      const { data } = await api.patch(`/cabos-rede/${cable.id}`, { quantidade: nextQuantidade });
      setNetworkCables((current) => current.map((item) => (item.id === data.id ? data : item)));
    } catch (requestError) {
      setCablesError(getBackendMessage(requestError));
      await loadNetworkCables();
    }
  }

  async function addCableSize(metragem) {
    if (!canEditCables) return false;

    setCablesError('');

    try {
      const { data } = await api.post('/cabos-rede', { metragem, quantidade: 0 });
      setNetworkCables((current) => [...current, data].sort((a, b) => Number(a.metragem) - Number(b.metragem)));
      return true;
    } catch (requestError) {
      setCablesError(getBackendMessage(requestError));
      return false;
    }
  }

  async function removeCableSize(cable) {
    if (!canEditCables) return;

    setCablesError('');

    try {
      await api.delete(`/cabos-rede/${cable.id}`);
      setNetworkCables((current) => current.filter((item) => item.id !== cable.id));
    } catch (requestError) {
      setCablesError(getBackendMessage(requestError));
    }
  }

  async function loadTeamCities() {
    setTeamCitiesLoading(true);
    setTeamCitiesError('');

    try {
      const { data } = await api.get('/equipes-cidades');
      setTeamCities(data);
    } catch (requestError) {
      setTeamCitiesError(getBackendMessage(requestError));
    } finally {
      setTeamCitiesLoading(false);
    }
  }

  function openCreateTeamCity() {
    setSelectedTeamCity(null);
    setTeamCityMode('create');
    setTeamCityForm(initialTeamCityForm);
    setTeamCitiesError('');
  }

  function editTeamCity(row) {
    setSelectedTeamCity(row);
    setTeamCityMode('edit');
    setTeamCityForm(toTeamCityForm(row));
    setTeamCitiesError('');
  }

  function updateTeamCityField(field, value) {
    setTeamCityForm((current) => ({ ...current, [field]: value }));
  }

  async function saveTeamCity(event) {
    event.preventDefault();
    if (!canManageTeamCities || teamCityMode === 'view') return;

    setTeamCitiesSaving(true);
    setTeamCitiesError('');

    try {
      const payload = {
        tipo: teamCityForm.tipo,
        equipe: teamCityForm.equipe,
        cidade: teamCityForm.cidade,
        supervisor: teamCityForm.supervisor
      };

      if (teamCityMode === 'edit' && selectedTeamCity) {
        const { data } = await api.patch(`/equipes-cidades/${selectedTeamCity.id}`, payload);
        setTeamCities((current) => current.map((item) => (item.id === data.id ? data : item)));
        editTeamCity(data);
      } else {
        const { data } = await api.post('/equipes-cidades', payload);
        setTeamCities((current) => [...current, data].sort(sortTeamCities));
        setTeamCityForm(initialTeamCityForm);
      }
    } catch (requestError) {
      setTeamCitiesError(getBackendMessage(requestError));
    } finally {
      setTeamCitiesSaving(false);
    }
  }

  async function deleteTeamCity(row) {
    if (!canManageTeamCities) return;
    if (!window.confirm(`Excluir a equipe ${row.equipe} de ${row.cidade}?`)) return;

    setTeamCitiesError('');

    try {
      await api.delete(`/equipes-cidades/${row.id}`);
      setTeamCities((current) => current.filter((item) => item.id !== row.id));

      if (selectedTeamCity?.id === row.id) {
        openCreateTeamCity();
      }
    } catch (requestError) {
      setTeamCitiesError(getBackendMessage(requestError));
    }
  }

  async function migrateLocalCablesToDatabase(cables) {
    const raw = localStorage.getItem(CABLE_STORAGE_KEY);
    if (!raw) return cables;

    let stored = [];

    try {
      stored = JSON.parse(raw);
    } catch {
      localStorage.removeItem(CABLE_STORAGE_KEY);
      return cables;
    }

    if (!Array.isArray(stored) || stored.length === 0) {
      localStorage.removeItem(CABLE_STORAGE_KEY);
      return cables;
    }

    let nextCables = [...cables];

    for (const item of stored) {
      const metragem = Number(item.metragem);
      const quantidade = Math.max(0, Number(item.quantidade) || 0);

      if (!Number.isFinite(metragem) || metragem <= 0) continue;

      const existing = nextCables.find((cable) => Number(cable.metragem) === metragem);

      if (existing) {
        const { data } = await api.patch(`/cabos-rede/${existing.id}`, { quantidade });
        nextCables = nextCables.map((cable) => (cable.id === data.id ? data : cable));
        continue;
      }

      const { data } = await api.post('/cabos-rede', { metragem, quantidade });
      nextCables.push(data);
    }

    localStorage.removeItem(CABLE_STORAGE_KEY);
    return nextCables.sort((a, b) => Number(a.metragem) - Number(b.metragem));
  }

  const resumo = data?.resumo || {};
  const anosEvolucao = data?.anosEvolucao || [];
  const equipes = data?.atendimentosPorEquipe || [];
  const equipesVisiveis = showAllTeams ? equipes : equipes.slice(0, 10);
  const cidadeColors = useMemo(
    () => makeCityColorMap(data?.equipamentosPorCidade || [], isDark),
    [data, isDark]
  );
  const equipeCidadeMap = useMemo(
    () => makeTeamCityMap(teamCities),
    [teamCities]
  );
  const modeloChart = useMemo(() => makeBarChart(data?.equipamentosPorModelo || [], 'quantidade', isDark), [data, isDark]);
  const cidadeChart = useMemo(
    () => makePieChart(data?.equipamentosPorCidade || [], 'quantidade', isDark, getCityTeamChartPalette(isDark)),
    [data, isDark]
  );
  const equipeChart = useMemo(
    () => makeTeamBarChart(equipesVisiveis, 'registros', isDark, equipeCidadeMap, cidadeColors),
    [equipesVisiveis, isDark, equipeCidadeMap, cidadeColors]
  );
  const defeitoChart = useMemo(() => makeBarChart(data?.motivosDefeito || [], 'quantidade', isDark), [data, isDark]);
  const descarteChart = useMemo(() => makeBarChart(data?.motivosDescarte || [], 'quantidade', isDark), [data, isDark]);
  const evolucaoChart = useMemo(() => makeLineChart(data?.evolucaoPorMes || [], isDark), [data, isDark]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" type="button" onClick={() => loadDashboard()} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" />
            Atualizar
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setReportOpen(true)}>
            <FileText size={16} aria-hidden="true" />
            Gerar relatório
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setCablesOpen(true)}>
            <Cable size={16} aria-hidden="true" />
            Cabos de rede
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setTeamCitiesOpen(true)}>
            <UsersRound size={16} aria-hidden="true" />
            Equipes/Cidades
          </button>
        </div>
      </div>

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
            label="Responsável"
            value={filters.responsavel}
            options={toSelectOptions(filterOptions.responsaveis || [])}
            placeholder="Digite o responsável"
            emptyText="Nenhum responsável encontrado."
            allowCustom
            onChange={(values) => updateFilter('responsavel', values)}
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
          <SearchableMultiSelectField
            label="Motivo"
            value={filters.motivo}
            options={toSelectOptions(motivos)}
            placeholder="Digite o motivo"
            emptyText="Nenhum motivo encontrado."
            onChange={(values) => updateFilter('motivo', values)}
          />
          <SelectField
            label="Resolvido"
            value={filters.resolvido}
            options={RESOLVIDO_OPTIONS}
            onChange={(event) => updateFilter('resolvido', event.target.value)}
          />
          <MultiSelectField
            label="Status"
            value={filters.status}
            options={STATUS}
            onChange={(values) => updateFilter('status', values)}
          />
          <MultiSelectField
            label="Situação final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            onChange={(values) => updateFilter('situacaoFinal', values)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={() => loadDashboard()} disabled={loading}>
            <Filter size={16} aria-hidden="true" />
            Aplicar filtros
          </button>
          <button className="btn btn-secondary" type="button" onClick={clearFilters} disabled={loading}>
            <X size={16} aria-hidden="true" />
            Limpar
          </button>
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Equipamentos" value={formatNumber(resumo.totalEquipamentos)} detail={`${resumo.totalRegistros || 0} registros`} />
        <MetricCard label="Reaproveitados" value={`${formatNumber(resumo.taxaReaproveitamento)}%`} detail={`${formatNumber(resumo.totalReaproveitados)} voltam para uso`} />
        <MetricCard label="RMA" value={`${formatNumber(resumo.taxaRma)}%`} detail={`${formatNumber(resumo.totalRma)} encaminhados`} />
        <MetricCard label="Taxa de descarte" value={`${formatNumber(resumo.taxaDescarte)}%`} detail={`${resumo.totalDescartes || 0} descartes`} />
        <MetricCard label="Taxa de resolução" value={`${formatNumber(resumo.taxaResolucao)}%`} detail={`${resumo.caixaOsResolvidos || 0}/${resumo.totalCaixaOs || 0} elegíveis`} />
      </div>

      {loading ? (
        <div className="rounded-lg border border-line bg-white p-6 text-sm text-slate-500">Carregando indicadores...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Modelos mais recebidos">
            <Bar data={modeloChart} options={barOptions('Quantidade', isDark)} />
          </ChartPanel>

          <ChartPanel title="Cidades com mais problemas">
            <Pie data={cidadeChart} options={pieOptions(isDark)} />
          </ChartPanel>

          <div className="xl:col-span-2">
            <ChartPanel
              title="Equipes com mais atendimentos"
              heightClass={showAllTeams ? 'h-[36rem]' : 'h-[28rem]'}
              action={
                equipes.length > 10 ? (
                  <button
                    className="btn btn-secondary h-9"
                    type="button"
                    onClick={() => setShowAllTeams((current) => !current)}
                  >
                    {showAllTeams ? 'Ver top 10' : 'Ver todas'}
                  </button>
                ) : null
              }
            >
              <Bar data={equipeChart} options={barOptions('Atendimentos', isDark)} />
            </ChartPanel>
          </div>

          <ChartPanel title="Top 5 motivos de defeito">
            <Bar data={defeitoChart} options={barOptions('Quantidade', isDark)} />
          </ChartPanel>

          <ChartPanel title="Top 5 motivos de descarte">
            <Bar data={descarteChart} options={barOptions('Quantidade', isDark)} />
          </ChartPanel>

          <div className="xl:col-span-2">
            <ChartPanel
              title="Evolução por mês"
              action={
                <label className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  Ano
                  <select
                    className="field h-9 w-44"
                    value={filters.evolucaoAno}
                    onChange={(event) => changeEvolutionYear(event.target.value)}
                    aria-label="Ano da evolução"
                  >
                    <option value="">Últimos 12 meses</option>
                    {anosEvolucao.map((ano) => (
                      <option key={ano} value={ano}>
                        {ano}
                      </option>
                    ))}
                  </select>
                </label>
              }
            >
              <Line data={evolucaoChart} options={lineOptions(isDark)} />
            </ChartPanel>
          </div>
        </div>
      )}

      {reportOpen && (
        <DailyReportModal
          reportStartDate={reportStartDate}
          reportEndDate={reportEndDate}
          csvLoading={reportCsvLoading}
          error={reportError}
          onStartDateChange={setReportStartDate}
          onEndDateChange={setReportEndDate}
          onDownloadCsv={downloadReportCsv}
          onClose={() => {
            setReportOpen(false);
            setReportError('');
          }}
        />
      )}

      {cablesOpen && (
        <NetworkCablesModal
          cables={networkCables}
          loading={cablesLoading}
          error={cablesError}
          canEdit={canEditCables}
          onQuantityChange={updateCableQuantity}
          onAddSize={addCableSize}
          onRemoveSize={removeCableSize}
          onReload={loadNetworkCables}
          onClose={() => setCablesOpen(false)}
        />
      )}

      {teamCitiesOpen && (
        <TeamCitiesModal
          rows={teamCities}
          loading={teamCitiesLoading}
          saving={teamCitiesSaving}
          error={teamCitiesError}
          canManage={canManageTeamCities}
          form={teamCityForm}
          mode={teamCityMode}
          selected={selectedTeamCity}
          onCreate={openCreateTeamCity}
          onEdit={editTeamCity}
          onDelete={deleteTeamCity}
          onFieldChange={updateTeamCityField}
          onSave={saveTeamCity}
          onReload={loadTeamCities}
          onClose={() => setTeamCitiesOpen(false)}
        />
      )}
    </section>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ChartPanel({ title, action, heightClass = 'h-80', children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      <div className={`mt-3 ${heightClass}`}>{children}</div>
    </section>
  );
}

function TeamCitiesModal({
  rows,
  loading,
  saving,
  error,
  canManage,
  form,
  mode,
  selected,
  onCreate,
  onEdit,
  onDelete,
  onFieldChange,
  onSave,
  onReload,
  onClose
}) {
  const isEdit = mode === 'edit';
  const [filters, setFilters] = useState({
    tipo: '',
    equipe: '',
    cidade: '',
    supervisor: ''
  });

  const filteredRows = useMemo(() => {
    const tipo = normalizeFilterText(filters.tipo);
    const equipe = normalizeFilterText(filters.equipe);
    const cidade = normalizeFilterText(filters.cidade);
    const supervisor = normalizeFilterText(filters.supervisor);

    return rows.filter((row) => {
      const rowTipo = normalizeFilterText(row.tipo);
      const rowEquipe = normalizeFilterText(row.equipe);
      const rowCidade = normalizeFilterText(row.cidade);
      const rowSupervisor = normalizeFilterText(row.supervisor);

      return (
        (!tipo || rowTipo === tipo) &&
        (!equipe || rowEquipe.includes(equipe)) &&
        (!cidade || rowCidade.includes(cidade)) &&
        (!supervisor || rowSupervisor.includes(supervisor))
      );
    });
  }, [rows, filters]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Equipes/Cidades</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" type="button" onClick={onReload} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" />
              Atualizar
            </button>
            <button className="btn btn-secondary h-10 w-10 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1fr_22rem]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="grid gap-3 rounded-lg border border-line bg-panel p-3 md:grid-cols-4">
              <SelectField
                label="Tipo"
                value={filters.tipo}
                options={[{ value: '', label: 'Todos' }, ...TEAM_CITY_TYPES]}
                onChange={(event) => updateFilter('tipo', event.target.value)}
              />
              <TextField
                label="Equipe"
                value={filters.equipe}
                onChange={(event) => updateFilter('equipe', event.target.value)}
                placeholder="Filtrar por equipe"
              />
              <TextField
                label="Cidade"
                value={filters.cidade}
                onChange={(event) => updateFilter('cidade', event.target.value)}
                placeholder="Filtrar por cidade"
              />
              <TextField
                label="Supervisor"
                value={filters.supervisor}
                onChange={(event) => updateFilter('supervisor', event.target.value)}
                placeholder="Filtrar por supervisor"
              />
            </div>

            <div className="min-h-0 overflow-hidden rounded-lg border border-line bg-white">
            <div className="max-h-[55vh] overflow-auto">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-panel">
                  <tr>
                    <th className="px-3 py-3 text-left font-bold">Tipo</th>
                    <th className="px-3 py-3 text-left font-bold">Equipe</th>
                    <th className="px-3 py-3 text-left font-bold">Cidade</th>
                    <th className="px-3 py-3 text-left font-bold">Supervisor</th>
                    <th className="px-3 py-3 text-right font-bold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading && (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan="5">
                        Carregando equipes/cidades...
                      </td>
                    </tr>
                  )}

                  {!loading && rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan="5">
                        Nenhuma equipe/cidade cadastrada.
                      </td>
                    </tr>
                  )}

                  {!loading && rows.length > 0 && filteredRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-slate-500" colSpan="5">
                        Nenhum registro encontrado para os filtros informados.
                      </td>
                    </tr>
                  )}

                  {!loading && filteredRows.map((row) => (
                    <tr key={row.id} className="hover:bg-panel/70">
                      <td className="px-3 py-3">{formatTeamCityType(row.tipo)}</td>
                      <td className="px-3 py-3 font-semibold">{row.equipe}</td>
                      <td className="px-3 py-3">{row.cidade}</td>
                      <td className="px-3 py-3">{row.supervisor}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-secondary h-9 w-9 px-0"
                            type="button"
                            onClick={() => onEdit(row)}
                            disabled={!canManage}
                            title="Editar"
                            aria-label={`Editar ${row.equipe}`}
                          >
                            <Edit size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="btn btn-danger h-9 w-9 px-0"
                            type="button"
                            onClick={() => onDelete(row)}
                            disabled={!canManage}
                            title="Excluir"
                            aria-label={`Excluir ${row.equipe}`}
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
          </div>

          <form className="space-y-3 rounded-lg border border-line bg-panel p-3" onSubmit={onSave}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold">
                {isEdit ? 'Editar cadastro' : 'Novo cadastro'}
              </h4>
            </div>

            <SelectField
              label="Tipo"
              value={form.tipo}
              options={TEAM_CITY_TYPES}
              disabled={!canManage}
              onChange={(event) => onFieldChange('tipo', event.target.value)}
              required
            />
            <TextField
              label="Equipe"
              value={form.equipe}
              disabled={!canManage}
              onChange={(event) => onFieldChange('equipe', event.target.value)}
              required
            />
            <TextField
              label="Cidade"
              value={form.cidade}
              disabled={!canManage}
              onChange={(event) => onFieldChange('cidade', event.target.value)}
              required
            />
            <TextField
              label="Supervisor"
              value={form.supervisor}
              disabled={!canManage}
              onChange={(event) => onFieldChange('supervisor', event.target.value)}
              required
            />

            {selected && (
              <div className="rounded-md border border-line bg-white p-3 text-xs font-semibold text-slate-500">
                Atualizado em: {formatDateTime(selected.atualizadoEm)}
              </div>
            )}

            <ErrorAlert message={error} />

            {canManage ? (
              <button className="btn btn-primary w-full" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar'}
              </button>
            ) : (
              <div className="rounded-md border border-line bg-white p-3 text-xs font-semibold text-slate-500">
                Seu perfil permite visualizar os registros. Alterações são restritas a administradores.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function DailyReportModal({
  reportStartDate,
  reportEndDate,
  csvLoading,
  error,
  onStartDateChange,
  onEndDateChange,
  onDownloadCsv,
  onClose
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Gerar relatório</h3>
            <p className="text-sm text-slate-500">Selecione o período, baixe o CSV e utilize o gerador externo para montar o relatório completo.</p>
          </div>
          <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3 md:flex-row md:items-end">
            <TextField
              label="Data inicial"
              type="date"
              value={reportStartDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              required
            />
            <TextField
              label="Data final"
              type="date"
              value={reportEndDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              required
            />
            <button className="btn btn-secondary" type="button" onClick={onDownloadCsv} disabled={csvLoading}>
              <Download size={16} aria-hidden="true" />
              {csvLoading ? 'Gerando CSV...' : 'Baixar CSV'}
            </button>
            <a
              className="btn btn-primary"
              href="https://gerador-laboratorio.netlify.app"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} aria-hidden="true" />
              Abrir gerador
            </a>
          </div>

          <ErrorAlert message={error} />

          <div className="rounded-lg border border-line bg-white p-6 text-sm text-slate-500">
            Baixe o CSV do período selecionado e envie o arquivo no gerador externo para criar o relatório detalhado.
          </div>
        </div>
      </div>
    </div>
  );
}

function NetworkCablesModal({ cables, loading, error, canEdit, onQuantityChange, onAddSize, onRemoveSize, onReload, onClose }) {
  const [newSize, setNewSize] = useState('');
  const [localError, setLocalError] = useState('');
  const defaultSizes = new Set(DEFAULT_CABLE_SIZES);

  function handleAddSize(event) {
    event.preventDefault();
    const added = onAddSize(newSize);

    if (!added) {
      setLocalError('Informe uma metragem válida que ainda não esteja na tabela.');
      return;
    }

    setLocalError('');
    setNewSize('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-ink">Cabos de rede</h3>
            <p className="text-sm text-slate-500">Controle a quantidade de cabos por metragem.</p>
          </div>
          <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {canEdit && (
            <form className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3 md:flex-row md:items-end" onSubmit={handleAddSize}>
              <TextField
                label="Adicionar metragem"
                type="number"
                min="1"
                step="0.1"
                value={newSize}
                onChange={(event) => setNewSize(event.target.value)}
                placeholder="Ex.: 15"
              />
              <button className="btn btn-primary" type="submit">
                <Plus size={16} aria-hidden="true" />
                Adicionar
              </button>
            </form>
          )}

          <ErrorAlert message={localError || error} />

          {loading && (
            <div className="rounded-lg border border-line bg-white p-4 text-sm text-slate-500">
              Carregando cabos de rede...
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {cables.map((cable) => {
              const metragem = Number(cable.metragem || 0);
              const quantidade = Number(cable.quantidade || 0);

              return (
                <div key={metragem} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3">
                  <div>
                    <p className="text-lg font-bold text-ink">{formatCableSize(metragem)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-secondary h-9 w-9 px-0"
                      type="button"
                      onClick={() => onQuantityChange(cable, quantidade - 1)}
                      disabled={!canEdit || quantidade <= 0}
                      title="Diminuir quantidade"
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span className="flex h-9 min-w-12 items-center justify-center rounded-md border border-line bg-panel px-3 text-sm font-bold text-ink">
                      {formatNumber(quantidade)}
                    </span>
                    <button
                      className="btn btn-secondary h-9 w-9 px-0"
                      type="button"
                      onClick={() => onQuantityChange(cable, quantidade + 1)}
                      disabled={!canEdit}
                      title="Aumentar quantidade"
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                    {canEdit && !defaultSizes.has(metragem) && metragem !== 7 && (
                      <button
                        className="btn btn-danger h-9 w-9 px-0"
                        type="button"
                        onClick={() => onRemoveSize(cable)}
                        title="Remover metragem"
                        aria-label="Remover metragem"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && cables.length === 0 && (
            <div className="rounded-lg border border-line bg-white p-4 text-sm text-slate-500">
              Nenhum cabo cadastrado.
              <button className="ml-2 font-bold text-slate-700 underline" type="button" onClick={onReload}>
                Recarregar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyReportPreview({ report }) {
  const resumo = report.resumo || {};
  const hasData = Number(resumo.totalEquipamentos || 0) > 0;
  const situacaoChart = makePieChart(report.situacoes || [], 'quantidade', false);
  const modeloChart = makeBarChart(report.modelos || [], 'quantidade', false);
  const motivoChart = makeBarChart(report.motivos || [], 'quantidade', false);
  const equipeChart = makeBarChart(report.equipes || [], 'registros', false);
  const cidadeChart = makePieChart(report.cidades || [], 'quantidade', false);
  const vendasChart = makeMoneyBarChart(report.vendasPorModelo || [], false);

  return (
    <article className="space-y-5 rounded-lg border border-line bg-white p-5 text-slate-900">
      <header className="border-b border-slate-200 pb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">RBT Lab</p>
        <h1 className="mt-1 text-2xl font-bold">Relatório do Laboratório</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>Período analisado: {formatDate(report.dataInicial)} a {formatDate(report.dataFinal)}</span>
          <span>Gerado em: {formatDateTime(report.geradoEm)}</span>
        </div>
      </header>

      {!hasData ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Não houve processamento finalizado no período selecionado.
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-bold">Resumo executivo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{report.insights?.executivo}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                Insights: {report.insights?.fonte || 'Regras automáticas'}
              </span>
              {report.insights?.aviso && (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">
                  {report.insights.aviso}
                </span>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <ReportMetric label="Total processado" value={formatNumber(resumo.totalEquipamentos)} detail={`${formatNumber(resumo.totalRegistros)} registro(s)`} />
            <ReportMetric label="Reaproveitados" value={formatNumber(resumo.totalReaproveitados)} detail={`${formatNumber(resumo.taxaReaproveitamento)}% do total`} />
            <ReportMetric label="Descartes" value={formatNumber(resumo.totalDescartes)} detail={`${formatNumber(resumo.taxaDescarte)}% do total`} />
            <ReportMetric label="RMA" value={formatNumber(resumo.totalRma)} detail={`${formatNumber(resumo.taxaRma)}% do total`} />
            <ReportMetric label="Vendas" value={formatNumber(resumo.totalVendas)} detail={formatCurrency(resumo.valorVendido)} />
            <ReportMetric label="Taxa de resolução" value={`${formatNumber(resumo.taxaResolucao)}%`} detail={`${formatNumber(resumo.caixaOsResolvidos)}/${formatNumber(resumo.totalCaixaOs)} elegíveis`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ReportChart title="Equipamentos por situação final">
              <Pie data={situacaoChart} options={pieOptions(false)} />
            </ReportChart>
            <ReportChart title="Modelos mais recebidos">
              <Bar data={modeloChart} options={barOptions('Quantidade', false)} />
            </ReportChart>
            <ReportChart title="Motivos mais recorrentes">
              <Bar data={motivoChart} options={barOptions('Quantidade', false)} />
            </ReportChart>
            <ReportChart title="Equipes com mais atendimentos">
              <Bar data={equipeChart} options={barOptions('Atendimentos', false)} />
            </ReportChart>
            <ReportChart title="Cidades com mais problemas">
              <Pie data={cidadeChart} options={pieOptions(false)} />
            </ReportChart>
            {(report.vendasPorModelo || []).length > 0 && (
              <ReportChart title="Vendas por modelo">
                <Bar data={vendasChart} options={barOptions('Valor vendido', false)} />
              </ReportChart>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ReportList title="Destaques" items={report.insights?.destaques || []} />
            <ReportList title="O que está bom" items={report.insights?.pontosPositivos || []} />
            <ReportList title="O que pode melhorar" items={report.insights?.oportunidades || []} />
          </section>
        </>
      )}
    </article>
  );
}

function ReportMetric({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

function ReportChart({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 p-3">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-3 h-72">{children}</div>
    </section>
  );
}

function ReportList({ title, items }) {
  return (
    <section className="rounded-lg border border-slate-200 p-3">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-5 text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function makeBarChart(rows, valueKey, isDark) {
  const palette = getChartPalette(isDark);

  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: valueKey === 'registros' ? 'Registros' : 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: rows.map((item, index) => palette[index % palette.length]),
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}

function makeTeamBarChart(rows, valueKey, isDark, teamCityMap, cityColorMap) {
  const fallbackColors = getChartPalette(isDark);

  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: valueKey === 'registros' ? 'Registros' : 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: rows.map((item, index) => {
          const cidade = teamCityMap.get(normalizeChartKey(item.label));
          return cityColorMap.get(normalizeChartKey(cidade)) || fallbackColors[index % fallbackColors.length];
        }),
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}

function makePieChart(rows, valueKey, isDark, palette = getChartPalette(isDark)) {

  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: rows.map((item, index) => getCityChartColor(item.label, index, isDark, palette)),
        borderColor: isDark ? '#111827' : '#ffffff',
        borderWidth: 2
      }
    ]
  };
}

function getChartPalette(isDark) {
  return BAR_CHART_COLORS;
}

function makeCityColorMap(cidades, isDark) {
  const palette = getCityTeamChartPalette(isDark);
  const map = new Map();

  cidades.forEach((cidade, index) => {
    map.set(normalizeChartKey(cidade.label), getCityChartColor(cidade.label, index, isDark, palette));
  });

  return map;
}

function getCityChartColor(city, index, isDark, palette = getChartPalette(isDark)) {
  return palette[index % palette.length];
}

function getCityTeamChartPalette(isDark) {
  return CITY_TEAM_CHART_COLORS;
}

function makeTeamCityMap(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const equipeKey = normalizeChartKey(row.equipe);
    const tipoKey = normalizeChartKey(formatTeamCityType(row.tipo));
    const digitsKey = onlyDigits(row.equipe);

    map.set(equipeKey, row.cidade);
    if (tipoKey && equipeKey) map.set(`${tipoKey} ${equipeKey}`, row.cidade);
    if (digitsKey && !map.has(digitsKey)) map.set(digitsKey, row.cidade);
  });

  return map;
}

function makeLineChart(rows, isDark) {
  return {
    labels: rows.map((item) => item.mes),
    datasets: [
      {
        label: 'Total',
        data: rows.map((item) => item.quantidade || 0),
        borderColor: isDark ? '#5eead4' : '#0f766e',
        backgroundColor: isDark ? '#5eead4' : '#0f766e',
        tension: 0.25
      },
      {
        label: 'Descarte',
        data: rows.map((item) => item.descartes || 0),
        borderColor: isDark ? '#f87171' : '#b91c1c',
        backgroundColor: isDark ? '#f87171' : '#b91c1c',
        tension: 0.25
      },
      {
        label: 'RMA',
        data: rows.map((item) => item.rma || 0),
        borderColor: isDark ? '#93c5fd' : '#2563eb',
        backgroundColor: isDark ? '#93c5fd' : '#2563eb',
        tension: 0.25
      },
      {
        label: 'Reaproveitado',
        data: rows.map((item) => item.reaproveitados || 0),
        borderColor: isDark ? '#fbbf24' : '#d97706',
        backgroundColor: isDark ? '#fbbf24' : '#d97706',
        tension: 0.25
      }
    ]
  };
}

function makeMoneyBarChart(rows, isDark) {
  const palette = getChartPalette(isDark);

  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: 'Valor vendido',
        data: rows.map((item) => item.valorVendido || 0),
        backgroundColor: rows.map((item, index) => palette[index % palette.length]),
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}

function barOptions(label, isDark) {
  const textColor = isDark ? '#e5e7eb' : '#1f2933';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, maxRotation: 35, minRotation: 0 }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { color: textColor, display: true, text: label }
      }
    }
  };
}

function lineOptions(isDark) {
  const textColor = isDark ? '#e5e7eb' : '#1f2933';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { labels: { color: textColor }, position: 'bottom' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor }
      }
    }
  };
}

function pieOptions(isDark) {
  const textColor = isDark ? '#e5e7eb' : '#1f2933';

  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { labels: { color: textColor }, position: 'bottom' },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${formatNumber(value)}`;
          }
        }
      }
    }
  };
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
    value: typeof item === 'string' ? item : item.nome,
    label: typeof item === 'string' ? item : item.nome
  }));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatCableSize(value) {
  return `${formatNumber(value)}M`;
}

function toTeamCityForm(row) {
  return {
    tipo: row?.tipo || 'EQUIPE',
    equipe: row?.equipe || '',
    cidade: row?.cidade || '',
    supervisor: row?.supervisor || ''
  };
}

function sortTeamCities(a, b) {
  return `${a.tipo} ${a.equipe} ${a.cidade}`.localeCompare(`${b.tipo} ${b.equipe} ${b.cidade}`, 'pt-BR');
}

function formatTeamCityType(value) {
  return value === 'SUPORTE' ? 'Suporte' : 'Equipe';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(`${value}T12:00:00.000`).toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

export default DashboardPage;
