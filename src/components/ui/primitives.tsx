import React from 'react';
import { ChevronDownIcon, LoaderIcon, SearchIcon, TriangleAlertIcon } from 'lucide-react';

/* ── Surfaces ── */

export function Panel({
  title,
  action,
  children,
  className = '',
  bodyClassName = '',
  subtitle
}: {title?: string;subtitle?: string;action?: React.ReactNode;children: React.ReactNode;className?: string;bodyClassName?: string;}) {
  return (
    <section className={`border border-win-border bg-win-surface shadow-win rounded-win ${className}`}>
      {title &&
      <header className="flex items-center justify-between gap-3 border-b border-win-border bg-win-panel px-3 py-2">
          <div>
            <h2 className="text-[13px] font-semibold text-win-text">{title}</h2>
            {subtitle && <p className="text-2xs text-win-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      }
      <div className={bodyClassName || 'p-3'}>{children}</div>
    </section>);

}

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  onClick
}: {label: string;value: string | number;hint?: string;tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'warning';icon?: React.ReactNode;onClick?: () => void;}) {
  const accentBar =
  tone === 'accent' ?
  'bg-win-accent' :
  tone === 'danger' ?
  'bg-state-dangerFg' :
  tone === 'success' ?
  'bg-state-successFg' :
  tone === 'warning' ?
  'bg-state-warnFg' :
  'bg-win-borderStrong';
  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`group flex w-full items-stretch gap-3 border border-win-border bg-win-surface text-left shadow-win rounded-win ${
      onClick ? 'transition-colors duration-150 ease-out hover:bg-win-panel' : ''}`
      }>
      
      <span className={`w-1 shrink-0 ${accentBar}`} aria-hidden="true" />
      <span className="flex flex-1 items-center justify-between gap-3 px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-2xs uppercase tracking-wide text-win-muted">{label}</span>
          <span className="block text-xl font-semibold leading-tight text-win-text">{value}</span>
          {hint && <span className="mt-0.5 block truncate text-2xs text-win-faint">{hint}</span>}
        </span>
        {icon && <span className="shrink-0 text-win-faint">{icon}</span>}
      </span>
    </Wrapper>);

}

/* ── Contrôles ── */

export function Button({
  children,
  variant = 'default',
  size = 'md',
  icon,
  onClick,
  type = 'button',
  disabled,
  title
}: {children?: React.ReactNode;variant?: 'default' | 'primary' | 'ghost' | 'danger';size?: 'sm' | 'md';icon?: React.ReactNode;onClick?: () => void;type?: 'button' | 'submit';disabled?: boolean;title?: string;}) {
  const variants = {
    default: 'bg-win-surface border-win-borderStrong text-win-text hover:bg-win-panel active:bg-win-sunken',
    primary: 'bg-win-accent border-win-accent text-white hover:bg-win-accentHover active:bg-[#17325C]',
    ghost: 'bg-transparent border-transparent text-win-muted hover:bg-win-sunken hover:text-win-text',
    danger: 'bg-white border-[#D9A3A3] text-state-dangerFg hover:bg-state-dangerBg'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 border font-medium rounded-win transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${
      size === 'sm' ? 'h-7 px-2 text-2xs' : 'h-8 px-3 text-xs'} ${
      variants[variant]}`}>
      
      {icon}
      {children}
    </button>);

}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className = ''
}: {value: string;onChange: (v: string) => void;placeholder?: string;className?: string;}) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-win-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-8 w-full border border-win-borderStrong bg-white pl-7 pr-2 text-xs text-win-text placeholder:text-win-faint rounded-win focus:border-win-accent focus:outline-none" />
      
    </div>);

}

export interface Option {
  value: string;
  label: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  className = ''
}: {label?: string;value: string;onChange: (v: string) => void;options: Option[];className?: string;}) {
  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      {label && <span className="text-2xs font-medium uppercase tracking-wide text-win-muted">{label}</span>}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 appearance-none border border-win-borderStrong bg-white pl-2 pr-7 text-xs text-win-text rounded-win focus:border-win-accent focus:outline-none">
          
          {options.map((o) =>
          <option key={o.value} value={o.value}>
              {o.label}
            </option>
          )}
        </select>
        <ChevronDownIcon size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-win-muted" />
      </span>
    </label>);

}

export function SegmentedControl({
  value,
  onChange,
  options
}: {value: string;onChange: (v: string) => void;options: Option[];}) {
  return (
    <div className="inline-flex border border-win-borderStrong bg-win-surface rounded-win" role="tablist">
      {options.map((o) =>
      <button
        key={o.value}
        type="button"
        role="tab"
        aria-selected={o.value === value}
        onClick={() => onChange(o.value)}
        className={`h-8 px-3 text-xs font-medium transition-colors duration-150 ease-out ${
        o.value === value ? 'bg-win-accent text-white' : 'text-win-muted hover:bg-win-panel hover:text-win-text'}`
        }>
        
          {o.label}
        </button>
      )}
    </div>);

}

export function Toolbar({ children }: {children: React.ReactNode;}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-win-border bg-win-panel px-3 py-2 shadow-win rounded-win">
      {children}
    </div>);

}

export function Divider() {
  return <span className="mx-1 h-6 w-px bg-win-border" aria-hidden="true" />;
}

export function ProgressBar({ value, tone = 'accent' }: {value: number;tone?: 'accent' | 'success' | 'warning' | 'danger';}) {
  const colors = {
    accent: 'bg-win-accent',
    success: 'bg-state-successFg',
    warning: 'bg-state-warnFg',
    danger: 'bg-state-dangerFg'
  };
  return (
    <div className="h-1.5 w-full overflow-hidden bg-win-sunken rounded-win" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>);

}

export function EmptyState({ message, icon }: {message: string;icon?: React.ReactNode;}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="text-win-faint">{icon}</span>
      <p className="text-xs text-win-muted">{message}</p>
    </div>);

}

export function FieldRow({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-win-border py-1.5 last:border-b-0">
      <dt className="shrink-0 text-2xs uppercase tracking-wide text-win-muted">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-medium text-win-text">{children}</dd>
    </div>);

}

export function Avatar({ initiales, tone = 'accent' }: {initiales: string;tone?: 'accent' | 'neutral';}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center text-2xs font-semibold rounded-win ${
      tone === 'accent' ? 'bg-win-accentSoft text-win-accent' : 'bg-win-sunken text-win-muted'}`
      }>
      
      {initiales}
    </span>);

}

/* ── États de chargement / erreur (données backend) ── */

export function LoadingState({ message = 'Chargement des données…' }: {message?: string;}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <LoaderIcon size={20} className="animate-spin text-win-faint" />
      <p className="text-xs text-win-muted">{message}</p>
    </div>);

}

export function ErrorState({ message, onRetry }: {message: string;onRetry?: () => void;}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <TriangleAlertIcon size={20} className="text-state-dangerFg" />
      <p className="text-xs text-state-dangerFg">{message}</p>
      {onRetry && <Button size="sm" onClick={onRetry}>Réessayer</Button>}
    </div>);

}

/* ── Champs de saisie (modules de création) ── */

const INPUT_CLASS =
'h-8 w-full border border-win-borderStrong bg-white px-2 text-xs text-win-text placeholder:text-win-faint rounded-win focus:border-win-accent focus:outline-none';

export function Field({
  label,
  hint,
  required,
  children
}: {label: string;hint?: string;required?: boolean;children: React.ReactNode;}) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-win-muted">
        {label}
        {required && <span className="text-state-dangerFg"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-win-faint">{hint}</span>}
    </label>);

}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  hint
}: {label: string;value: string;onChange: (v: string) => void;type?: string;placeholder?: string;required?: boolean;hint?: string;}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS} />
      
    </Field>);

}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint
}: {label: string;value: string;onChange: (v: string) => void;placeholder?: string;rows?: number;hint?: string;}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-win-borderStrong bg-white px-2 py-1.5 text-xs text-win-text placeholder:text-win-faint rounded-win focus:border-win-accent focus:outline-none" />
      
    </Field>);

}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  hint
}: {label: string;value: string;onChange: (v: string) => void;options: Option[];required?: boolean;hint?: string;}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_CLASS} appearance-none pr-7`}>
          
          <option value="">—</option>
          {options.map((o) =>
          <option key={o.value} value={o.value}>
              {o.label}
            </option>
          )}
        </select>
        <ChevronDownIcon size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-win-muted" />
      </span>
    </Field>);

}

export function CheckboxField({
  label,
  checked,
  onChange
}: {label: string;checked: boolean;onChange: (v: boolean) => void;}) {
  return (
    <label className="flex items-center gap-2 py-1 text-xs text-win-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#2B5797]" />
      
      {label}
    </label>);

}