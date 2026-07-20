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
import { Filter, RefreshCw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import ErrorAlert from '../components/ErrorAlert.jsx';
import { MultiSelectField, SearchableMultiSelectField, TextField } from '../components/FormFields.jsx';
import api, { getBackendMessage } from '../lib/api';
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
  responsavel: [],
  modelo: [],
  fabricante: [],
  categoria: [],
  comprador: []
};

function SalesPage() {
  const { isDark } = useThemeMode();
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ responsaveis: [], fabricantes: [], categorias: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSales();
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

  async function loadSales(nextFilters = filters) {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/dashboard/vendas', {
        params: compact(nextFilters)
      });
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
    loadSales(initialFilters);
  }

  const resumo = data?.resumo || {};
  const modeloMaisVendido = data?.modeloMaisVendido;
  const mesComMaisVendas = data?.mesComMaisVendas;
  const compradores = data?.compradores || [];
  const modelosChart = useMemo(() => makeBarChart(data?.modelosMaisVendidos || [], isDark), [data, isDark]);
  const mesesChart = useMemo(() => makeLineChart(data?.vendasPorMes || [], isDark), [data, isDark]);
  const quantidadeMesChart = useMemo(() => makeQuantityMonthChart(data?.vendasPorMes || [], isDark), [data, isDark]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Vendas</h2>
        <button className="btn btn-secondary" type="button" onClick={() => loadSales()} disabled={loading}>
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
            label="Comprador"
            value={filters.comprador}
            options={compradores.map((comprador) => ({ value: comprador, label: comprador }))}
            placeholder="Digite o comprador"
            emptyText="Nenhum comprador encontrado."
            allowCustom
            onChange={(values) => updateFilter('comprador', values)}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={() => loadSales()} disabled={loading}>
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Valor vendido" value={formatCurrency(resumo.valorVendido)} detail={`${formatNumber(resumo.quantidadeVendida)} equipamento(s)`} />
        <MetricCard label="Vendas registradas" value={formatNumber(resumo.registros)} detail="registro(s) de venda" />
        <MetricCard label="Modelo mais vendido" value={modeloMaisVendido?.label || '-'} detail={`${formatNumber(modeloMaisVendido?.quantidade)} equipamento(s)`} />
        <MetricCard label="Mês com mais vendas" value={formatMonth(mesComMaisVendas?.mes)} detail={formatCurrency(mesComMaisVendas?.valorVendido)} />
      </div>

      {loading ? (
        <div className="rounded-lg border border-line bg-white p-6 text-sm text-slate-500">Carregando vendas...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Modelos mais vendidos">
            <Bar data={modelosChart} options={chartOptions('Quantidade', isDark)} />
          </ChartPanel>
          <ChartPanel title="Valor vendido por mês">
            <Line data={mesesChart} options={chartOptions('Valor vendido', isDark)} />
          </ChartPanel>
          <ChartPanel title="Quantidade vendida por mês">
            <Bar data={quantidadeMesChart} options={chartOptions('Quantidade vendida', isDark)} />
          </ChartPanel>
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-ink">{value}</p>
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

function makeBarChart(rows, isDark) {
  return {
    labels: rows.map((item) => item.label),
    datasets: [
      {
        label: 'Quantidade',
        data: rows.map((item) => item.quantidade || 0),
        backgroundColor: isDark ? '#5eead4' : '#0f766e',
        borderRadius: 4,
        maxBarThickness: 36
      }
    ]
  };
}

function makeLineChart(rows, isDark) {
  return {
    labels: rows.map((item) => item.mes),
    datasets: [
      {
        label: 'Valor vendido',
        data: rows.map((item) => item.valorVendido || 0),
        borderColor: isDark ? '#fbbf24' : '#d97706',
        backgroundColor: isDark ? '#fbbf24' : '#d97706',
        tension: 0.25
      }
    ]
  };
}

function makeQuantityMonthChart(rows, isDark) {
  return {
    labels: rows.map((item) => item.mes),
    datasets: [
      {
        label: 'Quantidade vendida',
        data: rows.map((item) => item.quantidade || 0),
        backgroundColor: isDark ? '#93c5fd' : '#2563eb',
        borderRadius: 4,
        maxBarThickness: 42
      }
    ]
  };
}

function chartOptions(label, isDark) {
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatMonth(value) {
  if (!value) return '-';
  const [year, month] = value.split('-');
  return `${month}/${year}`;
}

export default SalesPage;
