import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'offline_cache:';

export async function cacheSet(key, data) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch (err) {
    // Onbellege yazma basarisiz olursa sessizce yut -- uygulamayi durdurmamali
  }
}

export async function cacheGet(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// API cagrisini onbellekle sarmalar: basariliysa taze veriyi onbellege
// yazip doner; basarisiz olursa (internet yok vb.) onbellekten okumayi
// dener. Onbellek de yoksa hatayi oldugu gibi yukari firlatir.
export async function fetchWithCache(key, apiCall) {
  try {
    const data = await apiCall();
    cacheSet(key, data);
    return { data, fromCache: false, cachedAt: null };
  } catch (err) {
    const cached = await cacheGet(key);
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }
    throw err;
  }
}
