import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, User, Shield, Key } from "lucide-react";

interface AdminProfile {
  email: string;
}

const AdminSettings = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        window.location.href = '/admin-login';
        return;
      }

      const response = await fetch('/api/admin/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("خطأ في تحليل الاستجابة:", parseError);
        data = { email: 'admin@gaza-life.com' };
      }

      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة غير متطابقة' });
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("خطأ في تحليل الاستجابة:", parseError);
        throw new Error("فشل في تحليل استجابة الخادم");
      }

      if (response.ok) {
        setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
        setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'حدث خطأ أثناء تغيير كلمة المرور' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">إعدادات المشرف</h1>

          <div className="space-y-6 animate-fade-in">
            {/* Profile Information */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات الحساب
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="mt-1 focus-modern"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  تغيير كلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {message && (
                  <Alert className={`mb-4 animate-fade-in ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {message.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                      {message.text}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="oldPassword" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      كلمة المرور القديمة
                    </Label>
                    <Input
                      id="oldPassword"
                      type="password"
                      value={formData.oldPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, oldPassword: e.target.value }))}
                      required
                      className="mt-1 focus-modern"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      كلمة المرور الجديدة
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      className="mt-1 focus-modern"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      تأكيد كلمة المرور الجديدة
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      className="mt-1 focus-modern"
                      dir="ltr"
                    />
                  </div>

                  <Button type="submit" disabled={saving} className="w-full btn-modern" aria-describedby="password-change-status">
                    {saving ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
