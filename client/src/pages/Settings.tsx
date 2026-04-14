/**
 * Settings.tsx
 * Kullanici bildirim tercihlerini yoneten ayarlar sayfasi.
 * Tercihler: bildirim modu, kanallar, sessiz saatler, risk seviyeleri, vb.
 * Rota: /settings
 */

import { useState, useEffect } from 'react';
import { Bell, Clock, Shield, ToggleLeft, ToggleRight, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type NotificationMode = 'instant' | 'daily' | 'weekly' | 'disabled';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type SummaryDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const SUMMARY_DAYS = [
  { value: 'monday', label: 'Pazartesi' },
  { value: 'tuesday', label: 'Salı' },
  { value: 'wednesday', label: 'Çarşamba' },
  { value: 'thursday', label: 'Perşembe' },
  { value: 'friday', label: 'Cuma' },
  { value: 'saturday', label: 'Cumartesi' },
  { value: 'sunday', label: 'Pazar' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
  { value: 'critical', label: 'Kritik' },
];

export default function Settings() {
  const { data: preferences, isLoading } = trpc.preferences.getPreferences.useQuery();
  const updateMutation = trpc.preferences.updatePreferences.useMutation();
  const resetMutation = trpc.preferences.resetToDefaults.useMutation();
  const disallMutation = trpc.preferences.disableAllChannels.useMutation();
  const enableAllMutation = trpc.preferences.enableAllChannels.useMutation();

  const [formData, setFormData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        notificationMode: formData.notificationMode,
        enablePush: formData.enablePush,
        enableEmail: formData.enableEmail,
        enableInApp: formData.enableInApp,
        summaryTime: formData.summaryTime,
        summaryDay: formData.summaryDay,
        minRiskLevel: formData.minRiskLevel,
        quietHoursEnabled: formData.quietHoursEnabled,
        quietHoursStart: formData.quietHoursStart,
        quietHoursEnd: formData.quietHoursEnd,
      });
      setHasChanges(false);
      toast.success('Tercihler kaydedildi');
    } catch (error) {
      toast.error('Tercihler kaydedilirken hata oluştu');
      console.error(error);
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
      toast.success('Tercihler varsayılana sıfırlandı');
      setHasChanges(false);
    } catch (error) {
      toast.error('Sıfırlama işlemi başarısız oldu');
      console.error(error);
    }
  };

  const handleDisableAll = async () => {
    try {
      await disallMutation.mutateAsync();
      toast.success('Tüm bildirimler kapatıldı');
      setHasChanges(false);
    } catch (error) {
      toast.error('İşlem başarısız oldu');
      console.error(error);
    }
  };

  const handleEnableAll = async () => {
    try {
      await enableAllMutation.mutateAsync();
      toast.success('Tüm bildirimler açıldı');
      setHasChanges(false);
    } catch (error) {
      toast.error('İşlem başarısız oldu');
      console.error(error);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Tercihler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bildirim Ayarları</h1>
          <p className="text-muted-foreground mt-2">
            Sel uyarılarını nasıl almak istediğinizi özelleştirin
          </p>
        </div>

        <div className="space-y-6">
          {/* Bildirim Modu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Bildirim Modu
              </CardTitle>
              <CardDescription>
                Sel uyarılarını ne sıklıkta almak istediğinizi seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'instant', label: 'Anlık', desc: 'Hemen bilgilendir' },
                  { value: 'daily', label: 'Günlük Özet', desc: 'Günde bir kez' },
                  { value: 'weekly', label: 'Haftalık Özet', desc: 'Haftada bir kez' },
                  { value: 'disabled', label: 'Kapalı', desc: 'Bildirim alma' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => handleChange('notificationMode', mode.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      formData.notificationMode === mode.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <div className="font-semibold">{mode.label}</div>
                    <div className="text-sm text-muted-foreground">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bildirim Kanalları */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleRight className="w-5 h-5" />
                Bildirim Kanalları
              </CardTitle>
              <CardDescription>
                Hangi kanallardan bildirim almak istediğinizi seçin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">Push Bildirimleri</div>
                    <div className="text-sm text-muted-foreground">
                      Tarayıcı push bildirimleri
                    </div>
                  </div>
                  <Switch
                    checked={formData.enablePush}
                    onCheckedChange={(checked) => handleChange('enablePush', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">E-posta</div>
                    <div className="text-sm text-muted-foreground">
                      E-posta bildirimleri
                    </div>
                  </div>
                  <Switch
                    checked={formData.enableEmail}
                    onCheckedChange={(checked) => handleChange('enableEmail', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">Uygulama İçi</div>
                    <div className="text-sm text-muted-foreground">
                      Uygulama içi bildirimler
                    </div>
                  </div>
                  <Switch
                    checked={formData.enableInApp}
                    onCheckedChange={(checked) => handleChange('enableInApp', checked)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisableAll}
                  disabled={disallMutation.isPending}
                >
                  <ToggleLeft className="w-4 h-4 mr-2" />
                  Tümünü Kapat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnableAll}
                  disabled={enableAllMutation.isPending}
                >
                  <ToggleRight className="w-4 h-4 mr-2" />
                  Tümünü Aç
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Özet Ayarları */}
          {(formData.notificationMode === 'daily' || formData.notificationMode === 'weekly') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Özet Ayarları
                </CardTitle>
                <CardDescription>
                  Özet bildirimlerinin ne zaman gönderileceğini belirleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Saat</label>
                    <input
                      type="time"
                      value={formData.summaryTime}
                      onChange={(e) => handleChange('summaryTime', e.target.value)}
                      className="w-full mt-2 px-3 py-2 border rounded-lg"
                    />
                  </div>

                  {formData.notificationMode === 'weekly' && (
                    <div>
                      <label className="text-sm font-medium">Gün</label>
                      <Select value={formData.summaryDay} onValueChange={(value) => handleChange('summaryDay', value)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUMMARY_DAYS.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Seviyesi Filtreleme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Risk Seviyesi Filtreleme
              </CardTitle>
              <CardDescription>
                Hangi risk seviyesinden itibaren bildirim almak istediğinizi seçin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={formData.minRiskLevel} onValueChange={(value) => handleChange('minRiskLevel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label} ve üzeri
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                Seçilen seviyenin altındaki riskler için bildirim almayacaksınız
              </p>
            </CardContent>
          </Card>

          {/* Sessiz Saatler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Sessiz Saatler
              </CardTitle>
              <CardDescription>
                Bu saatlerde bildirim almayacaksınız
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Sessiz Saatleri Etkinleştir</div>
                  <div className="text-sm text-muted-foreground">
                    Belirli saatlerde bildirimleri kapat
                  </div>
                </div>
                <Switch
                  checked={formData.quietHoursEnabled}
                  onCheckedChange={(checked) => handleChange('quietHoursEnabled', checked)}
                />
              </div>

              {formData.quietHoursEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium">Başlangıç Saati</label>
                    <input
                      type="time"
                      value={formData.quietHoursStart}
                      onChange={(e) => handleChange('quietHoursStart', e.target.value)}
                      className="w-full mt-2 px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Bitiş Saati</label>
                    <input
                      type="time"
                      value={formData.quietHoursEnd}
                      onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
                      className="w-full mt-2 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* İşlem Butonları */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Sıfırla
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
