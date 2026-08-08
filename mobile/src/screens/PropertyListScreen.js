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
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesApi, LISTING_TYPES, PROPERTY_STATUSES } from '../api/properties';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import ChipSelect from '../components/ChipSelect';
import MoneyInput from '../components/MoneyInput';
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
  const [rooms, setRooms] = useState('');
  const [minBuildingAge, setMinBuildingAge] = useState('');
  const [maxBuildingAge, setMaxBuildingAge] = useState('');
  const [heatingType, setHeatingType] = useState('');
  const [view, setView] = useState('');
  const [hasPool, setHasPool] = useState(false);
  const [hasGym, setHasGym] = useState(false);
  const [hasSecurity, setHasSecurity] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [keyword, setKeyword] = useState('');

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
      if (rooms) params.rooms = rooms;
      if (minBuildingAge) params.minBuildingAge = minBuildingAge;
      if (maxBuildingAge) params.maxBuildingAge = maxBuildingAge;
      if (heatingType) params.heatingType = heatingType;
      if (view) params.view = view;
      if (hasPool) params.hasPool = 'true';
      if (hasGym) params.hasGym = 'true';
      if (hasSecurity) params.hasSecurity = 'true';
      if (hasParking) params.hasParking = 'true';
      if (keyword) params.keyword = keyword;
      const data = await propertiesApi.list(params);
      setProperties(data);
    },
    [
      search, isBroker, agentId, status, minPrice, maxPrice, minArea, maxArea,
      rooms, minBuildingAge, maxBuildingAge, heatingType, view, hasPool, hasGym, hasSecurity, hasParking, keyword,
    ],
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

  const activeFilterCount =
    [agentId, status, minPrice, maxPrice, minArea, maxArea, rooms, minBuildingAge, maxBuildingAge, heatingType, view, keyword].filter(Boolean).length +
    [hasPool, hasGym, hasSecurity, hasParking].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setStatus('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setRooms('');
    setMinBuildingAge('');
    setMaxBuildingAge('');
    setHeatingType('');
    setView('');
    setHasPool(false);
    setHasGym(false);
    setHasSecurity(false);
    setHasParking(false);
    setKeyword('');
  }

  const formatPrice = (p) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: p.priceCurrency || 'TRY',
      maximumFractionDigits: 0,
    }).format(p.price);

  // Arama kutusu + filtre paneli, FlatList'in kaydirilabilir basligi (header)
  // olarak render ediliyor -- boylece filtre paneli uzun oldugunda da
  // kullanici asagi kaydirip tum alanlara ve listeye ulasabiliyor.
  const ListHeader = (
    <View>
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

          <Text style={styles.filterLabel}>Oda Sayısı</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="Örn: 2+1"
            value={rooms}
            onChangeText={setRooms}
          />

          <Text style={styles.filterLabel}>Isıtma Tipi</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="Örn: Doğalgaz Kombi"
            value={heatingType}
            onChangeText={setHeatingType}
          />

          <Text style={styles.filterLabel}>Manzara</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="Örn: Deniz"
            value={view}
            onChangeText={setView}
          />

          <Text style={styles.filterLabel}>Fiyat Aralığı (₺)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <MoneyInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Min"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <MoneyInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Maks"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>

          <Text style={styles.filterLabel}>Metrekare Aralığı</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
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

          <Text style={styles.filterLabel}>Bina Yaşı Aralığı</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Min"
              value={minBuildingAge}
              onChangeText={setMinBuildingAge}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Maks"
              value={maxBuildingAge}
              onChangeText={setMaxBuildingAge}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.filterLabel}>Ek Özellikler</Text>
          <View style={{ marginBottom: 12 }}>
            {[
              [hasPool, setHasPool, 'Havuz'],
              [hasGym, setHasGym, 'Spor Salonu'],
              [hasSecurity, setHasSecurity, 'Güvenlik'],
              [hasParking, setHasParking, 'Otopark'],
            ].map(([val, setVal, label]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: colors.slate }}>{label}</Text>
                <Switch value={val} onValueChange={setVal} trackColor={{ true: colors.brass }} />
              </View>
            ))}
          </View>

          <Text style={styles.filterLabel}>Anahtar Kelime (notlarda / açıklamada ara)</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="Örn: okula yakın, pazara yakın"
            value={keyword}
            onChangeText={setKeyword}
          />

          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearFilters} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>Filtreleri Temizle</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // FlatList her zaman ayni ekilde monte kalir (loading durumunda bile
  // degistirilmez) -- boylece arama kutusu her harfte yeniden olusturulup
  // klavyenin kapanmasina sebep olmuyor.
  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : properties}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.inkNavy} />
          ) : (
            <Text style={styles.empty}>Kayıt bulunamadı.</Text>
          )
        }
        keyboardShouldPersistTaps="handled"
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
    marginBottom: 12,
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
