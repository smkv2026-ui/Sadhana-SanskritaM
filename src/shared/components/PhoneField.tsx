import type { CountryCode } from 'libphonenumber-js/min';
import { useEffect, useMemo, useState } from 'react';
import { countryOptions, toE164 } from '@/lib/phone';
import { Input, NativeSelect } from '../ui/primitives';

interface Props {
  id: string;
  value: string;
  onChange: (e164: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

function splitE164(value: string): { country: CountryCode; national: string } {
  const opts = countryOptions();
  if (value.startsWith('+')) {
    // Longest dial-code prefix wins (+1 vs +1242 etc.).
    const match = [...opts].sort((a, b) => b.dial.length - a.dial.length).find((o) => value.startsWith(o.dial));
    if (match) return { country: match.code, national: value.slice(match.dial.length) };
  }
  return { country: 'IN', national: value.replace(/^\+/, '') };
}

/** Country picker + national number, emitting E.164 (empty string while invalid). */
export function PhoneField({ id, value, onChange, invalid, describedBy }: Props) {
  const initial = useMemo(() => splitE164(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [national, setNational] = useState(initial.national);
  const options = useMemo(() => countryOptions(), []);

  useEffect(() => {
    onChange(national.trim() ? toE164(national, country) ?? `invalid:${national}` : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, national]);

  return (
    <div className="flex gap-2">
      <label htmlFor={`${id}-cc`} className="sr-only">
        Country code
      </label>
      <NativeSelect id={`${id}-cc`} value={country} onChange={(e) => setCountry(e.target.value as CountryCode)} className="w-[7.5rem] shrink-0" autoComplete="tel-country-code">
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.flag} {o.dial} {o.code}
          </option>
        ))}
      </NativeSelect>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="98765 43210"
        value={national}
        onChange={(e) => setNational(e.target.value.replace(/[^\d\s-]/g, ''))}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
    </div>
  );
}
