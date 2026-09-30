import * as LabelPrimitive from '@radix-ui/react-label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

// ---------- Card ----------
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn('rounded-2xl border bg-card text-card-foreground shadow-sm', className)} {...props} />;
});
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-xl font-semibold', className)} {...props} />;
}
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}

// ---------- Inputs ----------
const fieldBase =
  'w-full rounded-xl border border-input bg-background/70 px-3.5 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-destructive';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, 'h-11', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-[110px] py-2.5 leading-relaxed', className)} {...props} />;
});

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, 'h-11 appearance-none bg-[length:16px] pr-9', className)} {...props}>
      {children}
    </select>
  );
});

export const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  function Label({ className, ...props }, ref) {
    return <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />;
  },
);

/** Label + control + hint/error, wired for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            {' '}
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Checkbox = forwardRef<ElementRef<typeof CheckboxPrimitive.Root>, ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          'peer mt-0.5 h-5 w-5 shrink-0 rounded-md border border-input bg-background shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

export const Switch = forwardRef<ElementRef<typeof SwitchPrimitive.Root>, ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  function Switch({ className, ...props }, ref) {
    return (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
      </SwitchPrimitive.Root>
    );
  },
);

export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, ComponentPropsWithoutRef<typeof SliderPrimitive.Root>>(
  function Slider({ className, ...props }, ref) {
    const count = (props.value ?? props.defaultValue ?? [0]).length;
    return (
      <SliderPrimitive.Root ref={ref} className={cn('relative flex w-full touch-none select-none items-center py-2', className)} {...props}>
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-saffron-deep to-saffron" />
        </SliderPrimitive.Track>
        {Array.from({ length: count }, (_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={props['aria-label'] ? `${props['aria-label']}${count > 1 ? (i === 0 ? ' minimum' : ' maximum') : ''}` : undefined}
            className="block h-6 w-6 rounded-full border-2 border-saffron bg-background shadow transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);

// ---------- Badge ----------
const badgeVariants = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary/10 text-primary dark:bg-primary/15',
      gold: 'border-saffron/40 bg-saffron/15 text-saffron-deep dark:text-saffron-light',
      diamond: 'border-diamond/40 bg-diamond/15 text-diamond-deep dark:text-diamond',
      outline: 'text-foreground',
      success: 'border-transparent bg-success/15 text-success',
      warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300',
      destructive: 'border-transparent bg-destructive/15 text-destructive',
      muted: 'border-transparent bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ---------- Skeleton ----------
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton', className)} {...props} />;
}

// ---------- Progress ring ----------
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <span
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={label ?? `${Math.round(pct * 100)}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}
        />
        <defs>
          <linearGradient id="ring-gold" x1="0" x2="1">
            <stop offset="0" stopColor="#B7832A" />
            <stop offset="1" stopColor="#F1C66E" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums">{Math.round(pct * 100)}%</span>
    </span>
  );
}
