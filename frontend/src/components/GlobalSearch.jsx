import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '../api/customers';
import { propertiesApi } from '../api/properties';
import { usersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_CHARS = 2;
const MAX_PER_GROUP = 5;

// Ust bardaki genel arama: musteri, portfoy ve (sadece Broker icin) danisman
// isimlerinde arar. Backend'de zaten var olan /customers?search= ve
// /properties?search= parametrelerini kullanir; danisman arama roster
// listesi (isim listesi) uzerinde istemci tarafinda yapilir -- ayri bir
// backend endpoint gerektirmez, zaten az sayida danisman var.
export default function GlobalSearch() {
  const { isBroker } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerResults, setCustomerResults] = useState([]);
  const [propertyResults, setPropertyResults] = useState([]);
  const [agentResults, setAgentResults] = useState([]);
  const [roster, setRoster] = useState([]);
  const wrapperRef = useRef(null);

  // Danisman roster'i bir kere yukleniyor, arama sirasinda tekrar tekrar
  // istek atilmiyor (isim listesi zaten kucuk ve nadiren degisir).
  useEffect(() => {
    if (isBroker) {
      usersApi.listAgentRoster().then(setRoster).catch(() => setRoster([]));
    }
  }, [isBroker]);

  const runSearch = useCallback(
    async (q) => {
      setLoading(true);
      try {
        const [customers, properties] = await Promise.all([
          customersApi.list({ search: q }).catch(() => []),
          propertiesApi.list({ search: q }).catch(() => []),
        ]);
        setCustomerResults(customers.slice(0, MAX_PER_GROUP));
        setPropertyResults(properties.slice(0, MAX_PER_GROUP));
        if (isBroker) {
          const lower = q.toLocaleLowerCase('tr-TR');
          setAgentResults(
            roster.filter((a) => a.name?.toLocaleLowerCase('tr-TR').includes(lower)).slice(0, MAX_PER_GROUP),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [isBroker, roster],
  );

  // Yazarken hafif bir debounce ile arama -- her tus vurusunda istek
  // atilmasin diye.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setCustomerResults([]);
      setPropertyResults([]);
      setAgentResults([]);
      setLoading(false);
      return;
    }
    const timeout = setTimeout(() => runSearch(trimmed), 300);
    return () => clearTimeout(timeout);
  }, [query, runSearch]);

  // Disariya tiklayinca veya Escape'e basinca sonuc panelini kapat.
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function goTo(path) {
    setOpen(false);
    setQuery('');
    navigate(path);
  }

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= MIN_CHARS;
  const totalResults = customerResults.length + propertyResults.length + agentResults.length;

  return (
    <div className="app-topbar__search" ref={wrapperRef}>
      <span className="app-topbar__search-icon">🔍</span>
      <input
        type="text"
        placeholder="İlan, danışman, müşteri ara…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && hasQuery && (
        <div className="global-search__panel">
          {loading ? (
            <div className="global-search__empty">Aranıyor…</div>
          ) : totalResults === 0 ? (
            <div className="global-search__empty">"{trimmed}" için sonuç bulunamadı.</div>
          ) : (
            <>
              {customerResults.length > 0 && (
                <div className="global-search__group">
                  <div className="global-search__group-title">Müşteriler</div>
                  {customerResults.map((c) => (
                    <button
                      type="button"
                      key={`c-${c.id}`}
                      className="global-search__item"
                      onClick={() => goTo(`/musteriler/${c.id}`)}
                    >
                      <span className="global-search__item-title">{c.firstName} {c.lastName}</span>
                      <span className="global-search__item-meta">{c.phone || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {propertyResults.length > 0 && (
                <div className="global-search__group">
                  <div className="global-search__group-title">Portföyler</div>
                  {propertyResults.map((p) => (
                    <button
                      type="button"
                      key={`p-${p.id}`}
                      className="global-search__item"
                      onClick={() => goTo(`/portfoyler/${p.id}`)}
                    >
                      <span className="global-search__item-title">{p.title}</span>
                      <span className="global-search__item-meta">{p.district || ''}</span>
                    </button>
                  ))}
                </div>
              )}
              {agentResults.length > 0 && (
                <div className="global-search__group">
                  <div className="global-search__group-title">Danışmanlar</div>
                  {agentResults.map((a) => (
                    <button
                      type="button"
                      key={`a-${a.id}`}
                      className="global-search__item"
                      onClick={() => goTo('/danismanlar')}
                    >
                      <span className="global-search__item-title">{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
