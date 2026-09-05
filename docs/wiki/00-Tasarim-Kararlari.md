---
tags: [mimari, kararlar]
---

# Tasarım Kararları

Bu sayfa, projenin geliştirilmesi sırasında alınan ve **korunması gereken** mimari/tasarım kararlarını listeler. Yeni bir özellik eklerken bu kararlarla çelişilmemeli.

## Devlet Sistemleri — Asla Gerçek Entegrasyon Yok

E-Devlet, KPS (Kimlik Paylaşım Sistemi) gibi devlet sistemlerine **gerçek bir API entegrasyonu asla yapılmaz** — bu teknik olarak mümkün değil (resmi yetkilendirme/protokol gerektirir). Bu tür adımlar için sistem sadece **"yapıldı" diye elle işaretlenen bir takip** sunar; otomatik doğrulama değildir. Kod içinde "doğrulandı" değil "işaretlendi" gibi ifadeler kullanılmalı, yanlış bir güvenlik izlenimi verilmemeli.

## Yayınlama Kuralları — Her Zaman Uyarı, Asla Kesin Engel

Bir işlemi (örn. portföyü Aktif'e alma) engelleyen kurallar **her zaman "soft block"** (bilgilendirici uyarı + onay isteme) şeklinde olmalı, **asla "hard block"** (kesin engel) olmamalı. Karar her zaman Broker'a aittir; sistem sadece bilgilendirir.

## Dijital Belgeler — Tek Kaynak, Otomatik Senkron

[[Modul-Dijital-Belgeler]] altındaki `digital_documents` tablosu, imza durumunun **tek kaynağı**dır. Başka bir modülde (örn. ileride kurulacak bir evrak checklist'i) bir belgenin imzalı olup olmadığı gösterilecekse, bu bilgi `digital_documents`'tan **otomatik okunmalı**, ayrıca elle işaretlenmemelidir.

## WhatsApp / Mail — Gerçek API Değil, Link Tabanlı

Sistemde "WhatsApp ile gönder" dediğimiz her yer, **gerçek bir mesajlaşma API'si değildir** — `wa.me` linki oluşturup kullanıcının kendi WhatsApp'ını açar, mesajı **kullanıcı kendi eliyle gönderir**. Otomatik/arka planda mesaj gönderen bir servis yoktur. Aynı şekilde "Mail gönder" butonları çoğunlukla `mailto:` linkleridir, gerçek bir mail sunucusu entegrasyonu değildir (istisna: şifre sıfırlama maili, bkz. [[00-Guvenlik-ve-Roller]], o da şu an yapılandırılmamış durumda).

Gönderilen mesajlar, ilgili kaydın (portföy/müşteri) özet bilgilerini otomatik içermeli — boş, jenerik bir talep olmamalı.

## Sıcak Fırsatlar Eşleştirmesi — Türkçe Ek Toleranslı, Tüm Bilgi Tek Havuzda

bkz. [[Modul-Esletirme]] için detay. Özet: yapısal alanlar (bütçe, ilçe, oda sayısı) ile serbest metin (Notlar/Gereksinimler) **ayrı sistemler değil**, tek bir kelime havuzunda, Türkçe kök/önek toleranslı bir algoritmayla karşılaştırılır. Basit `includes()` / tam eşitlik kullanılmaz — "manzaralı" ile "manzarası" gibi farklı ekli aynı kök kelimeler eşleşmelidir.

## Mahremiyet Duvarı — Varsayılan: Ofis Geneli, Danışman Kendiyle İlgili Olanı Görür

Eşleştirme ve bazı diğer ofis-geneli görünümlerde (örn. Sıcak Fırsatlar), veri **tüm ofis** üzerinden taranır (mahremiyet filtresi olmadan), ama **Danışman'a gösterilen sonuç**, sadece kendi müşterisi ya da kendi portföyüyle ilgili olanlarla sınırlanır. Broker her zaman tüm ofisi görür. Bu, "tarama kapsamı" ile "gösterim filtresi"nin ayrı kavramlar olduğu anlamına gelir — tarama asla agentId'ye göre daraltılmamalı, sadece sonuç gösterimi daraltılmalı.

## Bağımsız Doğrulama Zorunluluğu

Kod tabanında bir değişiklik (özellikle başka bir geliştirici/AI asistanı — Manus — tarafından yapılan) **asla sözlü rapora güvenilerek kabul edilmez**. Her zaman GitHub'dan bağımsız olarak çekilip, gerçek commit'in var olduğu, içeriğinin doğru olduğu ve derlemenin geçtiği doğrulanır. Detay için bkz. [[00-Bakim-Talimatlari]].

## Domain Geçişi — Eski Domain Silinmez, Sadece Devre Dışı Bırakılır

remaxbostanci.com → bu-crm.site geçişinde, eski domain **DNS kaydı olarak silinmedi**, sadece backend'in CORS izin listesinden çıkarıldı. Bu, geri dönüşü kolaylaştıran, düşük riskli bir yaklaşımdı.
