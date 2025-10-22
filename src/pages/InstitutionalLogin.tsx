import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

const InstitutionalLogin = () => {
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const email = (form.get("email") as string) || "";
    const password = (form.get("password") as string) || "";

    if (!email || !password) {
      toast("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    try {
      const payload = { email, password, role: "institution" };
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("institutionToken", data.token);
        toast("تم تسجيل الدخول بنجاح");
        navigate("/institution-dashboard");
        return;
      }

      // Handle different error responses
      if (res.status === 401) {
        toast("فشل تسجيل الدخول", { description: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      } else {
        toast("حدث خطأ أثناء تسجيل الدخول", { description: "يرجى المحاولة مرة أخرى لاحقاً" });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast("حدث خطأ في الاتصال", { description: "يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى" });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:underline">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للصفحة الرئيسية
          </Link>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">الدخول للمؤسسات</CardTitle>
            <CardDescription>
              تسجيل الدخول للوصول إلى لوحة التقييم وإدارة الحالات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input 
                  id="email" 
                  name="email"
                  type="email" 
                  placeholder="institution@example.com" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input 
                  id="password" 
                  name="password"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                />
              </div>
              <div className="flex items-center justify-between">
                <a href="#" className="text-sm text-primary hover:underline">
                  نسيت كلمة المرور؟
                </a>
              </div>
              <Button type="submit" className="w-full">
                تسجيل الدخول
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>ملاحظة:</strong> للتجربة، يمكنك تسجيل مؤسسة جديدة من صفحة التسجيل ثم استخدام نفس البريد الإلكتروني هنا للدخول.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstitutionalLogin;