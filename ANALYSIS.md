# Google Flood Hub Klonu - Analiz ve Tasarım Belgeleri

## 1. Google Flood Hub Özellikleri

### Ana İşlevler
- **İnteraktif Harita**: Belirli bir konuma zoom yapılmış harita görünümü (Leaflet veya Google Maps)
- **Sel Riski Görselleştirmesi**: Harita üzerinde sel riski alanlarının gösterilmesi (renkli katmanlar)
- **Su Seviyesi Verileri**: Gerçek zamanlı veya tahmin edilen su seviyeleri
- **Zaman Serisi Grafiği**: Su seviyesinin zaman içindeki değişimini gösteren grafik
- **Yer Bilgisi**: Koordinatlar ve yer adı gösterimi
- **Uyarı Sistemi**: Sel riski uyarıları ve bilgilendirmeler
- **Veri Kaynakları**: Google AI modelleri tarafından sağlanan tahminler

### UI Bileşenleri
1. **Üst Başlık**: Logo, başlık, bilgi notu
2. **Sol Panel**: 
   - Yer bilgisi (koordinatlar, yer adı)
   - Su seviyesi bilgisi (mevcut, tahmin, tarihçe)
   - Uyarı ve durumu göstergesi
3. **Merkez Alan**: İnteraktif harita
4. **Sağ Panel** (Opsiyonel):
   - Harita katmanları kontrolü
   - Zaman aralığı seçimi
   - Veri kaynakları bilgisi
5. **Alt Alan**: Zaman serisi grafiği (su seviyesi değişimi)

### Tasarım Özellikleri
- **Renk Şeması**: Mavi tonları (su/sel teması), kırmızı (yüksek risk), yeşil (düşük risk)
- **Tipografi**: Temiz, okunabilir sans-serif fontlar
- **Responsive**: Mobil ve masaüstü uyumlu
- **Erişilebilirlik**: Yüksek kontrast, açık bilgiler

## 2. Teknik Mimarı

### Frontend Stack
- **React 19**: Bileşen tabanlı UI
- **Tailwind CSS 4**: Stil yönetimi
- **shadcn/ui**: UI bileşenleri
- **Leaflet veya Google Maps API**: Harita entegrasyonu
- **Recharts**: Grafik ve veri görselleştirmesi
- **Wouter**: Client-side routing

### Veri Kaynakları
- Google Flood Forecasting API (gerçek veriler için)
- Mock veriler (geliştirme sırasında)

## 3. Sayfa Yapısı

### Ana Sayfa (/)
- Harita + veri panelleri
- Responsive grid layout
- Gerçek zamanlı veri güncellemeleri

## 4. Bileşen Listesi

- `MapView`: Harita bileşeni (Google Maps veya Leaflet)
- `FloodDataPanel`: Sol panel (yer bilgisi, su seviyeleri)
- `LayerControl`: Harita katmanları kontrolü
- `TimeSeriesChart`: Zaman serisi grafiği
- `AlertBanner`: Uyarı başlığı
- `Legend`: Harita açıklaması (renk kodları)

## 5. Veri Modeli

```typescript
interface LocationData {
  latitude: number;
  longitude: number;
  locationName: string;
  currentWaterLevel: number;
  forecastedWaterLevel: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

interface TimeSeriesData {
  timestamp: Date;
  waterLevel: number;
  forecast?: number;
}

interface FloodAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
}
```

## 6. Geliştirme Adımları

1. ✅ Proje başlatma (web-static)
2. ⏳ Tasarım ve brainstorm
3. ⏳ Harita bileşeni entegrasyonu
4. ⏳ Veri panelleri ve UI
5. ⏳ Grafik ve zaman serisi
6. ⏳ Mock veri entegrasyonu
7. ⏳ Responsive tasarım testi
8. ⏳ Final kontrol ve deployment

## 7. Başlangıç Koordinatları

- **Latitude**: 38.625278384355575
- **Longitude**: 35.71231125704324
- **Zoom Level**: 6.6389999971389795
- **Lokasyon**: Türkiye (Ankara bölgesi)
