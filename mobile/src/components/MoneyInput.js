import { TextInput } from 'react-native';
import { digitsOnly, formatThousands } from '../utils/money';

// Kullanicinin yazdigi rakamlari otomatik olarak binlik ayraciyla (nokta)
// gosterir. Disariya (onChangeText) her zaman SADECE rakamlardan olusan
// ham metni gonderir, form state'i hep temiz kalir.
export default function MoneyInput({ value, onChangeText, style, ...rest }) {
  return (
    <TextInput
      value={formatThousands(value)}
      onChangeText={(text) => onChangeText(digitsOnly(text))}
      keyboardType="numeric"
      style={style}
      {...rest}
    />
  );
}
