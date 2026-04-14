# Flood Hub - Veri Kaynakları Analizi

## 1. Open-Meteo Global Flood API

### Endpoint
```
https://flood-api.open-meteo.com/v1/flood
```

### Parametreler
- `latitude` (float): Enlem
- `longitude` (float): Boylam
- `hourly` (string): Saatlik değişkenler (örn: `discharge`)
- `forecast_days` (int): Tahmin günü (varsayılan: 7)
- `timezone` (string): Saat dilimi (varsayılan: UTC)
- `ensemble_members` (int): Ensemble üyeleri sayısı

### Örnek İstek
```
GET https://flood-api.open-meteo.com/v1/flood?latitude=52.52&longitude=13.41&hourly=discharge&forecast_days=7&timezone=UTC
```

### Beklenen Yanıt Yapısı
```json
{
  "latitude": 52.52,
  "longitude": 13.41,
  "timezone": "UTC",
  "hourly": {
    "time": ["2024-01-01T00:00", "2024-01-01T01:00", ...],
    "discharge": [100.5, 105.2, ...]
  }
}
```

### Özellikler
- ✅ Ücretsiz, API key gerektirmiyor
- ✅ Küresel kapsama
- ✅ Saatlik tahmin verisi
- ✅ Ensemble forecast desteği
- ⚠️ Rate limit: Request başına (genelde 10 req/dakika)

---

## 2. USGS Water Data - Real-Time Flood Impacts (RTFI)

### Ana Endpoint
```
https://api.waterdata.usgs.gov
```

### Alt Endpoint'ler

#### Sel Olayları Listesi
```
GET https://api.waterdata.usgs.gov/rtfi/v1/floodEvent
```

Parametreler:
- `state` (string): ABD eyalet kodu (örn: `CA`, `TX`)
- `startDate` (string): Başlangıç tarihi (ISO 8601)
- `endDate` (string): Bitiş tarihi (ISO 8601)

#### Kritik Lokasyonlar
```
GET https://api.waterdata.usgs.gov/rtfi/v1/floodLocation
```

Parametreler:
- `latitude` (float): Enlem
- `longitude` (float): Boylam
- `distance` (int): Mesafe (km)

#### Gerçek Zamanlı Su Seviyeleri
```
GET https://waterservices.usgs.gov/nwis/iv
```

Parametreler:
- `sites` (string): Site numaraları (örn: `01646500`)
- `parameterCd` (string): Parameter kodu (örn: `00060` = discharge)
- `format` (string): Format (`json`, `xml`)

### Beklenen Yanıt Yapısı (RTFI)
```json
{
  "floodEvents": [
    {
      "eventId": "12345",
      "location": "River Name",
      "state": "CA",
      "severity": "high",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-02T00:00:00Z",
      "description": "..."
    }
  ]
}
```

### Beklenen Yanıt Yapısı (IV - Instantaneous Values)
```json
{
  "value": {
    "timeSeries": [
      {
        "sourceInfo": {
          "siteName": "River Name",
          "geoLocation": {
            "geogLocation": {
              "srs": "EPSG:4326",
              "geomLocation": {
                "wkt": "POINT(-120.5 38.5)"
              }
            }
          }
        },
        "values": [
          {
            "value": [
              {
                "value": "1234.5",
                "dateTime": "2024-01-01T00:00:00.000"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### Özellikler
- ✅ Ücretsiz, API key gerektirmiyor
- ✅ Gerçek zamanlı veri
- ✅ ABD'ye yoğun kapsama
- ✅ Tarihsel veri erişimi
- ⚠️ ABD odaklı (küresel kapsama sınırlı)
- ⚠️ Kompleks yanıt yapısı

---

## 3. Fallback Stratejisi

### Öncelik Sırası
1. **Birincil**: Mevcut Open-Meteo Weather API (hızlı, güvenilir)
2. **Yedek 1**: Open-Meteo Global Flood API (flood-specific)
3. **Yedek 2**: USGS Water Data (ABD için gerçek zamanlı)
4. **Yedek 3**: Mock veriler (sistem test/demo)

### Fallback Mantığı
```
getFloodData(latitude, longitude, regionId):
  try:
    return fetchFromPrimary()
  catch error1:
    try:
      return fetchFromOpenMeteoFlood()
    catch error2:
      try:
        return fetchFromUSGS()
      catch error3:
        return getMockData()
```

---

## 4. Veri Dönüşüm (Normalization)

Tüm kaynaklar aynı formata dönüştürülecek:

```typescript
interface NormalizedFloodData {
  regionId: string;
  regionName: string;
  latitude: number;
  longitude: number;
  currentWaterLevel: number;
  forecastedWaterLevel?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: 'open-meteo-weather' | 'open-meteo-flood' | 'usgs' | 'mock';
  confidence: number; // 0-1
  forecastHours: number;
  metadata?: Record<string, any>;
}
```

---

## 5. Rate Limiting & Caching

### Caching Stratejisi
- **Gerçek zamanlı veri**: 5-10 dakika cache
- **Tahmin verisi**: 1 saat cache
- **Uyarı verisi**: 2 saat cache

### Rate Limiting
- Open-Meteo: ~10 req/dakika (public tier)
- USGS: ~1000 req/gün (public tier)
- Implement: Request queue + backoff strategy

---

## 6. Hata Yönetimi

### Hata Türleri
- Network timeout (retry 3x)
- API rate limit (backoff exponential)
- Invalid coordinates (fallback)
- Parsing error (log + fallback)
- All sources fail (mock + alert)

### Logging
- Tüm API çağrıları log'lanacak
- Fallback tetiklemeler kaydedilecek
- Hata oranları izlenecek
