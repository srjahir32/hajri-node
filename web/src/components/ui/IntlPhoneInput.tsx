'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

/** `<input type="tel">` upgraded with intl-tel-input (separate dial code), as the Laravel forms do. The instance is on `input.__iti`. */
export function IntlPhoneInput({ id, name, className, placeholder, maxLength = 16, defaultValue, initialCountry = 'in', defaultDial }: { id: string; name?: string; className?: string; placeholder?: string; maxLength?: number; defaultValue?: string; initialCountry?: string; defaultDial?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let off = false;
    let inst: any;
    (async () => {
      const mod: any = await import('intl-tel-input');
      const factory = mod.default ?? mod;
      if (off || !ref.current) return;
      inst = factory(ref.current, { initialCountry, separateDialCode: true });
      (ref.current as any).__iti = inst;
      if (defaultDial) {
        const cc = inst.getSelectedCountryData?.();
        if (!cc || String(cc.dialCode) !== defaultDial) inst.setNumber(`+${defaultDial}${defaultValue ?? ''}`);
      }
    })();
    return () => {
      off = true;
      inst?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <input
      ref={ref}
      type="tel"
      id={id}
      name={name ?? id}
      className={className}
      placeholder={placeholder}
      maxLength={maxLength}
      defaultValue={defaultValue}
      onInput={(e) => {
        e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
      }}
    />
  );
}
