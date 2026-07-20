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
import { Cable, Download, ExternalLink, FileText, Filter, Plus, RefreshCw, Trash2, X } from 'lucide-react';
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

function DashboardPage() {
  const { isDark } = useThemeMode();
  const { user } = useAuth();
  const canEditCables = Boolean(user);
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  useEffect(() => {
    loadDashboard();
    loadModelos();
    loadMotivos();
    loadFilterOptions();
    loadNetworkCables();
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

  async function exportCsv() {
    setExporting(true);
    setError('');

    try {
      const response = await api.get('/dashboard/export.csv', {
        params: compact(filters),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard-equipamentos-${new Date().toISOString().slice(0, 10)}.csv`);
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
  const modeloChart = useMemo(() => makeBarChart(data?.equipamentosPorModelo || [], 'quantidade', isDark), [data, isDark]);
  const cidadeChart = useMemo(() => makePieChart(data?.equipamentosPorCidade || [], 'quantidade', isDark), [data, isDark]);
  const equipeChart = useMemo(() => makeBarChart(equipesVisiveis, 'registros', isDark), [equipesVisiveis, isDark]);
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
          <button className="btn btn-primary" type="button" onClick={exportCsv} disabled={exporting}>
            <Download size={16} aria-hidden="true" />
            CSV
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
                    {canEdit && !defaultSizes.has(metragem) && (
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
  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: valueKey === 'registros' ? 'Registros' : 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: isDark ? '#5eead4' : '#0f766e',
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}

function makePieChart(rows, valueKey, isDark) {
  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: isDark ? [
          '#5eead4',
          '#93c5fd',
          '#fbbf24',
          '#f87171',
          '#c4b5fd',
          '#67e8f9',
          '#bef264',
          '#fb7185',
          '#a5b4fc',
          '#fde047',
          '#86efac',
          '#7dd3fc',
          '#fdba74',
          '#d8b4fe',
          '#cbd5e1'
        ] : [
          '#0f766e',
          '#2563eb',
          '#d97706',
          '#b91c1c',
          '#7c3aed',
          '#0891b2',
          '#4d7c0f',
          '#be123c',
          '#4338ca',
          '#a16207',
          '#15803d',
          '#0369a1',
          '#c2410c',
          '#6d28d9',
          '#0f172a'
        ],
        borderColor: isDark ? '#111827' : '#ffffff',
        borderWidth: 2
      }
    ]
  };
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
  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: 'Valor vendido',
        data: rows.map((item) => item.valorVendido || 0),
        backgroundColor: isDark ? '#fbbf24' : '#d97706',
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
