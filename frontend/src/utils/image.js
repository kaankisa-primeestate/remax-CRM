// Cloudinary adresine kucultme parametresi ekler.
//
// Galeride 20 kart varsa 20 tam boyutlu fotograf indirmek sayfayi
// yavaslatir; ozellikle mobil baglantida. Cloudinary adresin icindeki
// "/upload/" parcasindan sonra donusum parametresi kabul ediyor, boylece
// sunucu tarafinda kucultulmus surumu aliyoruz.
//
// c_fill  : verilen olcuye kirparak sigdirir (kart orani bozulmaz)
// f_auto  : tarayici destekliyorsa WEBP/AVIF gonderir
// q_auto  : gorsel kalitesini otomatik ayarlar
//
// Cloudinary disindaki adresler (elle yapistirilmis eski linkler) oldugu
// gibi birakilir -- bozmak yerine dokunmuyoruz.
export function thumbUrl(url, width = 400, height = 300) {
  if (!url || typeof url !== 'string') return url;
  const isaret = '/upload/';
  const yer = url.indexOf(isaret);
  if (yer === -1 || !url.includes('res.cloudinary.com')) return url;
  const donusum = `c_fill,w_${width},h_${height},f_auto,q_auto/`;
  // Adreste zaten donusum varsa ikinci kez eklemeyelim.
  const kalan = url.slice(yer + isaret.length);
  if (/^(c_|w_|h_|f_|q_)/.test(kalan)) return url;
  return url.slice(0, yer + isaret.length) + donusum + kalan;
}

// Bir portfoyun kapak gorseli: ilk fotograf. Yoksa null doner ve
// cagiran taraf yer tutucu gosterir.
export function coverPhoto(property) {
  const liste = property?.photoUrls;
  if (!Array.isArray(liste) || liste.length === 0) return null;
  return liste.find((u) => typeof u === 'string' && u.trim()) || null;
}
