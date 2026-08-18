import { Bold, Edit, List, LoaderCircle, Plus, Save, Search, Type, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ErrorAlert from './ErrorAlert.jsx';
import api, { getBackendMessage } from '../lib/api';
import logoRbt from '../assets/logo-rbt-vermelho.png';

const emptyForm = {
  titulo: '',
  conteudo: '',
  ordem: ''
};

function GuideModal({ canManage, onClose }) {
  const [sections, setSections] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const contentInputRef = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    loadSections();
  }, []);

  const visibleSections = sections.filter((section) => !isCoverSection(section));
  const filteredSections = searchTerm
    ? visibleSections.filter((section) => {
      const term = normalizeSearch(searchTerm);
      return normalizeSearch(`${section.titulo} ${section.conteudo}`).includes(term);
    })
    : visibleSections;
  const selectedSection = filteredSections.find((section) => section.id === selectedId) || filteredSections[0] || null;

  useEffect(() => {
    if (!selectedSection || editing || creating) return;
    setSelectedId(selectedSection.id);
  }, [selectedSection, editing, creating]);

  useEffect(() => {
    if (!selectedId || editing || creating) return;

    window.requestAnimationFrame(() => {
      sectionRefs.current[selectedId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }, [selectedId, editing, creating]);

  async function loadSections() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/guia');
      const visibleData = data.filter((section) => !isCoverSection(section));
      setSections(data);
      setSelectedId((current) => current || visibleData[0]?.id || '');
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(section) {
    setCreating(false);
    setEditing(true);
    setForm({
      titulo: section.titulo,
      conteudo: section.conteudo,
      ordem: section.ordem
    });
  }

  function startCreate() {
    setSelectedId('');
    setEditing(false);
    setCreating(true);
    setForm({
      ...emptyForm,
      ordem: sections.length + 1
    });
  }

  function cancelForm() {
    setEditing(false);
    setCreating(false);
    setForm(emptyForm);
    setError('');
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyTextFormat(type) {
    const input = contentInputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentText = form.conteudo || '';
    const selectedText = currentText.slice(start, end);
    let nextText = currentText;
    let nextStart = start;
    let nextEnd = end;

    if (type === 'bold') {
      const fallback = 'texto em negrito';
      const text = selectedText || fallback;
      const formatted = `**${text}**`;
      nextText = `${currentText.slice(0, start)}${formatted}${currentText.slice(end)}`;
      nextStart = start + 2;
      nextEnd = start + 2 + text.length;
    }

    if (type === 'list') {
      const text = selectedText || 'item da lista';
      const formatted = text
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          return trimmed.startsWith('- ') ? trimmed : `- ${trimmed || 'item da lista'}`;
        })
        .join('\n');
      nextText = `${currentText.slice(0, start)}${formatted}${currentText.slice(end)}`;
      nextStart = start;
      nextEnd = start + formatted.length;
    }

    if (type === 'large') {
      const fallback = 'texto maior';
      const text = selectedText || fallback;
      const formatted = text
        .split('\n')
        .map((line) => `{{maior:${line || fallback}}}`)
        .join('\n');
      nextText = `${currentText.slice(0, start)}${formatted}${currentText.slice(end)}`;
      nextStart = start + 8;
      nextEnd = start + 8 + text.length;
    }

    setForm((current) => ({ ...current, conteudo: nextText }));

    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextStart, nextEnd);
    });
  }

  async function saveSection() {
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      titulo: form.titulo,
      conteudo: form.conteudo,
      ordem: form.ordem === '' ? undefined : Number(form.ordem)
    };

    try {
      const { data } = creating
        ? await api.post('/guia', payload)
        : await api.patch(`/guia/${selectedSection.id}`, payload);

      const nextSections = creating
        ? [...sections, data]
        : sections.map((section) => (section.id === data.id ? data : section));

      const sorted = nextSections.sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
      setSections(sorted);
      setSelectedId(data.id);
      setEditing(false);
      setCreating(false);
      setForm(emptyForm);
      setNotice('Seção salva com sucesso.');
    } catch (requestError) {
      setError(getBackendMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const showingForm = editing || creating;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/60 p-4">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-line bg-white shadow-xl">
        <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img className="h-12 w-16 object-contain" src={logoRbt} alt="RBT Internet" />
            <div>
              <h2 className="text-lg font-bold text-ink">Guia do Laboratório</h2>
              <p className="text-sm text-slate-500">Testes e gestão de equipamentos de rede</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-56 flex-1 md:min-w-72 md:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} aria-hidden="true" />
              <input
                className="field h-9 pl-9"
                type="search"
                placeholder="Buscar seção ou palavra"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            {canManage && (
              <>
                <button className="btn btn-secondary" type="button" onClick={startCreate}>
                  <Plus size={16} aria-hidden="true" />
                  Nova seção
                </button>
                {selectedSection && !showingForm && (
                  <button className="btn btn-secondary" type="button" onClick={() => startEdit(selectedSection)}>
                    <Edit size={16} aria-hidden="true" />
                    Editar
                  </button>
                )}
              </>
            )}
            <button className="btn btn-secondary h-9 w-9 px-0" type="button" onClick={onClose} title="Fechar" aria-label="Fechar">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[18rem_1fr]">
          <aside className="border-b border-line bg-panel p-3 md:border-b-0 md:border-r">
            <div className="max-h-64 space-y-1 overflow-auto md:max-h-[72vh]">
              {loading && <div className="px-3 py-2 text-sm text-slate-500">Carregando guia...</div>}
              {!loading && filteredSections.map((section) => (
                <button
                  key={section.id}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold ${selectedSection?.id === section.id && !creating ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-white'}`}
                  type="button"
                  onClick={() => {
                    setSelectedId(section.id);
                    cancelForm();
                  }}
                >
                  {section.titulo}
                </button>
              ))}
              {!loading && filteredSections.length === 0 && (
                <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-500">
                  Nenhuma seção encontrada.
                </div>
              )}
            </div>
          </aside>

          <main className="min-h-0 overflow-auto p-4">
            <ErrorAlert message={error} />
            {notice && (
              <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                {notice}
              </div>
            )}

            {showingForm ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="label">Título</span>
                  <input className="field" value={form.titulo} onChange={(event) => updateField('titulo', event.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Ordem</span>
                  <input className="field max-w-40" type="number" min="0" value={form.ordem} onChange={(event) => updateField('ordem', event.target.value)} />
                </label>
                <label className="block">
                  <span className="label">Conteúdo</span>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button className="btn btn-secondary h-8 px-3 text-xs" type="button" onClick={() => applyTextFormat('bold')}>
                      <Bold size={14} aria-hidden="true" />
                      Negrito
                    </button>
                    <button className="btn btn-secondary h-8 px-3 text-xs" type="button" onClick={() => applyTextFormat('list')}>
                      <List size={14} aria-hidden="true" />
                      Lista
                    </button>
                    <button className="btn btn-secondary h-8 px-3 text-xs" type="button" onClick={() => applyTextFormat('large')}>
                      <Type size={14} aria-hidden="true" />
                      Fonte maior
                    </button>
                  </div>
                  <textarea
                    ref={contentInputRef}
                    className="field min-h-[26rem]"
                    value={form.conteudo}
                    onChange={(event) => updateField('conteudo', event.target.value)}
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <button className="btn btn-secondary" type="button" onClick={cancelForm} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="btn btn-primary" type="button" onClick={saveSection} disabled={saving}>
                    {saving ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                    Salvar
                  </button>
                </div>
              </div>
            ) : filteredSections.length > 0 ? (
              <div className="space-y-4">
                {filteredSections.map((section) => (
                  <article
                    key={section.id}
                    ref={(element) => {
                      if (element) {
                        sectionRefs.current[section.id] = element;
                      }
                    }}
                    className={`rounded-lg border bg-panel p-4 ${selectedSection?.id === section.id ? 'border-slate-400' : 'border-line'}`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-ink">{section.titulo}</h3>
                      {canManage && (
                        <button
                          className="btn btn-secondary h-8 px-3 text-xs"
                          type="button"
                          onClick={() => {
                            setSelectedId(section.id);
                            startEdit(section);
                          }}
                        >
                          <Edit size={14} aria-hidden="true" />
                          Editar
                        </button>
                      )}
                    </div>
                    <div className="text-sm leading-6 text-slate-700">
                      {renderGuideContent(section.conteudo)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-panel p-4 text-sm text-slate-500">
                Nenhuma seção cadastrada.
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
}

function isCoverSection(section) {
  const title = String(section?.titulo || '').trim().toLowerCase();
  const content = String(section?.conteudo || '').trim().toLowerCase();
  return title === 'logo da empresa' || content === 'guia completo de testes e gestao de equipamentos de rede';
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function renderGuideContent(content) {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let listItems = [];

  function flushList(key) {
    if (listItems.length === 0) return;

    blocks.push(
      <ul key={`list-${key}`} className="my-2 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={`${key}-${index}`}>{renderInlineFormat(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);

    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList(index);

    if (!line.trim()) {
      blocks.push(<div key={`blank-${index}`} className="h-2" />);
      return;
    }

    blocks.push(
      <p key={`line-${index}`} className="mb-1">
        {renderInlineFormat(line)}
      </p>
    );
  });

  flushList('end');
  return blocks;
}

function renderInlineFormat(text) {
  return String(text || '').split(/(\*\*[^*]+\*\*|\{\{maior:[^}]+\}\})/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('{{maior:') && part.endsWith('}}')) {
      return (
        <span key={index} className="text-base font-semibold text-ink">
          {part.slice(8, -2)}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export default GuideModal;
