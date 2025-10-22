import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";

// Regions constant
const REGIONS = ["غزة", "شمال غزة", "دير البلح", "النصيرات", "خان يونس", "رفح"] as const;

// Types
interface Member {
  name: string;
  idNumber: string;
  birthdate: string; // ISO date
  gender: "ذكر" | "أنثى";
  isUniversityStudent?: boolean;
}

interface FamilyRow {
  id: string;
  headName: string;
  headIdNumber: string;
  region: (typeof REGIONS)[number];
  totalMembers: number;
  numberOfStudents: number; // school students
  elderlyCount: number;
  childrenCount?: number;
  femaleCount?: number;
  monthlyIncome: number;
  members?: Member[]; // optional from API; present in demo
}

// Demo dataset to enrich details while APIs are being finalized
const DEMO_FAMILIES: FamilyRow[] = [
  {
    id: "FAM-001-XXXX",
    headName: "أحمد محمد",
    headIdNumber: "401234567",
    region: "غزة",
    totalMembers: 6,
    numberOfStudents: 2,
    elderlyCount: 1,
    monthlyIncome: 300,
    members: [
      { name: "أحمد محمد", idNumber: "401234567", birthdate: "1978-03-12", gender: "ذكر" },
      { name: "فاطمة علي", idNumber: "401234568", birthdate: "1982-11-02", gender: "أنثى" },
      { name: "سارة أحمد", idNumber: "401234569", birthdate: "2004-05-21", gender: "أنثى", isUniversityStudent: true },
      { name: "محمد أحمد", idNumber: "401234570", birthdate: "2007-09-10", gender: "ذكر" },
      { name: "خديجة أحمد", idNumber: "401234571", birthdate: "2010-01-05", gender: "أنثى" },
      { name: "الحاج حسن", idNumber: "401234572", birthdate: "1955-06-15", gender: "ذكر" },
    ],
  },
  {
    id: "FAM-002-XXXX",
    headName: "محمود يوسف",
    headIdNumber: "401777777",
    region: "خان يونس",
    totalMembers: 4,
    numberOfStudents: 1,
    elderlyCount: 0,
    monthlyIncome: 0,
    members: [
      { name: "محمود يوسف", idNumber: "401777777", birthdate: "1988-07-22", gender: "ذكر" },
      { name: "ريم خالد", idNumber: "401777778", birthdate: "1991-03-30", gender: "أنثى" },
      { name: "أنس محمود", idNumber: "401777779", birthdate: "2012-12-01", gender: "ذكر" },
      { name: "سلمى محمود", idNumber: "401777780", birthdate: "2016-04-18", gender: "أنثى" },
    ],
  },
  {
    id: "FAM-003-XXXX",
    headName: "ليث إبراهيم",
    headIdNumber: "402000111",
    region: "رفح",
    totalMembers: 8,
    numberOfStudents: 3,
    elderlyCount: 2,
    monthlyIncome: 500,
    members: [
      { name: "ليث إبراهيم", idNumber: "402000111", birthdate: "1975-01-01", gender: "ذكر" },
      { name: "سعاد محمد", idNumber: "402000112", birthdate: "1979-08-09", gender: "أنثى" },
      { name: "إبراهيم ليث", idNumber: "402000113", birthdate: "2001-02-14", gender: "ذكر", isUniversityStudent: true },
      { name: "هالة ليث", idNumber: "402000114", birthdate: "2003-10-30", gender: "أنثى", isUniversityStudent: true },
      { name: "نادر ليث", idNumber: "402000115", birthdate: "2008-05-06", gender: "ذكر" },
      { name: "ندى ليث", idNumber: "402000116", birthdate: "2011-02-20", gender: "أنثى" },
      { name: "الحاج عيسى", idNumber: "402000117", birthdate: "1950-12-12", gender: "ذكر" },
      { name: "الحاجة أمينة", idNumber: "402000118", birthdate: "1954-07-07", gender: "أنثى" },
    ],
  },
];

function yearsFrom(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return y;
}

// Helper function to calculate need index (copied from server)
function calculateNeedIndex(
  input: { familySize: number; numberOfStudents: number; elderlyCount: number; childrenCount: number; femaleCount: number },
  weights: Record<string, number>,
  thresholds: { high: number; medium: number }
): { score: number } {
  const attributeValues = {
    familySize: input.familySize,
    numberOfStudents: input.numberOfStudents,
    elderlyCount: input.elderlyCount,
    childrenCount: input.childrenCount,
    femaleCount: input.femaleCount,
  };

  let score = 0;
  for (const key of Object.keys(weights)) {
    const weight = weights[key] ?? 0;
    const value = attributeValues[key as keyof typeof attributeValues] ?? 0;
    score += value * weight;
  }

  return { score };
}

function computeNeedIndex(f: FamilyRow): number {
  // Calculate childrenCount and femaleCount from members if available
  let childrenCount = f.childrenCount ?? 0;
  let femaleCount = f.femaleCount ?? 0;
  if (f.members && f.members.length > 0) {
    childrenCount = f.members.filter(m => yearsFrom(m.birthdate) < 18).length;
    femaleCount = f.members.filter(m => m.gender === "أنثى").length;
  }

  // Use the same calculation as the server
  const input = {
    familySize: f.totalMembers,
    numberOfStudents: f.numberOfStudents,
    elderlyCount: f.elderlyCount,
    childrenCount,
    femaleCount,
  };

  const weights = {
    familySize: 2,
    numberOfStudents: 3,
    elderlyCount: 4,
    childrenCount: 3,
    femaleCount: 2,
  };

  const thresholds = { high: 12, medium: 6 };

  const result = calculateNeedIndex(input, weights, thresholds);
  return result.score;
}

const AdminFamilies = () => {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [filter, setFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [activeFamily, setActiveFamily] = useState<FamilyRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    setLoading(true);
    // Try to load from API, fallback to demo dataset
    fetch("/api/admin/families", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((r) => r.json())
      .then((d) => {
        const mapped: FamilyRow[] = (d.data || []).map((f: Record<string, unknown>, i: number) => ({
          id: String(f.id),
          headName: String(f.headName || `رب الأسرة ${i + 1}`),
          headIdNumber: String(f.headId || "—"),
          region: ((): FamilyRow["region"] => {
            const adr = String(f.address || "");
            const hit = REGIONS.find((r) => adr.includes(r));
            return (hit || REGIONS[i % REGIONS.length]) as FamilyRow["region"];
          })(),
          totalMembers: Number(f.totalMembers) || 0,
          numberOfStudents: Number(f.numberOfStudents) || 0,
          elderlyCount: Number(f.elderlyCount) || 0,
          childrenCount: Number((f as Record<string, unknown>).childrenCount) || 0,
          femaleCount: Number((f as Record<string, unknown>).femaleCount) || 0,
          monthlyIncome: Number(f.monthlyIncome) || 0,
          members: Array.isArray(f.members) ? f.members.map((m: Record<string, unknown>) => ({
            name: String(m.name),
            idNumber: String(m.idNumber),
            birthdate: String(m.birthdate),
            gender: m.gender === "ذكر" ? "ذكر" : "أنثى",
            isUniversityStudent: Boolean(m.isUniversityStudent)
          })) : [],
        }));
        setFamilies(mapped.length ? mapped : DEMO_FAMILIES);
      })
      .catch(() => setFamilies(DEMO_FAMILIES))
      .finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(() => {
    const byRegion: Record<string, number> = Object.fromEntries(REGIONS.map((r) => [r, 0]));
    families.forEach((f) => {
      byRegion[f.region] = (byRegion[f.region] || 0) + 1;
    });
    const distribution = REGIONS.map((r) => ({ region: r, count: byRegion[r] || 0 }));
    return { total: families.length, distribution };
  }, [families]);

  const rows = useMemo(() => {
    let r = families;
    if (regionFilter) r = r.filter((f) => f.region === regionFilter);
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      r = r.filter(
        (f) =>
          f.id.toLowerCase().includes(q) ||
          f.headName.toLowerCase().includes(q) ||
          f.headIdNumber.toLowerCase().includes(q) ||
          f.region.toLowerCase().includes(q),
      );
    }
    return r;
  }, [families, filter, regionFilter]);

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

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Analytics */}
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="animate-slide-up">
            <CardHeader className="pb-2">
              <CardDescription>إجمالي العائلات</CardDescription>
              <CardTitle className="text-3xl gradient-text">{analytics.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="md:col-span-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-2">
              <CardTitle>توزيع العائلات حسب المناطق</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ count: { label: "عدد العائلات", color: "hsl(var(--primary))" } }}
                className="w-full h-[240px]"
              >
                <BarChart data={analytics.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle className="gradient-text">قائمة العائلات</CardTitle>
            <CardDescription>استعرض العائلات مع إمكانية البحث والتصفية والدخول إلى التفاصيل</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6 items-center">
              <Input placeholder="بحث بالرقم/الاسم/المنطقة" className="max-w-sm focus-modern" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <Select value={regionFilter || "all"} onValueChange={(v) => setRegionFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[200px] focus-modern"><SelectValue placeholder="كل المناطق" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المناطق</SelectItem>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                      <TableHead className="text-right">رقم الهوية</TableHead>
                  <TableHead className="text-right">رب الأسرة</TableHead>
                  <TableHead className="text-right">المنطقة</TableHead>
                  <TableHead className="text-right">أفراد</TableHead>
                  <TableHead className="text-right">طلاب</TableHead>
                  <TableHead className="text-right">مسنين</TableHead>
                  <TableHead className="text-right">مقياس الحاجة</TableHead>
                  <TableHead className="text-right">تفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => {
                  const need = computeNeedIndex(f);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-right">{f.headIdNumber}</TableCell>
                      <TableCell className="text-right">{f.headName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{f.region}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{f.totalMembers}</TableCell>
                      <TableCell className="text-right">{f.numberOfStudents}</TableCell>
                      <TableCell className="text-right">{f.elderlyCount}</TableCell>
                      <TableCell className="text-right w-56">
                        <div className="flex items-center gap-2">
                          <Progress value={need} className="w-40" />
                          <span className="font-mono text-sm">{need}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="glass" onClick={() => setActiveFamily(f)} aria-label={`عرض تفاصيل العائلة ${f.familyName}`}>
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">لا توجد نتائج مطابقة</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={activeFamily !== null} onOpenChange={(isOpen) => !isOpen && setActiveFamily(null)}>
          <DialogContent className="max-w-4xl animate-scale-in">
            <DialogHeader>
              <DialogTitle className="gradient-text">تفاصيل العائلة</DialogTitle>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="sm"
                  className="btn-modern"
                  onClick={async () => {
                    if (!confirm('هل أنت متأكد من حذف هذه العائلة؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
                    try {
                      const token = localStorage.getItem('adminToken');
                      const response = await fetch(`/api/admin/families/${activeFamily!.id}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (response.ok) {
                        setFamilies(prev => prev.filter(f => f.id !== activeFamily!.id));
                        setActiveFamily(null);
                        alert('تم حذف العائلة بنجاح');
                      } else {
                        alert('فشل في حذف العائلة');
                      }
                    } catch (error) {
                      console.error('Error deleting family:', error);
                      alert('حدث خطأ أثناء حذف العائلة');
                    }
                  }}
                >
                  حذف العائلة
                </Button>
              </div>
            </DialogHeader>
            {activeFamily && (
              <div className="space-y-4" dir="rtl">
                <div className="grid md:grid-cols-3 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>رب الأسرة</CardDescription>
                      <CardTitle className="text-xl">{activeFamily.headName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">رقم الهوية: {activeFamily.headIdNumber}</div>
                      <div className="text-sm text-muted-foreground">المنطقة: {activeFamily.region}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>إحصاءات</CardDescription>
                      <CardTitle className="text-xl">العائلة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>الأفراد: <span className="font-medium">{activeFamily.totalMembers}</span></div>
                        <div>الطلاب: <span className="font-medium">{activeFamily.numberOfStudents}</span></div>
                        <div>المسنين: <span className="font-medium">{activeFamily.elderlyCount}</span></div>
                        <div>الأطفال: <span className="font-medium">{(() => {
                          const members = (activeFamily.members || []) as Member[];
                          return members.filter((m) => yearsFrom(m.birthdate) < 18).length;
                        })()}</span></div>
                        <div>Need Index: <span className="font-medium">{computeNeedIndex(activeFamily)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>الجنس</CardDescription>
                      <CardTitle className="text-xl">حسب النوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const members = (activeFamily.members || []) as Member[];
                        const males = members.filter((m) => m.gender === "ذكر").length;
                        const females = members.filter((m) => m.gender === "أنثى").length;
                        const uni = members.filter((m) => m.isUniversityStudent).length;
                        return (
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>ذكور: <span className="font-medium">{males}</span></div>
                            <div>إناث: <span className="font-medium">{females}</span></div>
                            <div>جامعيون: <span className="font-medium">{uni}</span></div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <div className="font-semibold mb-2">أفراد العائلة</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">الهوية</TableHead>
                        <TableHead className="text-right">تاريخ الميلاد</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">مسن/طالب جامعي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activeFamily.members || []).map((m) => {
                        const age = yearsFrom(m.birthdate);
                        return (
                          <TableRow key={m.idNumber}>
                            <TableCell className="text-right">{m.name}</TableCell>
                            <TableCell className="text-right font-mono">{m.idNumber}</TableCell>
                            <TableCell className="text-right">{(() => { try { return new Date(m.birthdate).toLocaleDateString("ar-EG"); } catch { return new Date(m.birthdate).toLocaleDateString(); } })()}</TableCell>
                            <TableCell className="text-right">{m.gender}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap gap-2">
                                {age >= 60 && <Badge variant="secondary">مسن</Badge>}
                                {m.isUniversityStudent && <Badge variant="secondary">طالب جامعي</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminFamilies;
