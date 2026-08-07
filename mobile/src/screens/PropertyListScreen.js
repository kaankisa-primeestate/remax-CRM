import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesApi, LISTING_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import ChipSelect from '../components/ChipSelect';
import { colors, statusColors } from '../theme';

function Badge({ value, labelMap }) {
  const c = statusColors[value] || statusColors.active;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{labelMap[value] || value}</Text>
    </View>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
  { value: 'sold', label: 'Satıldı' },
  { value: 'rented', label: 'Kiralandı' },
];

export default function PropertyListScreen({ navigation }) {
  const { isBroker } = useAuth();
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  const load = useCallback(
    async (query = search) => {
      const params = {};
      if (query) params.search = query;
      if (isBroker && agentId) params.agentId = agentId;
      if (status) params.status = status;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (minArea) params.minArea = minArea;
      if (maxArea) params.maxArea = maxArea;
      const data = await propertiesApi.list(params);
      setProperties(data);
    },
    [search, isBroker, agentId, status, minPrice, maxPrice, minArea, maxArea],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const activeFilterCount = [agentId, status, minPrice, maxPrice, minArea, maxArea].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setStatus('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
  }

  const formatPrice = (p) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: p.priceCurrency || 'TRY',
      maximumFractionDigits: 0,
    }).format(p.price);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Başlık, il, ilçe veya mahalle ile ara…"
        value={search}
        onChangeText={setSearch}
      />

      <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters((v) => !v)}>
        <Text style={styles.filterToggleText}>
          Filtreler{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {showFilters ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filterCard}>
          {isBroker && (
            <ChipSelect
              label="Danışman"
              options={[{ value: '', label: 'Tümü' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
              value={agentId}
              onChange={setAgentId}
            />
          )}
          <ChipSelect label="Durum" options={STATUS_OPTIONS} value={status} onChange={setStatus} />

          <Text style={styles.filterLabel}>Fiyat Aralığı (₺)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Min"
              value={minPrice}
              onChangeText={setMinPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Maks"
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.filterLabel}>Metrekare Aralığı</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Min"
              value={minArea}
              onChangeText={setMinArea}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Maks"
              value={maxArea}
              onChangeText={setMaxArea}
              keyboardType="numeric"
            />
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearFilters} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>Filtreleri Temizle</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.inkNavy} />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Kayıt bulunamadı.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
            >
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                <Badge value={item.listingType} labelMap={LISTING_TYPES} />
                <Badge value={item.status} labelMap={PROPERTY_STATUSES} />
              </View>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.district} · {formatPrice(item)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperLine,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  filterToggle: { paddingVertical: 6, marginBottom: 8 },
  filterToggleText: { color: colors.inkNavy, fontWeight: '600', fontSize: 13 },
  filterCard: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.paperLine,
    padding: 14,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: colors.paperLine,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: colors.white,
  },
  row: {
    backgroundColor: colors.paperRaised,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.paperLine,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.slate },
  rowSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 15 },
});
