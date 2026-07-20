import { useEffect, useRef, useState } from 'react';

export function TextField({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className={`field ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

export function SelectField({ label, error, options, placeholder = 'Selecione', ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className={`field ${error ? 'border-red-400' : ''}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

export function MultiSelectField({ label, value = [], error, options, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedLabels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggle(optionValue) {
    if (selected.includes(optionValue)) {
      onChange(selected.filter((item) => item !== optionValue));
      return;
    }

    onChange([...selected, optionValue]);
  }

  return (
    <div className="relative block" ref={wrapperRef}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        {selected.length > 0 && (
          <button
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange([]);
            }}
          >
            Limpar
          </button>
        )}
      </div>
      <button
        className={`field flex items-center justify-between gap-2 text-left ${error ? 'border-red-400' : ''}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`truncate ${selected.length > 0 ? 'text-ink' : 'text-slate-500'}`}>
          {selected.length > 0 ? selectedLabels.join(', ') : 'Selecione'}
        </span>
        <span className="text-xs text-slate-500" aria-hidden="true">v</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-white p-2 shadow-lg">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-semibold text-slate-700 hover:bg-panel"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </div>
  );
}

export function SearchableMultiSelectField({
  label,
  value = [],
  error,
  options,
  placeholder = 'Digite para buscar',
  emptyText = 'Nenhum item encontrado.',
  allowCustom = false,
  onChange
}) {
  const selected = Array.isArray(value) ? value : [];
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const normalizedQuery = normalizeSearch(query);
  const filteredOptions = options
    .filter((option) => !selected.includes(option.value))
    .filter((option) => !normalizedQuery || normalizeSearch(option.label).includes(normalizedQuery))
    .slice(0, 12);
  const hasExactOption = options.some((option) => normalizeSearch(option.label) === normalizedQuery);
  const canAddCustom = allowCustom && query.trim() && !hasExactOption && !selected.some((item) => normalizeSearch(item) === normalizedQuery);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function addValue(optionValue) {
    if (selected.includes(optionValue)) return;
    onChange([...selected, optionValue]);
    setQuery('');
    setOpen(false);
  }

  function removeValue(optionValue) {
    onChange(selected.filter((item) => item !== optionValue));
  }

  function addCustomValue() {
    const customValue = query.trim();
    if (!customValue) return;
    onChange([...selected, customValue]);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative block" ref={wrapperRef}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        {selected.length > 0 && (
          <button
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
            type="button"
            onClick={() => onChange([])}
          >
            Limpar
          </button>
        )}
      </div>

      <div className={`min-h-10 rounded-md border bg-white px-2 py-1.5 ${error ? 'border-red-400' : 'border-line'}`}>
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-panel px-2 py-1 text-xs font-bold text-ink"
            >
              <span className="truncate">{item}</span>
              <button
                className="text-slate-500 hover:text-slate-800"
                type="button"
                onClick={() => removeValue(item)}
                aria-label={`Remover ${item}`}
              >
                x
              </button>
            </span>
          ))}
          <input
            className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm font-semibold text-ink outline-none placeholder:text-slate-400"
            value={query}
            autoComplete="off"
            placeholder={selected.length > 0 ? 'Adicionar outro' : placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canAddCustom) {
                event.preventDefault();
                addCustomValue();
              }
            }}
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-line bg-white py-1 shadow-lg">
          {filteredOptions.length === 0 && !canAddCustom && (
            <div className="px-3 py-2 text-sm text-slate-500">{emptyText}</div>
          )}

          {canAddCustom && (
            <button
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-panel"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={addCustomValue}
            >
              Usar "{query.trim()}"
            </button>
          )}

          {filteredOptions.map((option) => (
            <button
              key={option.value}
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-panel"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addValue(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </div>
  );
}

export function TextAreaField({ label, error, inputRef, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea ref={inputRef} className={`field-area ${error ? 'border-red-400' : ''}`} {...props} />
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
