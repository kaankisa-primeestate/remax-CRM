import { digitsOnly, formatThousands } from '../utils/money';

// Kullanicinin yazdigi rakamlari otomatik olarak binlik ayraciyla (nokta)
// gosterir (ornek: 2800000 -> 2.800.000). Disariya (onChange) her zaman
// SADECE rakamlardan olusan ham metni gonderir, form state'i hep temiz kalir.
export default function MoneyInput({ value, onChange, placeholder, style, ...rest }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatThousands(value)}
      onChange={(e) => onChange(digitsOnly(e.target.value))}
      placeholder={placeholder}
      style={style}
      {...rest}
    />
  );
}
