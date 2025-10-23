import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { TrendingUp, Users, Building2, CheckCircle, Clock, AlertTriangle, Filter } from "lucide-react";

type Family = {
  id: string;
  totalMembers: number;
  numberOfStudents: number;
  elderlyCount: number;
  monthlyIncome: number;
  housingStatus: string;
  headOfFamilyName?: string;
  phoneNumber?: string;
};

type Application = {
  id: string;
  name: string;
  contactEmail: string;
};

type UpdateRequest = {
  id: string;
  familyId: string;
  type: string;
  status: string;
  submittedAt: string;
  details: Record<string, unknown>;
  familyName: string;
};

type FamilyRegistrationRequest = {
  id: string;
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  address: string;
  familyData: {
    totalMembers: number;
    numberOfStudents: number;
    elderlyCount?: number;
    childrenCount?: number;
    wife?: {
      fullName: string;
      idNumber: string;
      dateOfBirth: string;
      gender: 'female';
      isUniversityStudent: boolean;
    };
    members?: Array<{
      fullName: string;
      idNumber: string;
      dateOfBirth: string;
      gender: 'male' | 'female';
      isUniversityStudent: boolean;
    }>;
  };
  submittedAt: string;
};

const AdminDashboard = () => {
  const [summary, setSummary] = useState<{ totalFamilies: number; totalStudents: number; totalElderly: number } | null>(null);
  const [rows, setRows] = useState<Family[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [editRequests, setEditRequests] = useState<UpdateRequest[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<FamilyRegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyPendingRequests, setShowOnlyPendingRequests] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    setLoading(true);

    // Get admin summary
    fetch('/api/admin/summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(r => r.json()).then((s) => setSummary(s))
      .catch(() => setSummary({ totalFamilies: 0, totalStudents: 0, totalElderly: 0 }));

    // Load families data
    fetch('/api/admin/families', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => setRows([]));

    // Load update requests from database
    fetch('/api/admin/update-requests', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(d => setEditRequests(d.data || []))
      .catch(() => setEditRequests([]));

    // Load institution applications
    fetch('/api/admin/institution-applications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(d => setApplications(d.data || []))
      .catch(() => setApplications([]));

    // Load family registration requests
    fetch('/api/admin/family-registration-requests', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(r => r.json())
      .then(d => setRegistrationRequests(d.data || []))
      .catch(() => setRegistrationRequests([]))
      .finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    await fetch(`/api/admin/institution-applications/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  async function reject(id: string) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    await fetch(`/api/admin/institution-applications/${id}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  async function approveEdit(r: UpdateRequest) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    try {
      const response = await fetch(`/api/admin/update-requests/${r.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        console.error("خطأ في تحليل الاستجابة:", parseError);
        alert('حدث خطأ غير متوقع');
        return;
      }

      if (!response.ok) {
        alert(`خطأ: ${errorData.message || 'حدث خطأ غير متوقع'}`);
        return;
      }

      setEditRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'approved' } : x)));
    } catch (error) {
      console.error('Error approving request:', error);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  }

  async function rejectEdit(r: UpdateRequest) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    await fetch(`/api/admin/update-requests/${r.id}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Rejected by admin' })
    });
    setEditRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'rejected' } : x)));
  }

  async function approveRegistration(r: FamilyRegistrationRequest) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    try {
      const response = await fetch(`/api/admin/family-registration-requests/${r.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("خطأ في تحليل الاستجابة:", parseError);
          alert('حدث خطأ غير متوقع');
          return;
        }
        alert(`خطأ: ${errorData.message || 'حدث خطأ غير متوقع'}`);
        return;
      }

      setRegistrationRequests((prev) => prev.filter((x) => x.id !== r.id));
      // Refresh summary to show updated family count
      fetch('/api/admin/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(r => r.json()).then((s) => setSummary(s))
        .catch(() => {});
    } catch (error) {
      console.error('Error approving registration request:', error);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  }

  async function rejectRegistration(r: FamilyRegistrationRequest) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = '/admin-login';
      return;
    }

    const reason = prompt('يرجى إدخال سبب الرفض:');
    if (!reason) return;

    try {
      await fetch(`/api/admin/family-registration-requests/${r.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      setRegistrationRequests((prev) => prev.filter((x) => x.id !== r.id));
    } catch (error) {
      console.error('Error rejecting registration request:', error);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  }

  function renderEditDetails(r: UpdateRequest) {
    const fallback = 'غير محدد';
    const details = r.details ?? {};
    const familyName = r.familyName || fallback;

    const formatText = (value: unknown) => {
      if (typeof value === 'string' && value.trim()) return value;
      if (value !== undefined && value !== null) return String(value);
      return fallback;
    };

    const formatDate = (value: unknown) => {
      if (!value) return fallback;
      const date = new Date(value as string | number | Date);
      return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('ar-EG');
    };

    const formatGender = (value: unknown) => {
      if (!value) return fallback;
      const normalized = String(value).toLowerCase();
      if (normalized === 'male' || normalized === 'ذكر') return 'ذكر';
      if (normalized === 'female' || normalized === 'أنثى') return 'أنثى';
      return fallback;
    };

    const formatBoolean = (value: unknown) => {
      if (typeof value === 'boolean') {
        return value ? 'نعم' : 'لا';
      }
      if (value === 'نعم' || value === 'لا') {
        return value;
      }
      return fallback;
    };

    const getFirstDefined = (sources: Record<string, unknown>[], keys: string[]) => {
      for (const source of sources) {
        if (!source) continue;
        for (const key of keys) {
          const val = source[key];
          if (val !== undefined && val !== null && val !== '') {
            return val;
          }
        }
      }
      return undefined;
    };

    if (r.type === 'region_change') {
      const oldRegion = details.oldRegion || fallback;
      const newRegion = details.newRegion || fallback;
      return `من ${familyName}: تغيير مكان السكن من ${oldRegion} إلى ${newRegion}`;
    }

    if (r.type === 'MEMBER_ADD') {
      const fullName = details.fullName || fallback;
      const idNumber = details.idNumber || fallback;
      const rawDate = details.dateOfBirth || details.birthdate;
      const formattedDate = formatDate(rawDate);
      const gender = formatGender(details.gender);
      const university = formatBoolean(details.isUniversityStudent);
      return `من ${familyName}: إضافة فرد جديد: ${fullName} (رقم الهوية: ${idNumber}, تاريخ الميلاد: ${formattedDate}, النوع: ${gender}, طالب جامعي: ${university})`;
    }

      if (r.type === 'MEMBER_UPDATE') {
        const memberName = details.memberName || details.fullName || details.name || fallback;

        const changes = [];
        if (Array.isArray(details.changes) && details.changes.length) {
          for (const change of details.changes) {
            const field = change.field;
            let label = 'حقل غير محدد';
            if (field === 'fullName') label = 'الاسم';
            else if (field === 'idNumber') label = 'رقم الهوية';
            else if (field === 'dateOfBirth') label = 'تاريخ الميلاد';
            else if (field === 'gender') label = 'النوع';
            else if (field === 'isUniversityStudent') label = 'طالب جامعي';

            const fromValue = change.from;
            const toValue = change.to;

            // Format values based on field type
            let formattedFrom = fromValue;
            let formattedTo = toValue;

            if (field === 'dateOfBirth') {
              formattedFrom = fromValue ? new Date(fromValue).toLocaleDateString('ar-EG') : fallback;
              formattedTo = toValue ? new Date(toValue).toLocaleDateString('ar-EG') : fallback;
            } else if (field === 'gender') {
              formattedFrom = formatGender(fromValue);
              formattedTo = formatGender(toValue);
            } else if (field === 'isUniversityStudent') {
              formattedFrom = formatBoolean(fromValue);
              formattedTo = formatBoolean(toValue);
            } else {
              formattedFrom = formatText(fromValue);
              formattedTo = formatText(toValue);
            }

            changes.push(`تغيير ${label} من ${formattedFrom} إلى ${formattedTo}`);
          }
        }

        const changesText = changes.length ? changes.join('؛ ') : 'لا توجد تغييرات محددة';
        return `من ${familyName}: تعديل ${memberName}: ${changesText}`;
      }

    if (r.type === 'MEMBER_DELETE') {
      const memberName = details.fullName || details.memberName || fallback;
      return `من ${familyName}: حذف الفرد ${memberName}`;
    }

    if (r.type === 'ADDRESS_UPDATE') {
      const newAddress = details.newAddress || fallback;
      return `من ${familyName}: تغيير العنوان إلى ${newAddress}`;
    }

    const typeLabel = formatText(r.type);
    return `من ${familyName}: ${typeLabel}`;
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
        {/* Enhanced Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-white/20 card-hover group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>إجمالي العائلات</CardDescription>
                <Users className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-3xl gradient-text">{summary?.totalFamilies ?? '—'}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card border-white/20 card-hover group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>إجمالي الطلاب</CardDescription>
                <TrendingUp className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-3xl gradient-text">{summary?.totalStudents ?? '—'}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card border-white/20 card-hover group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>إجمالي المسنين</CardDescription>
                <CheckCircle className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-3xl gradient-text">{summary?.totalElderly ?? '—'}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card border-white/20 card-hover group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>طلبات المؤسسات</CardDescription>
                <Building2 className="h-5 w-5 text-warning group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-3xl gradient-text">{applications.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Enhanced Update Requests Card */}
        <Card className="mb-6 glass-card border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  طلبات تعديل بيانات العائلات
                </CardTitle>
                <CardDescription>مراجعة وقبول أو رفض الطلبات المرسلة من العائلات</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setShowOnlyPendingRequests(!showOnlyPendingRequests)}>
                {showOnlyPendingRequests ? "عرض الكل" : "إخفاء المكتملة"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="modern-table">
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">نوع الطلب</TableHead>
                  <TableHead className="text-right">تفاصيل</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editRequests.filter((x) => x.status !== 'cancelled' && (!showOnlyPendingRequests || x.status === 'pending')).map((r, idx) => (
                  <TableRow key={r.id || idx} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-right">{new Date(r.submittedAt).toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="text-right">
                      {r.type === 'MEMBER_ADD' ? 'إضافة فرد' :
                       r.type === 'MEMBER_UPDATE' ? 'تعديل فرد' :
                       r.type === 'MEMBER_DELETE' ? 'حذف فرد' :
                       r.type === 'ADDRESS_UPDATE' ? 'تغيير العنوان' : r.type}
                    </TableCell>
                    <TableCell className="text-right">{renderEditDetails(r)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={
                        r.status === 'pending' ? 'secondary' :
                        r.status === 'approved' ? 'default' :
                        r.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {r.status === 'pending' ? 'قيد المراجعة' : r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'ملغي'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2 rtl:space-x-reverse">
                      {r.status === 'pending' && (
                        <>
                          <Button size="sm" className="btn-modern" onClick={() => approveEdit(r)}>قبول</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectEdit(r)}>رفض</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {editRequests.filter((x) => x.status !== 'cancelled' && (!showOnlyPendingRequests || x.status === 'pending')).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      لا توجد طلبات تعديل حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Enhanced Institution Applications Card */}
        <Card className="mb-6 glass-card border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              طلبات تسجيل المؤسسات
            </CardTitle>
            <CardDescription>قبول أو رفض طلبات الانضمام</CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="modern-table">
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10">
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a: Application) => (
                  <TableRow key={a.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium text-right">{a.name}</TableCell>
                    <TableCell className="text-right">{a.contactEmail}</TableCell>
                    <TableCell className="space-x-2 rtl:space-x-reverse text-right">
                      <Button size="sm" className="btn-modern" onClick={() => approve(a.id)}>قبول</Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(a.id)}>رفض</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      لا توجد طلبات حالياً
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Family Registration Requests Card */}
        <Card className="glass-card border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              طلبات تسجيل العائلات
            </CardTitle>
            <CardDescription>مراجعة وقبول أو رفض طلبات تسجيل العائلات الجديدة</CardDescription>
          </CardHeader>
          <CardContent>
            <Table className="modern-table">
              <TableHeader>
                <TableRow className="bg-primary/10 hover:bg-primary/10">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">رقم الهوية</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">إجمالي الأفراد</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrationRequests.map((r: FamilyRegistrationRequest) => (
                  <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-right">{new Date(r.submittedAt).toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="font-medium text-right">{r.fullName}</TableCell>
                    <TableCell className="text-right">{r.idNumber}</TableCell>
                    <TableCell className="text-right">{r.phoneNumber}</TableCell>
                    <TableCell className="text-right">{r.address}</TableCell>
                    <TableCell className="text-right">{r.familyData.totalMembers}</TableCell>
                    <TableCell className="space-x-2 rtl:space-x-reverse text-right">
                      <Button size="sm" className="btn-modern" onClick={() => approveRegistration(r)}>قبول</Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectRegistration(r)}>رفض</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {registrationRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      لا توجد طلبات تسجيل حالياً
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

export default AdminDashboard;
