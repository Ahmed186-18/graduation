import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, BarChart3, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden" dir="rtl">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f1f5f9%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold gradient-text">ح</span>
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">حياة غزة</h1>
                <p className="text-xs text-muted-foreground">منصة إدارة المساعدات</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="glass-card border-white/20 hover:bg-white/10">
              <Link to="/family-login">تسجيل دخول العائلات</Link>
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-white/20 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-accent" />
                منصة تقييم الاحتياجات الإنسانية
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-tight">
                نظام ذكي وشفاف لـ
                <span className="block gradient-text">إدارة المساعدات</span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                منصة متقدمة تجمع بين التكنولوجيا والإنسانية لضمان توزيع عادل وفعال للمساعدات في غزة
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button asChild size="lg" className="btn-modern text-lg px-8 py-6 h-auto group">
                  <Link to="/register" className="flex items-center gap-2">
                    سجل عائلتك الآن
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="glass-card border-white/20 hover:bg-white/10 text-lg px-8 py-6 h-auto">
                  <Link to="/institutional-login">الدخول للمؤسسات</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">كيف تعمل المنصة</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                عملية مبسطة وشفافة تضمن الوصول العادل للمساعدات
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card border-white/20 card-hover group">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">التسجيل</CardTitle>
                  <CardDescription className="text-center">
                    يقوم الأفراد المتضررون بتقديم معلومات العائلة بشكل آمن عبر النموذج الإلكتروني
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card border-white/20 card-hover group">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">التقييم</CardTitle>
                  <CardDescription className="text-center">
                    خوارزمية ذكية تحسب مؤشر الاحتياج بناءً على معايير قابلة للتخصيص
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card border-white/20 card-hover group">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">تحديد الأولويات</CardTitle>
                  <CardDescription className="text-center">
                    تقوم المؤسسات بمراجعة وتحديد أولويات الحالات بناءً على مهمتها المحددة
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="glass-card border-white/20 card-hover group">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-8 h-8 text-accent" />
                  </div>
                  <CardTitle className="text-xl">التوزيع</CardTitle>
                  <CardDescription className="text-center">
                    توزيع عادل وشفاف للمساعدات لمن هم في أمس الحاجة إليها
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-6 glass-card mx-6 rounded-3xl border-white/20">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-bold mb-6 gradient-text">للأفراد المتضررين</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">عملية تسجيل آمنة وسرية تضمن خصوصية البيانات</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">نموذج إلكتروني سهل الاستخدام يمكن الوصول إليه من أي جهاز</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">تقييم شفاف بناءً على الاحتياجات الفعلية</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">تحديثات فورية حول حالة الطلب والمساعدات</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-bold mb-6 gradient-text">للمنظمات الإنسانية</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">معايير تقييم قابلة للتخصيص بناءً على مهمتك</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">أدوات دعم القرار المستندة إلى البيانات الدقيقة</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">إمكانيات متقدمة للتصفية وإعداد التقارير</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-foreground leading-relaxed">وصول آمن مع صلاحيات قائمة على الأدوار</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <Card className="glass-card border-white/20 overflow-hidden">
              <CardContent className="pt-16 pb-16 text-center space-y-8">
                <div className="w-20 h-20 mx-auto glass-card rounded-3xl flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-accent" />
                </div>
                <h2 className="text-4xl font-bold">ابدأ رحلتك اليوم</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  سواء كنت بحاجة إلى مساعدة أو كنت منظمة تتطلع لتقديم المساعدة،
                  تجعل منصتنا العملية فعالة وعادلة وشفافة.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button asChild size="lg" className="btn-modern">
                    <Link to="/register">سجل الآن</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="glass-card border-white/20 hover:bg-white/10">
                    <Link to="/institutional-login">دخول المؤسسات</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="glass-card border-white/20 hover:bg-white/10">
                    <Link to="/institution-register">تسجيل مؤسسة جديدة</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
