# Flood Hub - Gerçek API Entegrasyonu

## Seçilen API: Open-Meteo Flood API

### Neden Open-Meteo?
- **Ücretsiz ve Açık**: Hiçbir API anahtarı gerekmez, ticari kullanım için bile
- **Hızlı Başlangıç**: Kimlik doğrulama gerektirmez
- **Kapsamlı Veri**: 1984'ten 7 ay öncesine kadar veri ve tahminler
- **Kolay Entegrasyon**: Basit REST API

### API Endpoint
```
https://api.open-meteo.com/v1/flood
```

### Parametreler
- `latitude`: Enlem (örn: 38.625278)
- `longitude`: Boylam (örn: 35.712311)
- `daily`: Günlük veri türleri (örn: `river_discharge`)
- `past_days`: Geçmiş günler (örn: 7)
- `forecast_days`: Tahmin günleri (örn: 7)

### Örnek İstek
```
https://api.open-meteo.com/v1/flood?latitude=38.625278&longitude=35.712311&daily=river_discharge&past_days=7&forecast_days=7
```

### Yanıt Formatı
```json
{
  "latitude": 38.6,
  "longitude": 35.7,
  "daily": {
    "time": ["2026-03-27", "2026-03-28", ...],
    "river_discharge": [45.2, 48.5, ...]
  },
  "daily_units": {
    "river_discharge": "m³/s"
  }
}
```

## Alternatif API'lar

### 1. Google Flood Forecasting API
- **Avantajlar**: Çok doğru tahminler, Google tarafından geliştirilmiş
- **Dezavantajlar**: Bekleme listesi gerekli, API anahtarı gerekli
- **Durum**: Pilot aşamasında, erişim sınırlı

### 2. USGS Water Data APIs
- **Avantajlar**: ABD'de çok kapsamlı su seviyeleri
- **Dezavantajlar**: Ağırlıklı olarak ABD verileri, Türkiye'de sınırlı
- **Endpoint**: https://api.waterdata.usgs.gov/

### 3. NOAA Water Level API
- **Avantajlar**: Gerçek zamanlı su seviyeleri
- **Dezavantajler**: Ağırlıklı olarak ABD kıyı bölgeleri
- **Endpoint**: https://api.tidesandcurrents.noaa.gov/

## Uygulama Planı

### Aşama 1: Backend API Proxy (web-db-user gerekli)
- Express backend oluştur
- Open-Meteo API'ye istek gönder
- Verileri cache et (5 dakika)
- Frontend'e JSON döndür

### Aşama 2: Frontend Entegrasyonu
- `useEffect` ile backend endpoint'ini çağır
- Verileri state'e kaydet
- Grafik ve paneli gerçek verilerle güncelle
- Loading ve error state'lerini yönet

### Aşama 3: Su Seviyesinden Risk Seviyesine Dönüştürme
- Nehir debisini (m³/s) su seviyesine dönüştür
- Risk seviyeleri belirle:
  - Düşük: < 50 m³/s
  - Orta: 50-100 m³/s
  - Yüksek: 100-200 m³/s
  - Kritik: > 200 m³/s

## Veri Dönüşümü

Open-Meteo API nehir debisini (m³/s) sağlar, ancak Flood Hub su seviyesini (metre) gösterir.
Dönüştürme formülü (yaklaşık):
```
water_level = (river_discharge / 100) + 2.0
```

Bu formül bölgeye ve nehir özelliklerine göre ayarlanabilir.

## Gerekli Değişiklikler

1. **Home.tsx**: API çağrısı ekle
2. **FloodDataPanel.tsx**: Gerçek verilerle güncelle
3. **WaterLevelChart.tsx**: Zaman serisi verilerini göster
4. **Backend**: (web-db-user upgrade gerekli) API proxy oluştur
