import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

export const E164_RE = /^\+[1-9]\d{6,14}$/;

export function toE164(national: string, country: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(national, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export function isE164(value: string): boolean {
  if (!E164_RE.test(value)) return false;
  const parsed = parsePhoneNumberFromString(value);
  return Boolean(parsed?.isValid());
}

export interface CountryOption {
  code: CountryCode;
  dial: string;
  name: string;
  flag: string;
}

function flag(code: string): string {
  return code.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

let cache: CountryOption[] | null = null;

export function countryOptions(): CountryOption[] {
  if (cache) return cache;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    names = null;
  }
  const priority: CountryCode[] = ['IN', 'US', 'GB', 'AE', 'SG', 'AU', 'CA', 'NP'];
  const all = getCountries().map((code) => ({
    code,
    dial: `+${getCountryCallingCode(code)}`,
    name: names?.of(code) ?? code,
    flag: flag(code),
  }));
  all.sort((a, b) => {
    const pa = priority.indexOf(a.code);
    const pb = priority.indexOf(b.code);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return a.name.localeCompare(b.name);
  });
  cache = all;
  return all;
}
