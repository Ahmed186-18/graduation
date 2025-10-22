import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface InstitutionRow {
  id: string;
  name: string;
  contactEmail: string;
  about: string;
  services: string;
  regions: string[];
}

const DEMO_INSTITUTIONS: InstitutionRow[] = [
  { id: "INST-001-XXXX", name: "مؤسسة الخير", contactEmail: "contact@khair.org", about: "مؤسسة خيرية تقدم المساعدات للأسر المحتاجة", services: "توزيع مواد غذائية، مساعدات طبية", regions: ["غزة", "خان يونس"] },
  { id: "INST-002-XXXX", name: "جمعية العطاء", contactEmail: "support@ataa.ps", about: "جمعية متخصصة في دعم التعليم", services: "منح دراسية، دورات تدريبية", regions: ["رفح"] },
];

const REGION_OPTIONS = ["غزة", "شمال غزة", "دير البلح", "النصيرات", "خان يونس", "رفح"];

const ADMIN_REGION_KEY = "adminInstitutionRegions";

function loadStoredRegions(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ADMIN_REGION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistRegions(list: InstitutionRow[]) {
  try {
    const map: Record<string, string[]> = {};
    list.forEach((inst) => {
      map[inst.contactEmail] = Array.isArray(inst.regions) ? inst.regions : [];
    });
    localStorage.setItem(ADMIN_REGION_KEY, JSON.stringify(map));
  } catch {
    // ignore persistence failures
  }
}

function mergeWithStored(list: InstitutionRow[]): InstitutionRow[] {
  const stored = loadStoredRegions();
  if (!Object.keys(stored).length) return list;
  return list.map((inst) => {
    const saved = stored[inst.contactEmail];
    return Array.isArray(saved) && saved.length ? { ...inst, regions: saved } : inst;
  });
}

const AdminInstitutions = () => {
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [filter, setFilter] = useState("");
  const [newRegion, setNewRegion] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    setLoading(true);
    fetch("/api/admin/institutions", {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((r) => r.json())
      .then((d) => {
        const rows: InstitutionRow[] = (d.data || []).map((inst: Record<string, unknown>) => ({
          id: String(inst.id || ''),
          name: String(inst.name || ''),
          contactEmail: String(inst.contactEmail || ''),
          about: String(inst.about || ''),
          services: String(inst.services || ''),
          regions: Array.isArray(inst.regions) ? inst.regions.map(String) : [],
        }));
        const next = mergeWithStored(rows.length ? rows : DEMO_INSTITUTIONS);
        setInstitutions(next);
        persistRegions(next);
      })
      .catch(() => {
        const fallback = mergeWithStored(DEMO_INSTITUTIONS);
        setInstitutions(fallback);
        persistRegions(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return institutions;
    const q = filter.trim().toLowerCase();
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        inst.contactEmail.toLowerCase().includes(q) ||
        inst.regions.some((region) => region.toLowerCase().includes(q))
    );
  }, [institutions, filter]);

  function updateInstitutions(updater: (prev: InstitutionRow[]) => InstitutionRow[]) {
    setInstitutions((prev) => {
      const next = updater(prev);
      persistRegions(next);
      return next;
    });
  }

  async function addRegion(instId: string) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    const region = newRegion.trim();
    if (!region) return;
    try {
      await fetch(`/api/admin/institutions/${instId}/regions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ region }),
      });
    } catch {
      // ignore network errors; UI will still update
    }
    updateInstitutions((prev) =>
      prev.map((inst) =>
        inst.id === instId ? { ...inst, regions: Array.from(new Set([...(inst.regions || []), region])) } : inst
      )
    );
    setNewRegion("");
  }

  async function removeRegion(instId: string, region: string) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    try {
      await fetch(`/api/admin/institutions/${instId}/regions/${encodeURIComponent(region)}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch {
      // ignore network errors; UI will still update
    }
    updateInstitutions((prev) =>
      prev.map((inst) =>
        inst.id === instId ? { ...inst, regions: (inst.regions || []).filter((r) => r !== region) } : inst
      )
    );
  }

  async function deleteInstitution(instId: string) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    try {
      await fetch(`/api/admin/institutions/${instId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch {
      // ignore network errors; UI will still update
    }
    updateInstitutions((prev) => prev.filter((inst) => inst.id !== instId));
  }

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
        <Card className="mb-6 bg-white/80">
          <CardHeader>
            <CardTitle>إدارة المؤسسات</CardTitle>
            <CardDescription>تتبع المؤسسات المسجلة وتحديث المناطق المخولة لكل مؤسسة.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-3">
              <Input
                placeholder="ابحث باسم المؤسسة أو البريد الإلكتروني أو المنطقة"
                className="max-w-md"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-right">اسم المؤسسة</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">نبذة عن المؤسسة</TableHead>
                  <TableHead className="text-right">الخدمات المقدمة</TableHead>
                  <TableHead className="text-right">المناطق المخولة</TableHead>
                  <TableHead className="text-right">إدارة المناطق</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="text-right font-medium">{inst.name}</TableCell>
                    <TableCell className="text-right">{inst.contactEmail}</TableCell>
                    <TableCell className="text-right max-w-xs truncate" title={inst.about}>
                      {inst.about || 'غير محدد'}
                    </TableCell>
                    <TableCell className="text-right max-w-xs truncate" title={inst.services}>
                      {inst.services || 'غير محدد'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap gap-2">
                        {(inst.regions || []).map((region) => (
                          <Badge key={region} variant="secondary" className="flex items-center gap-2 px-2 py-1">
                            <span>{region}</span>
                            <button className="text-destructive hover:underline" onClick={() => removeRegion(inst.id, region)}>
                              إزالة
                            </button>
                          </Badge>
                        ))}
                        {(!inst.regions || inst.regions.length === 0) && (
                          <span className="text-sm text-muted-foreground">لا توجد مناطق محددة بعد.</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedId === inst.id ? newRegion : ""}
                          onValueChange={(value) => {
                            setSelectedId(inst.id);
                            setNewRegion(value);
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="اختر منطقة" />
                          </SelectTrigger>
                          <SelectContent>
                            {REGION_OPTIONS.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={() => addRegion(inst.id)}>
                          إضافة
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => deleteInstitution(inst.id)}>
                        حذف المؤسسة
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      لا توجد مؤسسات مطابقة للبحث الحالي.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminInstitutions;
