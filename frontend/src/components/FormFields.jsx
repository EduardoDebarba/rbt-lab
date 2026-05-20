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

export function TextAreaField({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className={`field-area ${error ? 'border-red-400' : ''}`} {...props} />
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
