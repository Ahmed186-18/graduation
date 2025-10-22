import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { ArrowRight, Filter } from "lucide-react";


type FamilyRow = {
  id: string;
  headName: string;
  headIdNumber: string;
  region: string;
  totalMembers: number;
  males: number;
  females: number;
  elderlyCount: number;
  universityStudents: number;
  needIndex: number;
  monthlyIncome: number;
  childrenCount: number;
};

type SortKey = "none" | "need" | "students" | "males" | "females" | "elderly";

function calculateNeedIndex(row: FamilyRow) {
  const sizeScore = Math.min(row.totalMembers * 5, 25);
  const uniScore = Math.min(row.universityStudents * 6, 24);
  const elderlyScore = Math.min(row.elderlyCount * 10, 20);
  const incomePenalty = Math.min(Math.floor(Math.max(row.monthlyIncome, 0) / 100) * 4, 24);
  const raw = sizeScore + uniScore + elderlyScore + (20 - incomePenalty);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function buildNotificationMessage(location: string, date: string, extra: string) {
  const parts = [
    `نود إعلامكم بتوفر طرد مساعدات جاهز للاستلام من المؤسسة.`, 
    `موقع الاستلام: ${location}.`, 
    `تاريخ الاستلام: ${date}.`, 
    `يرجى إحضار الهوية الشخصية عند الحضور.`, 
  ];
  if (extra.trim()) {
    parts.push(extra.trim());
  }
  return parts.join(" ");
}

const InstitutionDashboard = () => {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [institution, setInstitution] = useState<{ name: string; regions: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("need");
  const [notifyFor, setNotifyFor] = useState<FamilyRow | null>(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set());
  const [bulkNotify, setBulkNotify] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterFamilyMembers, setFilterFamilyMembers] = useState<number | "">("");
  const [filterUniversityStudents, setFilterUniversityStudents] = useState<number | "">("");
  const [filterNeedIndex, setFilterNeedIndex] = useState<number | "">("");
  const [filterChildren, setFilterChildren] = useState<number | "">("");
  const [filterFemales, setFilterFemales] = useState<number | "">("");
  const [filterElderly, setFilterElderly] = useState<number | "">("");
  const [filterRegion, setFilterRegion] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("institutionToken");
    if (!token) {
      navigate("/institutional-login");
      return;
    }

    // Fetch institution profile
    fetch("/api/institutions/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then((profile) => {
        setInstitution({ name: profile.name, regions: profile.regions });
      })
      .catch(() => {
        localStorage.removeItem("institutionToken");
        navigate("/institutional-login");
      });
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("institutionToken");
    if (!token || !institution) return;

    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/institutions/cases", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((payload) => {
        if (!active) return;
        const rawList = Array.isArray(payload?.data) ? payload.data : [];
        setFamilies(rawList);
      })
      .catch(() => {
        if (!active) return;
        setError("تعذر تحميل البيانات حالياً. جرّب لاحقاً أو تواصل مع فريق الدعم.");
        setFamilies([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [institution]);

  const familiesInScope = useMemo(() => {
    return families; // All families are already filtered by institution's regions
  }, [families]);

  const filteredFamilies = useMemo(() => {
    let rows = familiesInScope;
    if (query.trim()) {
      const value = query.trim();
      rows = rows.filter((f) => f.headIdNumber.toLowerCase().includes(value.toLowerCase()));
    }

    // Apply advanced numeric filters
    if (filterFamilyMembers !== "") {
      rows = rows.filter((f) => f.totalMembers > Number(filterFamilyMembers));
    }
    if (filterUniversityStudents !== "") {
      rows = rows.filter((f) => f.universityStudents > Number(filterUniversityStudents));
    }
    if (filterNeedIndex !== "") {
      rows = rows.filter((f) => f.needIndex > Number(filterNeedIndex));
    }
    if (filterChildren !== "") {
      rows = rows.filter((f) => f.childrenCount > Number(filterChildren));
    }
    if (filterFemales !== "") {
      rows = rows.filter((f) => f.females > Number(filterFemales));
    }
    if (filterElderly !== "") {
      rows = rows.filter((f) => f.elderlyCount > Number(filterElderly));
    }
    if (filterRegion !== "") {
      rows = rows.filter((f) => f.region === filterRegion);
    }

    switch (sort) {
      case "need":
        rows = [...rows].sort((a, b) => b.needIndex - a.needIndex);
        break;
      case "students":
        rows = [...rows].sort((a, b) => b.universityStudents - a.universityStudents);
        break;
      case "males":
        rows = [...rows].sort((a, b) => b.males - a.males);
        break;
      case "females":
        rows = [...rows].sort((a, b) => b.females - a.females);
        break;
      case "elderly":
        rows = [...rows].sort((a, b) => b.elderlyCount - a.elderlyCount);
        break;
      default:
        break;
    }
    return rows;
  }, [familiesInScope, query, sort, filterFamilyMembers, filterUniversityStudents, filterNeedIndex, filterChildren, filterFemales, filterElderly, filterRegion]);

  const totals = useMemo(() => {
    const base = familiesInScope;
    const totalFamilies = base.length;
    const totalStudents = base.reduce((acc, f) => acc + f.universityStudents, 0);
    const totalElderly = base.reduce((acc, f) => acc + f.elderlyCount, 0);
    return { totalFamilies, totalStudents, totalElderly };
  }, [familiesInScope]);

  const loadingState = loading ? "جار تحميل البيانات..." : null;
  const emptyState = !loading && filteredFamilies.length === 0 ? "لا توجد عائلات مطابقة للمعايير الحالية." : null;

  function resetFilters() {
    setQuery("");
    setSort("need");
    setFilterFamilyMembers("");
    setFilterUniversityStudents("");
    setFilterNeedIndex("");
    setFilterChildren("");
    setFilterFemales("");
    setFilterElderly("");
    setFilterRegion("");
  }

  function openNotification(family: FamilyRow) {
    setNotifyFor(family);
    setPickupLocation("");
    setPickupDate("");
    setExtraNotes("");
  }

  async function sendNotification() {
    if (!notifyFor) return;
    if (!pickupLocation.trim() || !pickupDate.trim()) {
      toast("يرجى تحديد موقع وتاريخ الاستلام قبل الإرسال.");
      return;
    }
    const message = buildNotificationMessage(pickupLocation, pickupDate, extraNotes);
    const token = localStorage.getItem("institutionToken");
    if (!token) {
      toast("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.");
      navigate("/institutional-login");
      return;
    }

    try {
      const res = await fetch("/api/institutions/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetIds: [notifyFor.headIdNumber],
          message,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "not-ok");
      }
      const data = await res.json();
      if (data.totalFailed > 0) {
        toast(`تم إرسال ${data.totalSuccessful} إشعار بنجاح، فشل ${data.totalFailed}.`);
      } else {
        toast(`تم إرسال إشعار لعائلة ${notifyFor.headName}.`);
      }
    } catch {
      toast("فشل في إرسال الإشعار، يرجى المحاولة مرة أخرى.");
    }
    setNotifyFor(null);
  }

  async function sendBulkNotification() {
    if (selectedFamilies.size === 0) {
      toast("يرجى اختيار عائلات لإرسال الإشعار.");
      return;
    }
    if (!pickupLocation.trim() || !pickupDate.trim()) {
      toast("يرجى تحديد موقع وتاريخ الاستلام قبل الإرسال.");
      return;
    }
    const message = buildNotificationMessage(pickupLocation, pickupDate, extraNotes);
    const token = localStorage.getItem("institutionToken");
    if (!token) {
      toast("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى.");
      navigate("/institutional-login");
      return;
    }

    try {
      const res = await fetch("/api/institutions/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetIds: Array.from(selectedFamilies),
          message,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "not-ok");
      }
      const data = await res.json();
      if (data.totalFailed > 0) {
        toast(`تم إرسال ${data.totalSuccessful} إشعار بنجاح، فشل ${data.totalFailed}.`);
      } else {
        toast(`تم إرسال إشعار لـ ${selectedFamilies.size} عائلة.`);
      }
      setSelectedFamilies(new Set());
    } catch {
      toast("فشل في إرسال الإشعارات، يرجى المحاولة مرة أخرى.");
    }
    setBulkNotify(false);
  }

  function exportCsv() {
    if (!filteredFamilies.length) {
      toast("لا توجد بيانات لتصديرها.");
      return;
    }
    const header = [
      "id",
      "headName",
      "headIdNumber",
      "region",
      "totalMembers",
      "males",
      "females",
      "elderlyCount",
      "universityStudents",
      "needIndex",
      "monthlyIncome",
    ];
    const rows = filteredFamilies.map((f) => [
      f.id,
      f.headName,
      f.headIdNumber,
      f.region,
      f.totalMembers,
      f.males,
      f.females,
      f.elderlyCount,
      f.universityStudents,
      f.needIndex,
      f.monthlyIncome,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "institution-families.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleLogout() {
    localStorage.removeItem("institutionToken");
    toast("تم تسجيل الخروج بنجاح");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-primary hover:underline">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للصفحة الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/institution-register">تعديل بيانات المؤسسة</Link>
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              تسجيل الخروج
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">لوحة تحكم {institution?.name || "المؤسسة"}</CardTitle>
            <CardDescription>متابعة الحالات في المناطق المخول بخدمتها وإدارة الإشعارات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>إجمالي العائلات ضمن نطاق المؤسسة</CardDescription>
                  <CardTitle className="text-3xl">{totals.totalFamilies}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>عدد الطلاب الجامعيين</CardDescription>
                  <CardTitle className="text-3xl">{totals.totalStudents}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>عدد المسنين</CardDescription>
                  <CardTitle className="text-3xl">{totals.totalElderly}</CardTitle>
                </CardHeader>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[2fr_3fr]">
              <Card>
                <CardHeader>
                  <CardTitle>المناطق المخول بها</CardTitle>
                  <CardDescription>المناطق التي تخدمها المؤسسة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {institution?.regions && institution.regions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {institution.regions.map((region) => (
                        <Badge key={region} variant="secondary">
                          {region}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لم يتم تحديد مناطق بعد.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>البحث والفرز</CardTitle>
                  <CardDescription>ابحث برقم هوية رب الأسرة أو فرّز حسب الأولوية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="family-search">رقم هوية رب الأسرة</Label>
                      <Input
                        id="family-search"
                        placeholder="أدخل جزءاً من الرقم الوطني"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="family-sort">ترتيب الحالات</Label>
                      <Select value={sort} onValueChange={(value: SortKey) => setSort(value)} defaultValue="need">
                        <SelectTrigger id="family-sort">
                          <SelectValue placeholder="اختيار" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="need">أعلى مؤشر حاجة</SelectItem>
                          <SelectItem value="students">أكثر طلاب جامعيين</SelectItem>
                          <SelectItem value="males">أكثر عدد ذكور</SelectItem>
                          <SelectItem value="females">أكثر عدد إناث</SelectItem>
                          <SelectItem value="elderly">أكثر عدد مسنين</SelectItem>
                          <SelectItem value="none">بدون ترتيب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                      <Filter className="w-4 h-4 ml-2" />
                      {showAdvancedFilters ? "إخفاء" : "عرض"} المرشحات المتقدمة
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      إعادة تعيين
                    </Button>
                  </div>
                  {showAdvancedFilters && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="filter-members">عدد الأفراد أكبر من</Label>
                        <Input
                          id="filter-members"
                          type="number"
                          placeholder="مثال: 5"
                          value={filterFamilyMembers}
                          onChange={(event) => setFilterFamilyMembers(event.target.value === "" ? "" : Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-students">طلاب جامعيين أكبر من</Label>
                        <Input
                          id="filter-students"
                          type="number"
                          placeholder="مثال: 2"
                          value={filterUniversityStudents}
                          onChange={(event) => setFilterUniversityStudents(event.target.value === "" ? "" : Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-need">مؤشر الحاجة أكبر من</Label>
                        <Input
                          id="filter-need"
                          type="number"
                          placeholder="مثال: 50"
                          value={filterNeedIndex}
                          onChange={(event) => setFilterNeedIndex(event.target.value === "" ? "" : Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-children">عدد الأطفال أكبر من</Label>
                        <Input
                          id="filter-children"
                          type="number"
                          placeholder="مثال: 3"
                          value={filterChildren}
                          onChange={(event) => setFilterChildren(event.target.value === "" ? "" : Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-females">عدد الإناث أكبر من</Label>
                        <Input
                          id="filter-females"
                          type="number"
                          placeholder="مثال: 2"
                          value={filterFemales}
                          onChange={(event) => setFilterFemales(event.target.value === "" ? "" : Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-elderly">عدد المسنين أكبر من</Label>
                        <Input
                          id="filter-elderly"
                          type="number"
                          placeholder="مثال: 1"
                          value={filterElderly}
                          onChange={(event) => setFilterElderly(event.target.value === "" ? "" : Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-region">المنطقة</Label>
                        <Select value={filterRegion} onValueChange={setFilterRegion}>
                          <SelectTrigger id="filter-region">
                            <SelectValue placeholder="اختر المنطقة" />
                          </SelectTrigger>
                          <SelectContent>
                            {institution?.regions?.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>قائمة العائلات</CardTitle>
                    <CardDescription>استعرض التفاصيل وأرسل إشعارات الاستلام</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFamilies.size > 0 && (
                      <Dialog open={bulkNotify} onOpenChange={setBulkNotify}>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm" onClick={() => setBulkNotify(true)}>
                            إشعار جماعي ({selectedFamilies.size})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg" dir="rtl">
                          <DialogHeader>
                            <DialogTitle>إشعار استلام جماعي</DialogTitle>
                            <DialogDescription>أدخل تفاصيل موقع وتاريخ الاستلام لإرسال إشعار لـ {selectedFamilies.size} عائلة.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="bulk-pickup-location">موقع الاستلام</Label>
                              <Input
                                id="bulk-pickup-location"
                                placeholder="مثال: مستودع المؤسسة - شارع الملك عبدالله"
                                value={pickupLocation}
                                onChange={(event) => setPickupLocation(event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bulk-pickup-date">تاريخ الاستلام</Label>
                              <Input id="bulk-pickup-date" type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bulk-extra-notes">ملاحظات إضافية</Label>
                              <textarea
                                id="bulk-extra-notes"
                                className="min-h-[90px] w-full rounded border p-2 text-sm"
                                placeholder="يمكنك إضافة تعليمات مثل ساعات الدوام أو أرقام التواصل."
                                value={extraNotes}
                                onChange={(event) => setExtraNotes(event.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter className="flex flex-row-reverse gap-2">
                            <Button onClick={sendBulkNotification}>إرسال الإشعارات</Button>
                            <Button variant="outline" onClick={() => setBulkNotify(false)}>
                              إلغاء
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button variant="outline" onClick={exportCsv}>
                      تصدير كشف CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingState && <p className="text-sm text-muted-foreground">{loadingState}</p>}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {!loadingState && !error && (
                    <div className="overflow-x-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-right">
                              <Checkbox
                                checked={selectedFamilies.size === filteredFamilies.length && filteredFamilies.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFamilies(new Set(filteredFamilies.map(f => f.headIdNumber)));
                                  } else {
                                    setSelectedFamilies(new Set());
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead className="text-right">رقم العائلة</TableHead>
                            <TableHead className="text-right">رب الأسرة</TableHead>
                            <TableHead className="text-right">رقم الهوية</TableHead>
                            <TableHead className="text-right">المنطقة</TableHead>
                            <TableHead className="text-right">مؤشر الحاجة</TableHead>
                            <TableHead className="text-right">عدد الأفراد</TableHead>
                            <TableHead className="text-right">ذكور</TableHead>
                            <TableHead className="text-right">إناث</TableHead>
                            <TableHead className="text-right">جامعيون</TableHead>
                            <TableHead className="text-right">مسنون</TableHead>
                            <TableHead className="text-right">إجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFamilies.map((family) => (
                            <TableRow key={family.id}>
                              <TableCell className="text-right">
                                <Checkbox
                                  checked={selectedFamilies.has(family.headIdNumber)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedFamilies(prev => new Set([...prev, family.headIdNumber]));
                                    } else {
                                      setSelectedFamilies(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(family.headIdNumber);
                                        return newSet;
                                      });
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-right">{family.id.slice(0, 8)}</TableCell>
                              <TableCell className="text-right">{family.headName}</TableCell>
                              <TableCell className="font-mono text-right">{family.headIdNumber}</TableCell>
                              <TableCell className="text-right">{family.region}</TableCell>
                              <TableCell className="text-right font-semibold">{family.needIndex}</TableCell>
                              <TableCell className="text-right">{family.totalMembers}</TableCell>
                              <TableCell className="text-right">{family.males}</TableCell>
                              <TableCell className="text-right">{family.females}</TableCell>
                              <TableCell className="text-right">{family.universityStudents}</TableCell>
                              <TableCell className="text-right">{family.elderlyCount}</TableCell>
                              <TableCell className="text-right">
                                <Dialog open={notifyFor?.id === family.id} onOpenChange={(open) => (!open ? setNotifyFor(null) : openNotification(family))}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={() => openNotification(family)}>
                                      إشعار استلام
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-lg" dir="rtl">
                                    <DialogHeader>
                                      <DialogTitle>إشعار استلام طرد</DialogTitle>
                                      <DialogDescription>أدخل تفاصيل موقع وتاريخ الاستلام لتصل إلى العائلة.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-3">
                                      <div className="text-sm text-muted-foreground">
                                        العائلة: {family.headName} • رقم الهوية: {family.headIdNumber}
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="pickup-location">موقع الاستلام</Label>
                                        <Input
                                          id="pickup-location"
                                          placeholder="مثال: مستودع المؤسسة - شارع الملك عبدالله"
                                          value={pickupLocation}
                                          onChange={(event) => setPickupLocation(event.target.value)}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="pickup-date">تاريخ الاستلام</Label>
                                        <Input id="pickup-date" type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="extra-notes">ملاحظات إضافية</Label>
                                        <textarea
                                          id="extra-notes"
                                          className="min-h-[90px] w-full rounded border p-2 text-sm"
                                          placeholder="يمكنك إضافة تعليمات مثل ساعات الدوام أو أرقام التواصل."
                                          value={extraNotes}
                                          onChange={(event) => setExtraNotes(event.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter className="flex flex-row-reverse gap-2">
                                      <Button onClick={sendNotification}>إرسال الإشعار</Button>
                                      <Button variant="outline" onClick={() => setNotifyFor(null)}>
                                        إلغاء
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {emptyState && <p className="text-sm text-muted-foreground">{emptyState}</p>}
                </CardContent>
              </Card>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstitutionDashboard;
