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
import { customersApi, CUSTOMER_TYPES } from '../api/customers';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import ChipSelect from '../components/ChipSelect';
import MoneyInput from '../components/MoneyInput';
import { colors, statusColors } from '../theme';

function Badge({ type }) {
  const c = statusColors[type] || statusColors.buyer;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{CUSTOMER_TYPES[type] || type}</Text>
    </View>
  );
}

export default function CustomerListScreen({ navigation }) {
  const { isBroker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
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
      if (minBudget) params.minBudget = minBudget;
      if (maxBudget) params.maxBudget = maxBudget;
      if (keyword) params.keyword = keyword;
      const data = await customersApi.list(params);
      setCustomers(data);
    },
    [search, isBroker, agentId, minBudget, maxBudget, keyword],
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

  const activeFilterCount = [agentId, minBudget, maxBudget, keyword].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setMinBudget('');
    setMaxBudget('');
    setKeyword('');
  }

  // Arama kutusu + filtre paneli, FlatList'in kaydirilabilir basligi (header)
  // olarak render ediliyor -- boylece filtre paneli uzun oldugunda da
  // kullanici asagi kaydirip tum alanlara ve listeye ulasabiliyor.
  const ListHeader = (
    <View>
      <TextInput
        style={styles.searchInput}
        placeholder="Ad, soyad veya telefon ile ara…"
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
          <Text style={styles.filterLabel}>Bütçe Aralığı (₺)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <MoneyInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Min"
              value={minBudget}
              onChangeText={setMinBudget}
            />
            <MoneyInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Maks"
              value={maxBudget}
              onChangeText={setMaxBudget}
            />
          </View>

          <Text style={styles.filterLabel}>Anahtar Kelime (istekler / notlarda ara)</Text>
          <TextInput
            style={styles.filterInput}
            placeholder="Örn: 3+1, okula yakın"
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
        data={loading ? [] : customers}
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
            onPress={() => navigation.navigate('CustomerDetail', { id: item.id })}
          >
            <Badge type={item.type} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.rowSubtitle}>{item.phone}</Text>
            </View>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
