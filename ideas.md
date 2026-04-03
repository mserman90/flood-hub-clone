# Flood Hub Klonu - Tasarım Fikirleri

## Seçilen Tasarım Felsefesi: "Veri-Merkezli Minimalizm"

Bu tasarım yaklaşımı, **bilimsel doğruluk** ve **acil durum bilgilendirmesi**nin ön planda olduğu bir arayüz sunar. Veri görselleştirmesi ve harita etkileşimi tasarımın merkezindedir.

### Tasarım Hareketi
**Data Visualization Minimalism** - Veri-ağır uygulamalarda bilgiyi açık, hiyerarşik ve erişilebilir bir şekilde sunmak. Gereksiz dekorasyonları kaldırarak, veri ve eylem öğelerini öne çıkarmak.

### Temel İlkeler
1. **Bilgi Hiyerarşisi**: En kritik veriler (su seviyesi, risk seviyesi) en belirgin konumlarda
2. **Fonksiyonel Renk Kodlama**: Renkler anlamı taşır (kırmızı=tehlike, yeşil=güvenli, mavi=su)
3. **Minimal Dekorasyon**: Tasarım öğeleri işlevseldir, estetik değil
4. **Responsive Grid**: Mobil ve masaüstü arasında sorunsuz geçiş

### Renk Felsefesi
- **Primer**: Mavi (`#0066CC`) - Su, bilim, güven
- **Risk Göstergeleri**: 
  - Yeşil (`#22C55E`) - Düşük risk
  - Sarı (`#EAB308`) - Orta risk
  - Turuncu (`#F97316`) - Yüksek risk
  - Kırmızı (`#DC2626`) - Kritik risk
- **Arka Plan**: Açık gri (`#F8FAFC`) - Nötr, okunabilir
- **Metin**: Koyu gri (`#1E293B`) - Yüksek kontrast

### Layout Paradigması
**Asimetrik Harita-Merkezli Layout**:
- Sol taraf: Dar, bilgi paneli (yer, su seviyesi, uyarılar)
- Merkez: Harita (ana odak noktası)
- Alt: Geniş zaman serisi grafiği
- Mobil: Üst bilgi paneli → Harita → Grafik (dikey yığılma)

### İmza Öğeleri
1. **Risk Göstergesi Kartı**: Dairesel ilerleme göstergesi + risk seviyesi metni
2. **Su Seviyesi Spark Line**: Mini zaman serisi (başlık yanında)
3. **Katman Kontrolü Simgeleri**: Harita katmanlarını açıp kapatmak için basit ikonlar

### Etkileşim Felsefesi
- **Harita Tıklamaları**: Konuma tıklayarak yeni veri yükle
- **Zaman Kaydırıcısı**: Geçmiş/gelecek verilerine göz at
- **Hover Detayları**: Grafik üzerinde hover yapıldığında tarih ve değer göster
- **Uyarı Bildirimleri**: Kritik risk durumunda sabit başlıkta uyarı göster

### Animasyon Yönergeleri
- **Grafik Yükleme**: Çizgilerin yumuşak çizilmesi (1s)
- **Renk Geçişleri**: Risk seviyesi değiştiğinde 300ms fade
- **Harita Zoom**: Smooth zoom animasyonu (500ms)
- **Veri Güncelleme**: Pulse efekti (ince, 2s döngü) güncellenmiş değerlerde
- **Hover Efektleri**: Hafif ölçekleme (+2%) ve shadow artışı

### Tipografi Sistemi
- **Display**: Geist Bold (24px) - Başlık, yer adı
- **Heading**: Geist SemiBold (16px) - Panel başlıkları
- **Body**: Inter Regular (14px) - Veri değerleri, açıklamalar
- **Caption**: Inter Regular (12px) - Tarihler, birimler
- **Monospace**: Courier New (13px) - Koordinatlar, teknik veriler

### Erişilebilirlik
- Tüm renkler renk körlüğü testinden geçmiş
- Kontrast oranı minimum 4.5:1
- Tüm interaktif öğeler klavye erişilebilir
- Ekran okuyucu uyumlu ARIA etiketleri

---

## Alternatif Fikirler (Seçilmedi)

### Fikir 2: "Acil Durum Kontrol Merkezi" (Olasılık: 0.08)
Koyu tema, kırmızı/sarı acil uyarıları, terminal-benzeri veri gösterimi. Profesyonel acil durum yönetimi ekipleri için.

### Fikir 3: "Sosyal Harita Uygulaması" (Olasılık: 0.07)
Açık, renkli, sosyal paylaşım vurgulu. Halk katılımını teşvik eden, topluluk-merkezli tasarım.

---

## Uygulama Kararları

✅ **Seçilen**: Veri-Merkezli Minimalizm
- Neden: Google Flood Hub'ın orijinal tasarımı da bu felsefeden ilham alır
- Avantajlar: Hızlı bilgi tüketimi, acil durumlar için uygun, profesyonel görünüş
- Zorluklar: Estetik olarak basit görünebilir, ancak işlevsellik öncü
