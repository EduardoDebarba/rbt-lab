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
import { Download, Filter, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { SelectField, TextField } from '../components/FormFields.jsx';
import api, { getBackendMessage } from '../lib/api';
import { SITUACOES, STATUS } from '../lib/constants';

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
  cidade: '',
  equipe: '',
  responsavel: '',
  modelo: '',
  motivo: '',
  resolvido: '',
  status: '',
  situacaoFinal: ''
};

const RESOLVIDO_OPTIONS = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' }
];

function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [modelos, setModelos] = useState([]);
  const [motivos, setMotivos] = useState([]);

  useEffect(() => {
    loadDashboard();
    loadModelos();
    loadMotivos();
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

  async function loadMotivos() {
    try {
      const { data } = await api.get('/motivos-equipamento', {
        params: { limit: 100 }
      });
      setMotivos(data);
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

  const resumo = data?.resumo || {};
  const modeloChart = useMemo(() => makeBarChart(data?.equipamentosPorModelo || [], 'quantidade'), [data]);
  const cidadeChart = useMemo(() => makePieChart(data?.equipamentosPorCidade || [], 'quantidade'), [data]);
  const defeitoChart = useMemo(() => makeBarChart(data?.motivosDefeito || [], 'quantidade'), [data]);
  const descarteChart = useMemo(() => makeBarChart(data?.motivosDescarte || [], 'quantidade'), [data]);
  const evolucaoChart = useMemo(() => makeLineChart(data?.evolucaoPorMes || []), [data]);

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
            label="Responsável"
            value={filters.responsavel}
            onChange={(event) => updateFilter('responsavel', event.target.value)}
          />
          <TextField
            label="Modelo"
            value={filters.modelo}
            list="dashboard-modelos"
            onChange={(event) => updateFilter('modelo', event.target.value)}
          />
          <datalist id="dashboard-modelos">
            {modelos.map((modelo) => (
              <option key={modelo.id} value={modelo.nome} />
            ))}
          </datalist>
          <TextField
            label="Motivo"
            value={filters.motivo}
            list="dashboard-motivos"
            onChange={(event) => updateFilter('motivo', event.target.value)}
          />
          <datalist id="dashboard-motivos">
            {motivos.map((motivo) => (
              <option key={motivo.id} value={motivo.nome} />
            ))}
          </datalist>
          <SelectField
            label="Resolvido"
            value={filters.resolvido}
            options={RESOLVIDO_OPTIONS}
            onChange={(event) => updateFilter('resolvido', event.target.value)}
          />
          <SelectField
            label="Status"
            value={filters.status}
            options={STATUS}
            onChange={(event) => updateFilter('status', event.target.value)}
          />
          <SelectField
            label="Situação final"
            value={filters.situacaoFinal}
            options={SITUACOES}
            onChange={(event) => updateFilter('situacaoFinal', event.target.value)}
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
        <MetricCard label="Taxa de resolução" value={`${formatNumber(resumo.taxaResolucao)}%`} detail={`${resumo.caixaOsResolvidos || 0}/${resumo.totalCaixaOs || 0} Caixa de OS`} />
        <MetricCard label="Taxa de descarte" value={`${formatNumber(resumo.taxaDescarte)}%`} detail={`${resumo.totalDescartes || 0} descartes`} />
        <MetricCard label="Equipamentos" value={formatNumber(resumo.totalEquipamentos)} detail={`${resumo.totalRegistros || 0} registros`} />
        <MetricCard label="Reaproveitados" value={formatNumber(resumo.totalReaproveitados)} detail="voltam para uso" />
        <MetricCard label="RMA" value={formatNumber(resumo.totalRma)} detail="encaminhados" />
      </div>

      {loading ? (
        <div className="rounded-lg border border-line bg-white p-6 text-sm text-slate-500">Carregando indicadores...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Modelos mais recebidos">
            <Bar data={modeloChart} options={barOptions('Quantidade')} />
          </ChartPanel>

          <ChartPanel title="Cidades com mais problemas">
            <Pie data={cidadeChart} options={pieOptions} />
          </ChartPanel>

          <ChartPanel title="Top 5 motivos de defeito">
            <Bar data={defeitoChart} options={barOptions('Quantidade')} />
          </ChartPanel>

          <ChartPanel title="Top 5 motivos de descarte">
            <Bar data={descarteChart} options={barOptions('Quantidade')} />
          </ChartPanel>

          <div className="xl:col-span-2">
            <ChartPanel title="Evolução por mês">
              <Line data={evolucaoChart} options={lineOptions} />
            </ChartPanel>
          </div>
        </div>
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

function ChartPanel({ title, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-3 h-80">{children}</div>
    </section>
  );
}

function makeBarChart(rows, valueKey) {
  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: valueKey === 'registros' ? 'Registros' : 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: '#0f766e',
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}

function makePieChart(rows, valueKey) {
  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: 'Quantidade',
        data: rows.map((item) => item[valueKey] || 0),
        backgroundColor: [
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
        borderColor: '#ffffff',
        borderWidth: 2
      }
    ]
  };
}

function makeLineChart(rows) {
  return {
    labels: rows.map((item) => item.mes),
    datasets: [
      {
        label: 'Total',
        data: rows.map((item) => item.quantidade || 0),
        borderColor: '#0f766e',
        backgroundColor: '#0f766e',
        tension: 0.25
      },
      {
        label: 'Descarte',
        data: rows.map((item) => item.descartes || 0),
        borderColor: '#b91c1c',
        backgroundColor: '#b91c1c',
        tension: 0.25
      },
      {
        label: 'RMA',
        data: rows.map((item) => item.rma || 0),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.25
      },
      {
        label: 'Reaproveitado',
        data: rows.map((item) => item.reaproveitados || 0),
        borderColor: '#d97706',
        backgroundColor: '#d97706',
        tension: 0.25
      }
    ]
  };
}

function barOptions(label) {
  return {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: {
        ticks: { maxRotation: 35, minRotation: 0 }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: label }
      }
    }
  };
}

const lineOptions = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { position: 'bottom' },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    y: { beginAtZero: true }
  }
};

const pieOptions = {
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: { position: 'bottom' },
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

function compact(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

export default DashboardPage;
