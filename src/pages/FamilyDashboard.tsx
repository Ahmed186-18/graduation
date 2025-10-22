
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, Trash2 } from "lucide-react";
import { randomId } from "@/lib/random-id";

const REGIONS = ["غزة", "شمال غزة", "دير البلح", "النصيرات", "خان يونس", "رفح"] as const;

type Gender = "male" | "female";

interface FamilyProfile {
  idNumber: string;
  fullName: string;
  region: string;
}

interface Member {
  id: number; // Database ID
  fullName: string;
  idNumber: string;
  dateOfBirth: string; // yyyy-mm-dd
  gender: Gender;
  isUniversityStudent?: boolean;
  isHead?: boolean; // Flag for head of family
  isWife?: boolean; // Flag for wife
}

interface UpdateRequest {
  id: string;
  createdAt: string; // ISO
  status: "pending" | "approved" | "rejected" | "cancelled";
  type: "MEMBER_ADD" | "MEMBER_UPDATE" | "MEMBER_DELETE" | "ADDRESS_UPDATE";
  payload: Record<string, unknown>;
  rejectionReason?: string;
}

interface FamilyNotification {
  id: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

async function loadNotificationsFor(token: string) {
  try {
    const response = await fetch("/api/family/notifications", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("فشل في تحميل الإشعارات");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("خطأ في تحميل الإشعارات:", error);
    throw error;
  }
}



function yearsFrom(dob: string) {
  if (!dob) return 0;
  const d = new Date(dob);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return y;
}

const FamilyDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<FamilyProfile | null>(null);
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // Edit region state
  const [regionDraft, setRegionDraft] = useState<string>("");
  const [savingRegion, setSavingRegion] = useState(false);

  // Member dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [isCreate, setIsCreate] = useState(false);
  const [savingMember, setSavingMember] = useState(false);

  // Derived counts
  const elderlyCount = useMemo(() => members.filter((m) => yearsFrom(m.dateOfBirth) >= 60).length, [members]);
  const uniCount = useMemo(() => members.filter((m) => m.isUniversityStudent).length, [members]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/family-login");
      return null;
    }
    return token;
  };

  const fetchFamilyData = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/family/profile", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في تحميل بيانات العائلة");
      }

      const data = await response.json();

      if (!data.headOfFamily || !data.family) {
        throw new Error("بيانات العائلة غير صحيحة");
      }

      const profileData: FamilyProfile = {
        idNumber: data.headOfFamily.idNumber,
        fullName: data.headOfFamily.fullName,
        region: data.family.address,
      };
      setProfile(profileData);
      setRegionDraft(profileData.region);

      const headMember: Member = {
        id: data.headOfFamily.id, // Use the actual ID
        fullName: data.headOfFamily.fullName,
        idNumber: data.headOfFamily.idNumber,
        dateOfBirth: "", // Head of family DOB is not stored
        gender: "male",
        isHead: true,
      };

      const otherMembers: Member[] = (data.members || []).map((member: Record<string, unknown>) => ({
        id: member.id as number,
        fullName: member.fullName as string,
        idNumber: member.idNumber as string,
        dateOfBirth: (member.dateOfBirth as string)?.split('T')[0] || '',
        gender: (member.gender as Gender) || "male",
        isUniversityStudent: member.isUniversityStudent as boolean,
        isHead: false,
        isWife: member.isWife as boolean,
      }));

      setMembers([headMember, ...otherMembers]);

      // Load update requests from backend
      fetchUpdateRequests(token);

    } catch (error) {
      console.error("خطأ في تحميل بيانات العائلة:", error);
      toast.error("فشل في تحميل بيانات العائلة");
      // navigate("/family-login");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load session + database data
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchFamilyData(token);
      fetchNotifications(token);
    }
  }, [navigate, fetchFamilyData]);

  const fetchUpdateRequests = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/family/requests", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("فشل في تحميل طلبات التعديل");
      }

      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error("خطأ في تحميل طلبات التعديل:", error);
      toast.error("فشل في تحميل طلبات التعديل");
    }
  }, []);

  const fetchNotifications = useCallback(async (token: string) => {
    try {
      const data = await loadNotificationsFor(token);
      setNotifications(data);
    } catch (error) {
      console.error("خطأ في تحميل الإشعارات:", error);
      toast.error("فشل في تحميل الإشعارات");
    }
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Load update requests when component mounts
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchUpdateRequests(token);
      fetchNotifications(token);
    }
  }, [fetchUpdateRequests, fetchNotifications]);

  async function saveRegionChange() {
    const token = getToken();
    if (!profile || !token) return;
    if (!regionDraft || regionDraft === profile.region) return;

    setSavingRegion(true);
    try {
      const response = await fetch("/api/family/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "ADDRESS_UPDATE",
          payload: {
            oldAddress: profile.region,
            newAddress: regionDraft,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إرسال طلب تحديث المنطقة");
      }

      toast.success("تم إرسال طلب تحديث منطقة السكن بنجاح");
      fetchUpdateRequests(token); // Refresh requests
      setRegionDraft(profile.region); // Reset to current
    } catch (error) {
      console.error("Error creating region update request:", error);
      toast.error("خطأ", { description: error instanceof Error ? error.message : "حدث خطأ غير متوقع" });
    } finally {
      setSavingRegion(false);
    }
  }

  function openEditMember(m: Member) {
    setIsCreate(false);
    setEditingMember({ ...m });
    setDialogOpen(true);
  }

  function openCreateMember() {
    setIsCreate(true);
    setEditingMember({ fullName: "", idNumber: "", dateOfBirth: "2000-01-01", gender: "male", isUniversityStudent: false });
    setDialogOpen(true);
  }

  async function saveMember() {
    const token = getToken();
    if (!editingMember || !token) return;

    const { fullName, idNumber, dateOfBirth, gender, isUniversityStudent } = editingMember;
    if (!fullName || !idNumber || !dateOfBirth || !gender) {
      toast.error("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    setSavingMember(true);
    try {
      const requestType = isCreate ? "MEMBER_ADD" : "MEMBER_UPDATE";
      let payload;
      if (isCreate) {
        payload = { fullName, idNumber, dateOfBirth, gender, isUniversityStudent };
      } else {
        // For updates, find the original member and compute changes
        const originalMember = members.find(m => m.id === editingMember.id);
        if (!originalMember) {
          throw new Error("الفرد غير موجود");
        }

        const changes = [];
        if (fullName !== originalMember.fullName) {
          changes.push({ field: 'fullName', from: originalMember.fullName, to: fullName });
        }
        if (idNumber !== originalMember.idNumber) {
          changes.push({ field: 'idNumber', from: originalMember.idNumber, to: idNumber });
        }
        const originalDateStr = originalMember.dateOfBirth;
        if (dateOfBirth !== originalDateStr) {
          changes.push({ field: 'dateOfBirth', from: originalMember.dateOfBirth, to: dateOfBirth });
        }
        if (gender !== originalMember.gender) {
          changes.push({ field: 'gender', from: originalMember.gender, to: gender });
        }
        if (isUniversityStudent !== originalMember.isUniversityStudent) {
          changes.push({ field: 'isUniversityStudent', from: originalMember.isUniversityStudent, to: isUniversityStudent });
        }

        if (changes.length === 0) {
          toast.error("لم يتم إجراء أي تغييرات.");
          setSavingMember(false);
          return;
        }

        payload = {
          memberId: editingMember.id,
          memberName: originalMember.fullName,
          changes,
        };
      }

      const response = await fetch("/api/family/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ type: requestType, payload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إرسال طلب تعديل الفرد");
      }

      toast.success(isCreate ? "تم إرسال طلب إضافة فرد بنجاح" : "تم إرسال طلب تحديث بيانات الفرد بنجاح");
      setDialogOpen(false);
      setEditingMember(null);
      fetchUpdateRequests(token); // Refresh requests
    } catch (error) {
      console.error("Error creating member update request:", error);
      toast.error("خطأ", { description: error instanceof Error ? error.message : "حدث خطأ غير متوقع" });
    } finally {
      setSavingMember(false);
    }
  }

  async function deleteMember(memberId: number) {
    if (!window.confirm("هل أنت متأكد من حذف هذا الفرد؟ سيتم إرسال طلب للمراجعة.")) return;

    const token = getToken();
    if (!token) return;

    const member = members.find(m => m.id === memberId);
    if (!member) {
      toast.error("الفرد غير موجود");
      return;
    }

    try {
      const response = await fetch("/api/family/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "MEMBER_DELETE",
          payload: { memberId, fullName: member.fullName },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إرسال طلب حذف الفرد");
      }

      toast.success("تم إرسال طلب حذف الفرد بنجاح");
      fetchUpdateRequests(token); // Refresh requests
    } catch (error) {
      console.error("Error creating member delete request:", error);
      toast.error("خطأ", { description: error instanceof Error ? error.message : "حدث خطأ غير متوقع" });
    }
  }

  async function cancelRequest(r: UpdateRequest) {
    if (!r || r.status !== "pending") return;

    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/family/requests/${r.id}/cancel`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل إلغاء الطلب");
      }

      toast.success("تم إلغاء الطلب بنجاح");
      fetchUpdateRequests(token); // Refresh requests
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("خطأ", { description: error instanceof Error ? error.message : "حدث خطأ غير متوقع" });
    }
  }

  function renderRequestDetails(r: UpdateRequest) {
    try {
      if (r.type === "ADDRESS_UPDATE") {
        const payload = r.payload as { oldAddress?: string; newAddress?: string } || {};
        const oldAddress = payload.oldAddress;
        const newAddress = payload.newAddress;
        return (
          <div className="text-sm">
            تغيير منطقة السكن من <Badge variant="secondary">{oldAddress}</Badge> إلى <Badge variant="secondary">{newAddress}</Badge>
          </div>
        );
      }
      if (r.type === "MEMBER_ADD") {
        const payload = r.payload as { fullName?: string; idNumber?: string; dateOfBirth?: string; gender?: string; isUniversityStudent?: boolean } || {};
        const { fullName, idNumber, dateOfBirth, gender, isUniversityStudent } = payload;
        const formattedDate = dateOfBirth ? new Date(dateOfBirth).toLocaleDateString("ar-EG") : "";
        return (
          <div className="text-sm">
            إضافة فرد جديد: {fullName} (رقم الهوية: {idNumber}, تاريخ الميلاد: {formattedDate}, النوع: {gender}, طالب جامعي: {isUniversityStudent ? "نعم" : "لا"})
          </div>
        );
      }
      if (r.type === "MEMBER_UPDATE") {
        const payload = r.payload as { memberId?: number; memberName?: string; changes?: Array<{ field: string; from: unknown; to: unknown }> } || {};
        const memberId = payload.memberId;
        const currentMember = members.find(m => m.id === memberId);
        if (!currentMember) return <div className="text-sm">تحديث فرد (معرف: {memberId})</div>;

        const changes = [];
        const { changes: payloadChanges } = payload;

        if (payloadChanges) {
          payloadChanges.forEach(change => {
            const { field, from, to } = change;
            if (field === 'fullName') {
              changes.push(`تغيير الاسم من ${from} إلى ${to}`);
            } else if (field === 'idNumber') {
              changes.push(`تغيير رقم الهوية من ${from} إلى ${to}`);
            } else if (field === 'dateOfBirth') {
              const oldDate = from ? new Date(from as string).toLocaleDateString("ar-EG") : "غير محدد";
              const newDate = to ? new Date(to as string).toLocaleDateString("ar-EG") : "غير محدد";
              changes.push(`تغيير تاريخ الميلاد من ${oldDate} إلى ${newDate}`);
            } else if (field === 'gender') {
              changes.push(`تغيير النوع من ${from} إلى ${to}`);
            } else if (field === 'isUniversityStudent') {
              const oldUni = from ? "نعم" : "لا";
              const newUni = to ? "نعم" : "لا";
              changes.push(`تغيير الطالب الجامعي من ${oldUni} إلى ${newUni}`);
            }
          });
        }

        return (
          <div className="text-sm">
            {changes.length > 0 ? changes.join("؛ ") : "لا توجد تغييرات"}
          </div>
        );
      }
      if (r.type === "MEMBER_DELETE") {
        const payload = r.payload as { memberId?: number } || {};
        const memberId = payload.memberId;
        const member = members.find(m => m.id === memberId);
        return (
          <div className="text-sm">
            حذف الفرد: {member ? member.fullName : `معرف ${memberId}`}
          </div>
        );
      }
      return null;
    } catch {
      return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.payload, null, 2)}</pre>;
    }
  }

  if (loading) {
    return <div className="p-8 text-center">جاري تحميل بيانات العائلة...</div>;
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">بوابة العائلة</h1>
          <div className="flex items-center gap-3">

            <span className="text-sm text-muted-foreground">{profile.idNumber}</span>
            <Button variant="outline" onClick={() => { localStorage.removeItem("token"); navigate("/family-login"); }}>تسجيل الخروج</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <Card>
          <CardHeader>
            <CardTitle>مرحباً، {profile.fullName}</CardTitle>
            <CardDescription>يمكنك استعراض بيانات عائلتك وتعديل منطقة السكن وإرسال طلبات تعديل الأفراد</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div>
                <div className="text-sm text-muted-foreground mb-1">منطقة السكن الحالية</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{profile.region}</Badge>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">تعديل منطقة السكن</Label>
                <div className="flex items-center gap-2">
                  <Select value={regionDraft} onValueChange={setRegionDraft}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={saveRegionChange} disabled={savingRegion}>
                    {savingRegion ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>إجمالي عدد الأفراد</CardDescription>
              <CardTitle className="text-3xl">{members.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>الطلاب الجامعيون</CardDescription>
              <CardTitle className="text-3xl">{uniCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>عدد المسنين</CardDescription>
              <CardTitle className="text-3xl">{elderlyCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Receipt Notifications */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>إشعارات الإيصالات</CardTitle>
                <CardDescription>إشعارات الإيصالات والتحديثات المهمة</CardDescription>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllRead}>
                  تمييز الكل كمقروء
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">لا توجد إشعارات</div>
            ) : (
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-4 rounded-lg border ${n.read ? "bg-muted/50" : "bg-background"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>
                          {n.message}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(n.createdAt).toLocaleString("ar-EG")}
                        </div>
                      </div>
                      {!n.read && (
                        <Button size="sm" variant="outline" onClick={() => markNotificationRead(n.id)}>
                          تمييز كمقروء
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>أفراد العائلة</CardTitle>
                <CardDescription>قم بتعديل بيانات كل فرد أو إضافة أفراد جدد</CardDescription>
              </div>
              <Button onClick={openCreateMember}>إضافة فرد</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">رقم الهوية</TableHead>
                  <TableHead className="text-right">تاريخ الميلاد</TableHead>
                  <TableHead className="text-right">الجنس</TableHead>
                  <TableHead className="text-right">جامعي</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                <TableRow key={m.id}>
                    <TableCell className="text-right font-medium">
                      {m.fullName}
                      {m.isHead && <Badge className="mr-2">رب الأسرة</Badge>}
                      {m.isWife && <Badge className="mr-2" variant="outline">زوجة</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.idNumber}</TableCell>
                    <TableCell className="text-right">{m.isHead ? "-" : (() => { try { return new Date(m.dateOfBirth).toLocaleDateString("ar-EG"); } catch { return m.dateOfBirth; } })()}</TableCell>
                    <TableCell className="text-right">{m.gender === "male" ? "ذكر" : m.gender === "female" ? "أنثى" : "غير محدد"}</TableCell>
                    <TableCell className="text-right">{m.isUniversityStudent ? <Badge variant="secondary">نعم</Badge> : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEditMember(m)} disabled={m.isHead}>
                          تعديل
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMember(m.id)} disabled={m.isHead}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">لا يوجد أفراد</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Requests list - Still using mock data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>طلبات التعديل</CardTitle>
                <CardDescription>الطلبات المرسلة لإدارة النظام لمراجعتها</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setShowOnlyPending(!showOnlyPending)}>
                {showOnlyPending ? "عرض الكل" : "إخفاء المكتملة"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.filter(r => !showOnlyPending || r.status === "pending").map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-right">{new Date(r.createdAt).toLocaleString("ar-EG")}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : r.status === "cancelled" ? "outline" : "secondary"}>
                        {r.status === "approved" ? "مقبول" : r.status === "rejected" ? "مرفوض" : r.status === "cancelled" ? "ملغي" : "قيد المراجعة"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.type === "ADDRESS_UPDATE" ? "تعديل المنطقة" :
                       r.type === "MEMBER_ADD" ? "إضافة فرد" :
                       r.type === "MEMBER_UPDATE" ? "تحديث فرد" :
                       r.type === "MEMBER_DELETE" ? "حذف فرد" : r.type}
                    </TableCell>
                    <TableCell className="text-right">{renderRequestDetails(r)}</TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" ? (
                        <Button size="sm" variant="outline" onClick={() => cancelRequest(r)}>إلغاء</Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.filter(r => !showOnlyPending || r.status === "pending").length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد طلبات بعد</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          تحتاج مساعدة؟ تواصل معنا عبر صفحة <Link to="/">الرئيسية</Link>.
        </div>
      </div>

      {/* Edit/Create member dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{isCreate ? "إضافة فرد جديد" : "تعديل بيانات فرد"}</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
              <div className="space-y-2">
                <Label htmlFor="mname">الاسم الكامل</Label>
                <Input id="mname" value={editingMember.fullName} onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mid">رقم الهوية</Label>
                <Input id="mid" value={editingMember.idNumber} onChange={(e) => setEditingMember({ ...editingMember, idNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mbirth">تاريخ الميلاد</Label>
                <Input id="mbirth" type="date" value={editingMember.dateOfBirth} onChange={(e) => setEditingMember({ ...editingMember, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الجنس</Label>
                <Select value={editingMember.gender} onValueChange={(v) => setEditingMember({ ...editingMember, gender: v as Gender })}>
                  <SelectTrigger>
                    <SelectValue>
                      {editingMember.gender || "اختر الجنس"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="uni" checked={!!editingMember.isUniversityStudent} onCheckedChange={(v) => setEditingMember({ ...editingMember, isUniversityStudent: !!v })} />
                <Label htmlFor="uni">طالب جامعي</Label>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
                <Button onClick={saveMember} disabled={savingMember}>
                  {savingMember ? "جاري الحفظ..." : (isCreate ? "إضافة" : "حفظ التعديل")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyDashboard;
