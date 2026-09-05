---
tags: [modul, degerleme]
---

# Modül: Değerleme (Piyasa Değer Analizi)

**Backend:** `backend/src/valuations/` (entity `PropertyValuation`, tablo `kpa_valuations`; ayrıca `ValuationComp` — emsal karşılaştırma kayıtları)
**Frontend:** `ValuationsListPage.jsx`, `ValuationWizardPage.jsx` (route: `/degerleme`, `/degerleme/yeni`, `/degerleme/:id`)

## Amaç

Bir mülk için, benzer emsal satışlar/ilanlar karşılaştırılarak tahmini piyasa değeri (KPA — Karşılaştırmalı Piyasa Analizi) üretilir.

## Yapı

`PropertyValuation`, bir değerleme raporunun ana kaydı; `ValuationComp`, o rapora eklenen her bir emsal karşılaştırma satırıdır (bire-çok ilişki).

## İlgili Modüller

- [[Modul-Portfoy]] — değerleme, bir portföy için ya da bağımsız bir adres için yapılabilir
