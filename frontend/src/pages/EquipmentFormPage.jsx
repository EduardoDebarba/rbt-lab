import { ArrowLeft, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorAlert from '../components/ErrorAlert.jsx';
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField
} from '../components/FormFields.jsx';
import api, { getBackendMessage } from '../lib/api';
import { ORIGENS, SITUACOES, STATUS } from '../lib/constants';

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const initialForm = {
  dataFinalizacao: getTodayInputValue(),
  modelo: '',
  quantidade: 1,
  origem: 'RECOLHIMENTO',
  numeroSerie: '',
  equipe: '',
  protocolo: '',
  cidade: '',
  status: 'RESET_LIMPEZA',
  situacaoFinal: 'REAPROVEITADO',
  motivo: '',
  valorVenda: '',
  compradorVenda: '',
  documentoCompradorVenda: '',
  vendaConfirmada: true,
  resolvido: '',
  observacoes: ''
};

function EquipmentFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);
  const [modelos, setModelos] = useState([]);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [creatingModelo, setCreatingModelo] = useState(false);
  const [showModeloOptions, setShowModeloOptions] = useState(false);
  const [motivos, setMotivos] = useState([]);
  const [loadingMotivos, setLoadingMotivos] = useState(false);
  const [creatingMotivo, setCreatingMotivo] = useState(false);
  const [showMotivoOptions, setShowMotivoOptions] = useState(false);
  const numeroSerieRef = useRef(null);

  const isRmaOrDescarte = useMemo(
    () => form.situacaoFinal === 'RMA' || form.situacaoFinal === 'DESCARTE',
    [form.situacaoFinal]
  );
  const isVenda = form.situacaoFinal === 'VENDA';
  const isEmTeste = form.status === 'EM_TESTE';
  useEffect(() => {
    if (isEdit) loadEquipamento();
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit) {
      numeroSerieRef.current?.focus();
    }
  }, [isEdit]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadModelos(form.modelo);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [form.modelo]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadMotivos(form.motivo);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [form.motivo]);

  const modeloJaCadastrado = useMemo(
    () => modelos.some((modelo) => normalizeModelName(modelo.nome) === normalizeModelName(form.modelo)),
    [modelos, form.modelo]
  );

  const motivoJaCadastrado = useMemo(
    () => !form.motivo.trim() || motivos.some((motivo) => normalizeSearchName(motivo.nome) === normalizeSearchName(form.motivo)),
    [motivos, form.motivo]
  );

  async function loadEquipamento() {
    setLoadingRecord(true);
    setBackendError('');

    try {
      const { data } = await api.get(`/equipamentos/${id}`);
      setForm(toFormState(data));
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoadingRecord(false);
    }
  }

  async function loadModelos(query = '') {
    setLoadingModelos(true);

    try {
      const { data } = await api.get('/modelos-equipamento', {
        params: {
          q: query || undefined,
          limit: 20
        }
      });
      setModelos(data);
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoadingModelos(false);
    }
  }

  async function loadMotivos(query = '') {
    setLoadingMotivos(true);

    try {
      const { data } = await api.get('/motivos-equipamento', {
        params: {
          q: query || undefined,
          limit: 20
        }
      });
      setMotivos(data);
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoadingMotivos(false);
    }
  }

  function updateField(field, value) {
    setBackendError('');
    setErrors((current) => ({ ...current, [field]: '' }));

    setForm((current) => {
      const next = { ...current, [field]: value };

      if (!isEdit && field === 'numeroSerie') {
        const totalSerialNumbers = parseSerialNumbers(value).length;
        next.quantidade = totalSerialNumbers > 0 ? totalSerialNumbers : 1;
      }

      if (field === 'situacaoFinal') {
        if (value === 'DESCARTE' || value === 'RMA') {
          const totalSerialNumbers = parseSerialNumbers(next.numeroSerie).length;
          next.quantidade = !isEdit && totalSerialNumbers > 0 ? totalSerialNumbers : 1;
          next.status = 'FINALIZADO';
        }

        if (value === 'VENDA') {
          next.motivo = '';
          next.equipe = '';
          next.protocolo = '';
          next.cidade = '';
          next.resolvido = '';
          next.vendaConfirmada = true;
        }
      }

      if (field === 'status' && value !== 'EM_TESTE') {
        next.resolvido = '';
      }

      return next;
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    await submit('save');
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este equipamento?')) return;

    setLoading(true);
    setBackendError('');

    try {
      await api.delete(`/equipamentos/${id}`);
      navigate('/equipamentos');
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateModelo() {
    const nome = form.modelo.trim();

    if (!nome) {
      setErrors((current) => ({ ...current, modelo: 'Informe o nome do modelo.' }));
      return;
    }

    setCreatingModelo(true);
    setBackendError('');
    setErrors((current) => ({ ...current, modelo: '' }));

    try {
      const { data } = await api.post('/modelos-equipamento', { nome });
      setModelos((current) => [data, ...current.filter((modelo) => modelo.id !== data.id)]);
      updateField('modelo', data.nome);
      setShowModeloOptions(false);
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setCreatingModelo(false);
    }
  }

  async function handleCreateMotivo() {
    const nome = form.motivo.trim();

    if (!nome) {
      setErrors((current) => ({ ...current, motivo: 'Informe o nome do motivo.' }));
      return;
    }

    setCreatingMotivo(true);
    setBackendError('');
    setErrors((current) => ({ ...current, motivo: '' }));

    try {
      const { data } = await api.post('/motivos-equipamento', { nome });
      setMotivos((current) => [data, ...current.filter((motivo) => motivo.id !== data.id)]);
      updateField('motivo', data.nome);
      setShowMotivoOptions(false);
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setCreatingMotivo(false);
    }
  }

  async function submit(action) {
    const validation = validateForm(form, modelos, motivos, { isEdit });

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setLoading(true);
    setBackendError('');

    try {
      const payload = toPayload(form);

      if (isEdit) {
        await api.patch(`/equipamentos/${id}`, payload);
      } else {
        const serialNumbers = parseSerialNumbers(form.numeroSerie);

        if (serialNumbers.length > 1) {
          await Promise.all(serialNumbers.map((serialNumber) => (
            api.post('/equipamentos', {
              ...payload,
              numeroSerie: serialNumber,
              quantidade: 1
            })
          )));
        } else {
          await api.post('/equipamentos', payload);
        }
      }

      navigate('/equipamentos');
    } catch (error) {
      setBackendError(getBackendMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (loadingRecord) {
    return <div className="rounded-lg border border-line bg-white p-6 text-sm">Carregando...</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {isEdit ? 'Editar equipamento' : 'Cadastrar equipamento'}
          </h2>
        </div>
        <Link className="btn btn-secondary" to="/equipamentos">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>
      </div>

      <form className="rounded-lg border border-line bg-white p-4" onSubmit={handleSave}>
        <ErrorAlert message={backendError} />

        <div className="mt-3 grid gap-4 md:grid-cols-4">
          <TextField
            label="Data"
            type="date"
            value={form.dataFinalizacao}
            error={errors.dataFinalizacao}
            onChange={(event) => updateField('dataFinalizacao', event.target.value)}
          />
          <ModeloField
            value={form.modelo}
            error={errors.modelo}
            modelos={modelos}
            loading={loadingModelos}
            creating={creatingModelo}
            showOptions={showModeloOptions}
            canCreate={Boolean(form.modelo.trim()) && !modeloJaCadastrado}
            onFocus={() => setShowModeloOptions(true)}
            onBlur={() => window.setTimeout(() => setShowModeloOptions(false), 150)}
            onChange={(value) => {
              updateField('modelo', value);
              setShowModeloOptions(true);
            }}
            onSelect={(value) => {
              updateField('modelo', value);
              setShowModeloOptions(false);
            }}
            onCreate={handleCreateModelo}
          />
          <TextField
            label="Quantidade"
            type="number"
            min="1"
            value={form.quantidade}
            error={errors.quantidade}
            disabled={isRmaOrDescarte}
            onChange={(event) => updateField('quantidade', Number(event.target.value))}
          />
          <SelectField
            label="Origem"
            value={form.origem}
            error={errors.origem}
            options={ORIGENS}
            onChange={(event) => updateField('origem', event.target.value)}
          />
          <SelectField
            label="Status"
            value={form.status}
            error={errors.status}
            options={STATUS}
            onChange={(event) => updateField('status', event.target.value)}
          />
          <SelectField
            label="Situação final"
            value={form.situacaoFinal}
            error={errors.situacaoFinal}
            options={SITUACOES}
            onChange={(event) => updateField('situacaoFinal', event.target.value)}
          />
          {isEdit ? (
            <TextField
              label="Número de série"
              value={form.numeroSerie}
              error={errors.numeroSerie}
              onChange={(event) => updateField('numeroSerie', event.target.value)}
            />
          ) : (
            <div>
              <TextAreaField
                label="Número de série"
                rows="3"
                inputRef={numeroSerieRef}
                value={form.numeroSerie}
                error={errors.numeroSerie}
                placeholder="Bipe um SN por linha"
                onChange={(event) => updateField('numeroSerie', event.target.value)}
              />
            </div>
          )}
          {!isVenda && (
            <>
              <TextField
                label="Equipe"
                value={form.equipe}
                error={errors.equipe}
                onChange={(event) => updateField('equipe', event.target.value)}
              />
              <TextField
                label="Protocolo"
                value={form.protocolo}
                error={errors.protocolo}
                onChange={(event) => updateField('protocolo', event.target.value)}
              />
              <TextField
                label="Cidade"
                value={form.cidade}
                error={errors.cidade}
                onChange={(event) => updateField('cidade', event.target.value)}
              />
              <SearchCreateField
                label="Motivo"
                value={form.motivo}
                error={errors.motivo}
                items={motivos}
                loading={loadingMotivos}
                creating={creatingMotivo}
                showOptions={showMotivoOptions}
                canCreate={Boolean(form.motivo.trim()) && !motivoJaCadastrado}
                createTitle="Cadastrar motivo"
                emptyText="Nenhum motivo encontrado."
                onFocus={() => setShowMotivoOptions(true)}
                onBlur={() => window.setTimeout(() => setShowMotivoOptions(false), 150)}
                onChange={(value) => {
                  updateField('motivo', value);
                  setShowMotivoOptions(true);
                }}
                onSelect={(value) => {
                  updateField('motivo', value);
                  setShowMotivoOptions(false);
                }}
                onCreate={handleCreateMotivo}
              />
            </>
          )}
          {isVenda && (
            <>
              <TextField
                label="Valor unitário"
                type="number"
                min="0"
                step="0.01"
                value={form.valorVenda}
                error={errors.valorVenda}
                onChange={(event) => updateField('valorVenda', event.target.value)}
              />
              <TextField
                label="Comprador"
                value={form.compradorVenda}
                error={errors.compradorVenda}
                onChange={(event) => updateField('compradorVenda', event.target.value)}
              />
              <TextField
                label="CPF/CNPJ"
                value={form.documentoCompradorVenda}
                error={errors.documentoCompradorVenda}
                onChange={(event) => updateField('documentoCompradorVenda', event.target.value)}
              />
              <div className="flex items-end pb-1">
                <CheckboxField
                  label="Venda confirmada"
                  checked={form.vendaConfirmada === true}
                  onChange={(checked) => updateField('vendaConfirmada', checked)}
                />
              </div>
            </>
          )}
          {isEmTeste && !isVenda && (
            <div>
              <span className="label">Resolvido</span>
              <div className="grid grid-cols-2 gap-2">
                <CheckboxField
                  label="Sim"
                  checked={form.resolvido === true}
                  onChange={() => updateField('resolvido', true)}
                />
                <CheckboxField
                  label="Não"
                  checked={form.resolvido === false}
                  onChange={() => updateField('resolvido', false)}
                />
              </div>
              {errors.resolvido && (
                <span className="mt-1 block text-xs font-medium text-red-700">
                  {errors.resolvido}
                </span>
              )}
            </div>
          )}
          <div className="md:col-span-4">
            <TextAreaField
              label="OBSERVAÇÕES"
              value={form.observacoes}
              error={errors.observacoes}
              onChange={(event) => updateField('observacoes', event.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {isEdit && (
            <button
              className="btn btn-danger mr-auto"
              type="button"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 size={16} aria-hidden="true" />
              Excluir
            </button>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            Salvar
          </button>
        </div>
      </form>
    </section>
  );
}

function ModeloField({
  value,
  error,
  modelos,
  loading,
  creating,
  showOptions,
  canCreate,
  onFocus,
  onBlur,
  onChange,
  onSelect,
  onCreate
}) {
  return (
    <SearchCreateField
      label="Modelo"
      value={value}
      error={error}
      items={modelos}
      loading={loading}
      creating={creating}
      showOptions={showOptions}
      canCreate={canCreate}
      createTitle="Cadastrar modelo"
      emptyText="Nenhum modelo encontrado."
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChange}
      onSelect={onSelect}
      onCreate={onCreate}
    />
  );
}

function SearchCreateField({
  label,
  value,
  error,
  items,
  loading,
  creating,
  showOptions,
  canCreate,
  createTitle,
  emptyText,
  onFocus,
  onBlur,
  onChange,
  onSelect,
  onCreate
}) {
  return (
    <div className="relative md:col-span-1">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input
          className={`field ${error ? 'border-red-400' : ''}`}
          value={value}
          autoComplete="off"
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Digite para buscar"
        />
        <button
          className="btn btn-secondary h-10 w-10 px-0"
          type="button"
          disabled={!canCreate || creating}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCreate}
          title={createTitle}
          aria-label={createTitle}
        >
          {creating ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        </button>
      </div>
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}

      {showOptions && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-white py-1 shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-500">Buscando...</div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">{emptyText}</div>
          )}

          {!loading && items.map((item) => (
            <button
              key={item.id}
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-panel"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item.nome)}
            >
              {item.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function validateForm(form, modelos = [], motivos = [], options = {}) {
  const errors = {};
  const isEdit = Boolean(options.isEdit);
  const isRmaOrDescarte = form.situacaoFinal === 'RMA' || form.situacaoFinal === 'DESCARTE';
  const modeloCadastrado = modelos.some((modelo) => normalizeModelName(modelo.nome) === normalizeModelName(form.modelo));
  const motivoCadastrado = !form.motivo.trim() || motivos.some((motivo) => normalizeSearchName(motivo.nome) === normalizeSearchName(form.motivo));

  if (!form.modelo.trim()) errors.modelo = 'Informe o modelo.';
  if (form.modelo.trim() && !modeloCadastrado) {
    errors.modelo = 'Selecione um modelo cadastrado ou cadastre este modelo antes de salvar.';
  }
  if (form.motivo.trim() && !motivoCadastrado) {
    errors.motivo = 'Selecione um motivo cadastrado ou cadastre este motivo antes de salvar.';
  }
  if (!Number.isInteger(Number(form.quantidade)) || Number(form.quantidade) <= 0) {
    errors.quantidade = 'Informe uma quantidade válida.';
  }
  if (!form.origem) errors.origem = 'Selecione a origem.';
  if (!form.status) errors.status = 'Selecione o status.';
  if (!form.situacaoFinal) errors.situacaoFinal = 'Selecione a situação final.';

  if (isRmaOrDescarte) {
    const serialNumbers = parseSerialNumbers(form.numeroSerie);

    if (serialNumbers.length === 0) errors.numeroSerie = 'SN obrigatório para RMA ou Descarte.';
    if (isEdit && Number(form.quantidade) !== 1) errors.quantidade = 'QTD deve ser 1.';
    if (!isEdit && serialNumbers.length <= 1 && Number(form.quantidade) !== 1) errors.quantidade = 'QTD deve ser 1.';
    if (!form.motivo.trim()) errors.motivo = 'Motivo obrigatório para RMA ou Descarte.';
  }

  if (form.status === 'EM_TESTE' && typeof form.resolvido !== 'boolean') {
    errors.resolvido = 'Informe se foi resolvido.';
  }

  if (form.valorVenda !== '' && (!Number.isFinite(Number(form.valorVenda)) || Number(form.valorVenda) < 0)) {
    errors.valorVenda = 'Informe um valor de venda válido.';
  }

  if (form.compradorVenda.trim().length > 160) {
    errors.compradorVenda = 'Comprador deve ter no máximo 160 caracteres.';
  }

  if (form.documentoCompradorVenda.trim()) {
    const digits = form.documentoCompradorVenda.replace(/\D/g, '');

    if (![11, 14].includes(digits.length)) {
      errors.documentoCompradorVenda = 'CPF/CNPJ deve ter 11 ou 14 dígitos.';
    }
  }

  return errors;
}

function toPayload(form) {
  const isVenda = form.situacaoFinal === 'VENDA';

  const payload = {
    modelo: form.modelo.trim(),
    dataFinalizacao: emptyToNull(form.dataFinalizacao),
    quantidade: Number(form.quantidade),
    origem: form.origem,
    numeroSerie: emptyToNull(form.numeroSerie),
    equipe: isVenda ? null : emptyToNull(form.equipe),
    protocolo: isVenda ? null : emptyToNull(form.protocolo),
    cidade: isVenda ? null : emptyToNull(form.cidade),
    status: form.status,
    situacaoFinal: form.situacaoFinal,
    motivo: isVenda ? null : emptyToNull(form.motivo),
    valorVenda: emptyToNull(form.valorVenda),
    compradorVenda: isVenda ? emptyToNull(form.compradorVenda) : null,
    documentoCompradorVenda: isVenda ? normalizeCpfCnpjOrNull(form.documentoCompradorVenda) : null,
    vendaConfirmada: isVenda ? Boolean(form.vendaConfirmada) : true,
    resolvido: form.status === 'EM_TESTE' && !isVenda ? form.resolvido : null,
    observacoes: emptyToNull(form.observacoes)
  };

  return payload;
}

function toFormState(data) {
  return {
    ...initialForm,
    ...data,
    dataFinalizacao: toDateInputValue(data.dataFinalizacao),
    numeroSerie: data.numeroSerie || '',
    equipe: data.equipe || '',
    protocolo: data.protocolo || '',
    cidade: data.cidade || '',
    motivo: data.motivo || '',
    valorVenda: data.valorVenda || '',
    compradorVenda: data.compradorVenda || '',
    documentoCompradorVenda: data.documentoCompradorVenda || '',
    vendaConfirmada: data.vendaConfirmada ?? true,
    resolvido: data.resolvido ?? '',
    observacoes: data.observacoes || ''
  };
}

function emptyToNull(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function parseSerialNumbers(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCpfCnpjOrNull(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeModelName(value) {
  return normalizeSearchName(value);
}

function normalizeSearchName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export default EquipmentFormPage;
