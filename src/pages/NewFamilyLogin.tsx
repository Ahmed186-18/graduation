import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const NewFamilyLogin = () => {
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idNumber.trim() || !password.trim()) {
      toast.error("يرجى إدخال رقم الهوية وكلمة المرور");
      return;
    }
    if (idNumber.length !== 9) {
      toast.error("رقم الهوية يجب أن يكون مكون من 9 أرقام");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور قصيرة", { description: "يجب أن تكون 6 أحرف على الأقل" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/family-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        toast.success("تم تسجيل الدخول بنجاح");
        navigate("/family-dashboard");
      } else {
        throw new Error(data.message || "فشل تسجيل الدخول");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      toast.error("خطأ في تسجيل الدخول", { description: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="container mx-auto max-w-md">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:underline">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للصفحة الرئيسية
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">تسجيل دخول العائلة</CardTitle>
            <CardDescription>قم بتسجيل الدخول باستخدام رقم الهوية (رب الأسرة) وكلمة المرور التي وضعتها عند التسجيل</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idNumber">رقم الهوية (رب الأسرة)</Label>
                <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="123456789" maxLength={9} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewFamilyLogin;
