import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { commissionsApi, COMMISSION_STATUSES } from '../api/commissions';
import { usersApi } from '../api/users';
import { useAuth } from '../context/AuthContext';
import ChipSelect from '../components/ChipSelect';
import { colors, statusColors } from '../theme';

function Badge({ value, labelMap }) {
  const c = statusColors[value] || statusColors.pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{labelMap[value] || value}</Text>
    </View>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'paid', label: 'Ödendi' },
];

const formatMoney = (n) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
};

export default function CommissionListScreen({ navigation }) {
  const { isBroker } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isBroker) {
      usersApi.listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isBroker]);

  const load = useCallback(async () => {
    const params = {};
    if (isBroker && agentId) params.agentId = agentId;
    if (status) params.status = status;
    const [list, sum] = await Promise.all([
      commissionsApi.list(params),
      commissionsApi.summary(params),
    ]);
    setCommissions(list);
    setSummary(sum);
  }, [isBroker, agentId, status]);

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

  const activeFilterCount = [agentId, status].filter(Boolean).length;

  function clearFilters() {
    setAgentId('');
    setStatus('');
  }

  const agentName = (id) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <View style={styles.container}>
      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Toplam Net</Text>
            <Text style={styles.summaryValue}>{formatMoney(summary.totalNetPayable)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Bekleyen</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatMoney(summary.totalPending)}
            </Text>
          </View>
        </View>
      )}

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
          data={commissions}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<Text style={styles.empty}>Kayıt bulunamadı.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                <Badge value={item.status} labelMap={COMMISSION_STATUSES} />
              </View>
              <Text style={styles.rowTitle}>
                {item.propertyTitle || (item.transactionType === 'sale' ? 'Satış İşlemi' : 'Kiralama İşlemi')}
              </Text>
              <Text style={styles.rowSubtitle}>
                {isBroker ? `${agentName(item.agentId)} · ` : ''}Vade: {formatDate(item.dueDate)}
              </Text>
              <Text style={styles.rowAmount}>{formatMoney(item.netPayable)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.paperRaised,
    borderWidth: 1,
    borderColor: colors.paperLine,
    borderRadius: 8,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 4,
  },
  summaryValue: { fontSize: 17, fontWeight: '700', color: colors.inkNavy },
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
  rowAmount: { fontSize: 15, fontWeight: '700', color: colors.inkNavy, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 15 },
});
