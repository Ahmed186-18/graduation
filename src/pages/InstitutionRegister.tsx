import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { randomId } from "@/lib/random-id";

const REGIONS = ["غزة", "شمال غزة", "دير البلح", "النصيرات", "خان يونس", "رفح"] as const;

const InstitutionRegister = () => {
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = (form.get("name") as string) || "";
    const email = (form.get("email") as string) || "";
    const password = (form.get("password") as string) || "";
    const confirm = (form.get("confirm") as string) || "";
    const about = (form.get("about") as string) || "";
    const services = (form.get("services") as string) || "";

    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim() || !about.trim() || !services.trim() || regions.length === 0) {
      toast("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    if (password.length < 6) {
      toast("كلمة المرور قصيرة", { description: "يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    if (password !== confirm) {
      toast("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/institutions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactEmail: email, password, about, services, regions }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast(data.message || "البيانات موجودة مسبقاً");
        } else {
          toast(data.message || "حدث خطأ أثناء الإرسال");
        }
        return;
      }

      toast("تم إرسال طلب تسجيل المؤسسة", { description: "سيتم مراجعته من قبل الإدارة" });
      (e.target as HTMLFormElement).reset();
      setRegions([]);
    } catch (error) {
      console.error("Registration error:", error);
      toast("حدث خطأ في الاتصال بالخادم", { description: "يرجى المحاولة مرة أخرى" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:underline">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للصفحة الرئيسية
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">تسجيل مؤسسة جديدة</CardTitle>
            <CardDescription>أدخل معلومات المؤسسة لتقديم طلب الانضمام</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم المؤسسة</Label>
                  <Input id="name" name="name" placeholder="اسم المؤسسة" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" name="email" type="email" placeholder="example@org.org" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
                  <Input id="confirm" name="confirm" type="password" placeholder="••••••" required minLength={6} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">نبذة عن المؤسسة</Label>
                <Textarea id="about" name="about" placeholder="تعريف مختصر بالمؤسسة" rows={3} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="services">الخدمات التي تقدمها</Label>
                <Textarea id="services" name="services" placeholder="اذكر نوع الخدمات المقدمة" rows={3} required />
              </div>

              <div className="space-y-2">
                <Label>المناطق التي تقدم فيها الخدمات (يمكن اختيار أكثر من منطقة)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {regions.length > 0 ? `تم اختيار ${regions.length} منطقة` : "اختر المناطق"}
                      <span className="opacity-60">▼</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64" align="end">
                    <DropdownMenuLabel>اختر المناطق</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {REGIONS.map((r) => {
                      const checked = regions.includes(r);
                      return (
                        <DropdownMenuItem key={r} onSelect={(e) => e.preventDefault()}>
                          <div className="flex items-center gap-2" onClick={() => setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))}>
                            <Checkbox checked={checked} />
                            <span>{r}</span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                {regions.length === 0 && (
                  <p className="text-xs text-muted-foreground">يرجى اختيار منطقة واحدة على الأقل</p>
                )}
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "جاري الإرسال..." : "إرسال الطلب"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstitutionRegister;
