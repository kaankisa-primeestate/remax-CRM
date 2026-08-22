import { useState } from 'react';

// Her sifre alaninda tekrar tekrar ayni "goster/gizle" mantigini
// yazmamak icin tek, ortak bir bilesen. Kullanicinin ne yazdigini
// gorebilmesi -- ozellikle yeni bir sifre belirlerken -- yazim
// hatalarini onlemenin en basit, en guvenilir yolu.
export default function PasswordInput({ value, onChange, placeholder, minLength, required, autoFocus, id }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        autoFocus={autoFocus}
        style={{ paddingRight: 38, width: '100%', boxSizing: 'border-box' }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        title={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 15,
          color: 'var(--muted)',
          padding: 4,
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
