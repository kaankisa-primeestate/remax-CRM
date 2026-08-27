// Eski finans API sarmalayıcılarının kullandığı import yolunu,
// uygulamanın ortak ve JWT destekli istemcisine bağlayan uyumluluk katmanı.
// Finans iş kurallarına dokunmaz; yalnızca mevcut import sözleşmesini korur.
import { apiClient } from './client';

export default apiClient;
