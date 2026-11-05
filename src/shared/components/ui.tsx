import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-[var(--color-rose)] mt-1.5">{error}</span>
      ) : (
        hint && <span className="block text-xs text-[var(--color-muted)] mt-1.5">{hint}</span>
      )}
    </label>
  );
}

// Minimal field treatment: no visible border at rest (the filled
// surface-alt background does the framing), a violet border only on focus.
export const FOCUS_RING = 'focus:border-[var(--color-primary)]';
const FIELD_BASE =
  'w-full bg-[var(--color-surface-alt)] border border-transparent rounded-xl px-3 py-2.5 text-base sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]/70 outline-none transition-colors';
// text-base on phones: iOS zooms into any focused field under 16px.

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${FIELD_BASE} ${FOCUS_RING} ${props.className ?? ''}`} />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`${FIELD_BASE} resize-none ${FOCUS_RING} ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${FIELD_BASE} ${FOCUS_RING} ${props.className ?? ''}`} />
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md';

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className: string): string {
  const styles = {
    primary: 'bg-brand text-white shadow-[var(--shadow-sm)] lift',
    soft: 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20',
    ghost:
      'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50',
    danger: 'bg-transparent text-[var(--color-rose)] hover:bg-[var(--color-rose)]/10',
  }[variant];
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }[size];
  return `inline-flex items-center justify-center gap-1.5 rounded-xl font-medium no-underline transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${sizes} ${styles} ${className}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" {...props} className={buttonClasses(variant, size, className)} />;
}

// A router link that looks like a Button (a <button> inside an <a> is invalid HTML).
export function LinkButton({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link {...props} className={buttonClasses(variant, size, className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 shrink-0 rounded-full transition-colors ${
          checked
            ? 'bg-brand'
            : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-[var(--color-ink)]">{label}</span>
    </label>
  );
}

// Two or more mutually exclusive options as pill buttons (gender, list type...).
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-alt)]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-brand text-white shadow-[var(--shadow-sm)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Small colored pill. `color` is a CSS color (normally a var(--color-*)).
export function Badge({
  color = 'var(--color-muted)',
  children,
  className = '',
}: {
  color?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      {children}
    </span>
  );
}

// Inline message block (e.g. "you're not linked yet").
export function Alert({
  tone = 'rose',
  children,
  className = '',
}: {
  tone?: 'rose' | 'primary' | 'teal';
  children: ReactNode;
  className?: string;
}) {
  const color = `var(--color-${tone})`;
  return (
    <div
      role={tone === 'rose' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-sm text-[var(--color-ink)] ${className}`}
      style={{
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {children}
    </div>
  );
}

// Small "?" badge that shows an explanation via the browser's native tooltip.
export function HelpIcon({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-[var(--color-muted)] text-[var(--color-muted)] text-[9px] leading-none cursor-help shrink-0 hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
    >
      ?
    </span>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="anim-spin shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="anim-fade-up text-center px-4 py-12 sm:py-16 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/40">
      {icon && (
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {icon}
        </div>
      )}
      <p className="font-display text-[var(--color-ink)] text-base font-semibold">{title}</p>
      {description && (
        <p className="text-[var(--color-muted)] text-sm mt-1 max-w-xs mx-auto">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Card({
  interactive = false,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      {...props}
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-[var(--shadow-sm)] ${
        interactive ? 'lift hover:border-[var(--color-primary)]/40' : ''
      } ${className}`}
    />
  );
}

// Page heading: title (may carry an emoji, like the old app), optional
// subtitle and an action on the right.
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-muted)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
