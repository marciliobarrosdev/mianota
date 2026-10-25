import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import {
  formatCentsBRL,
  moneyError,
  parseBRLToCents,
  sanitizeMoneyTyping,
  type MoneyValidationOptions,
} from "@/lib/money";

type MoneyFieldOptions = MoneyValidationOptions & {
  /** Valor em centavos inteiros (null = vazio). */
  cents: number | null;
  /** Recebe centavos inteiros válidos, ou null quando vazio/inválido. */
  onChange: (cents: number | null) => void;
};

/**
 * Liga qualquer <input> ao padrão monetário pt-BR. Exibe "R$ 49,00",
 * aceita digitação natural e devolve sempre centavos inteiros.
 */
export function useMoneyField({ cents, onChange, ...options }: MoneyFieldOptions) {
  const [text, setText] = useState(() => (cents == null ? "" : formatCentsBRL(cents)));
  const [touched, setTouched] = useState(false);
  const lastEmitted = useRef<number | null>(cents);

  // Valor alterado por fora (ex.: abrir outro registro): reflete na tela.
  useEffect(() => {
    if (cents === lastEmitted.current) return;
    lastEmitted.current = cents;
    setText(cents == null ? "" : formatCentsBRL(cents));
  }, [cents]);

  const error = moneyError(text, options);

  function emit(next: number | null) {
    lastEmitted.current = next;
    onChange(next);
  }

  return {
    error: touched ? error : null,
    rawError: error,
    inputProps: {
      value: text,
      inputMode: "decimal" as const,
      autoComplete: "off",
      placeholder: "R$ 0,00",
      "aria-invalid": touched && error ? true : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const clean = sanitizeMoneyTyping(event.target.value, options.allowNegative);
        const display = clean
          ? clean.startsWith("-")
            ? `-R$ ${clean.slice(1)}`
            : `R$ ${clean}`
          : "";
        setText(display);
        const parsed = parseBRLToCents(clean);
        emit(moneyError(display, options) ? null : parsed);
      },
      onBlur: () => {
        setTouched(true);
        const parsed = parseBRLToCents(text);
        if (parsed !== null && !moneyError(text, options)) setText(formatCentsBRL(parsed));
      },
    },
  };
}

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> &
  MoneyFieldOptions & { showError?: boolean };

export function MoneyInput({
  cents,
  onChange,
  required,
  allowNegative,
  allowZero,
  maxCents,
  showError = true,
  className,
  onBlur,
  ...rest
}: MoneyInputProps) {
  const field = useMoneyField({ cents, onChange, required, allowNegative, allowZero, maxCents });
  return (
    <div className="space-y-1">
      <Input
        {...rest}
        {...field.inputProps}
        className={className}
        onBlur={(event) => {
          field.inputProps.onBlur();
          onBlur?.(event);
        }}
      />
      {showError && field.error && (
        <p className="text-[11px] font-medium text-destructive">{field.error}</p>
      )}
    </div>
  );
}
