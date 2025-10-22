import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, CheckCircle, Plus, Trash2, User, Users, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface FamilyMember {
  fullName: string;
  idNumber: string;
  dateOfBirth: string;
  gender: "male" | "female";
  isUniversityStudent: boolean;
}

const NewRegister = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // البيانات الأساسية
  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    address: "",
  });
  
  // بيانات العائلة
  const [familyData, setFamilyData] = useState({
    wife: null as FamilyMember | null,
    members: [] as FamilyMember[],
  });
  
  // نموذج عضو جديد
  const [newMember, setNewMember] = useState<FamilyMember>({
    fullName: "",
    idNumber: "",
    dateOfBirth: "",
    gender: "male",
    isUniversityStudent: false,
  });
  
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [isWifeDialogOpen, setIsWifeDialogOpen] = useState(false);

  // التحقق من صحة البيانات
  const validateStep1 = () => {
    if (!formData.fullName.trim() || formData.fullName.trim().length < 6) {
      toast.error("الاسم الكامل مطلوب ويجب أن يكون 6 أحرف على الأقل");
      return false;
    }
    
    if (!formData.idNumber.trim() || formData.idNumber.length !== 9) {
      toast.error("رقم الهوية يجب أن يكون مكون من 9 أرقام");
      return false;
    }
    
    if (!formData.phoneNumber.trim() || !/^05[0-9]{8}$/.test(formData.phoneNumber)) {
      toast.error("رقم الهاتف يجب أن يبدأ ب 05 ويتكون من 10 أرقام");
      return false;
    }
    
    if (!formData.password || formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("كلمة المرور غير متطابقة");
      return false;
    }
    
    if (!formData.address.trim()) {
      toast.error("الرجاء اختيار منطقة السكن");
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (familyData.members.length === 0 && !familyData.wife) {
      toast.error("الرجاء إضافة معلومات الزوجة أو أفراد العائلة");
      return false;
    }
    return true;
  };

  // إضافة عضو جديد
  const addFamilyMember = () => {
    if (!newMember.fullName.trim() || !newMember.idNumber.trim() || !newMember.dateOfBirth) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    if (newMember.idNumber.length !== 9) {
      toast.error("رقم الهوية يجب أن يكون مكون من 9 أرقام");
      return;
    }
    
    setFamilyData(prev => ({
      ...prev,
      members: [...prev.members, { ...newMember }]
    }));
    
    setNewMember({
      fullName: "",
      idNumber: "",
      dateOfBirth: "",
      gender: "male",
      isUniversityStudent: false,
    });
    
    setIsMemberDialogOpen(false);
    toast.success("تم إضافة العضو بنجاح");
  };

  // إضافة الزوجة
  const addWife = () => {
    if (!newMember.fullName.trim() || !newMember.idNumber.trim() || !newMember.dateOfBirth) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    if (newMember.idNumber.length !== 9) {
      toast.error("رقم الهوية يجب أن يكون مكون من 9 أرقام");
      return;
    }
    
    setFamilyData(prev => ({
      ...prev,
      wife: { 
        ...newMember, 
        gender: "female" // الزوجة أنثى دائماً
      }
    }));
    
    setNewMember({
      fullName: "",
      idNumber: "",
      dateOfBirth: "",
      gender: "male",
      isUniversityStudent: false,
    });
    
    setIsWifeDialogOpen(false);
    toast.success("تم إضافة الزوجة بنجاح");
  };

  // حذف عضو
  const removeMember = (index: number) => {
    setFamilyData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  // حذف الزوجة
  const removeWife = () => {
    setFamilyData(prev => ({
      ...prev,
      wife: null
    }));
  };

  // حساب إحصائيات العائلة
  const calculateFamilyStats = () => {
    const allMembers = familyData.wife ? [familyData.wife, ...familyData.members] : familyData.members;
    const totalMembers = allMembers.length + 1; // +1 for head of family
    
    let childrenCount = 0;
    let elderlyCount = 0;
    let numberOfStudents = 0;

    allMembers.forEach(member => {
      const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
      if (age < 18) childrenCount++;
      if (age > 60) elderlyCount++;
      if (member.isUniversityStudent) numberOfStudents++;
    });

    return { totalMembers, childrenCount, elderlyCount, numberOfStudents };
  };

  // إرسال البيانات
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    setIsSubmitting(true);
    
    try {
      const stats = calculateFamilyStats();
      
      const payload = {
        fullName: formData.fullName.trim(),
        idNumber: formData.idNumber.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        address: formData.address,
        family: {
          totalMembers: stats.totalMembers,
          numberOfStudents: stats.numberOfStudents,
          elderlyCount: stats.elderlyCount,
          childrenCount: stats.childrenCount,
          wife: familyData.wife,
          members: familyData.members,
        },
      };

      console.log("إرسال البيانات:", payload);

      // التحقق من اتصال الخادم أولاً
      const healthCheck = await fetch("/api/health");
      if (!healthCheck.ok) {
        throw new Error("الخادم غير متاح. تأكد من تشغيل الخادم.");
      }

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // التحقق من نوع الاستجابة
      const contentType = response.headers.get("content-type");
      let result;
      
      try {
        if (contentType && contentType.includes("application/json")) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error("Non-JSON response:", text);
          throw new Error(`استجابة غير صحيحة من الخادم: ${text}`);
        }
      } catch (parseError) {
        console.error("خطأ في تحليل الاستجابة:", parseError);
        throw new Error("فشل في تحليل استجابة الخادم");
      }

      if (!response.ok) {
        console.error("خطأ في الخادم:", result);
        throw new Error(result.message || result.error || `خطأ في الخادم: ${response.status}`);
      }

      // تخزين التوكن والانتقال
      if (result.data && result.data.token) {
        localStorage.setItem("token", result.data.token);
      }

      toast.success("تم التسجيل بنجاح!", {
        description: "تم تسجيل معلوماتك. سنقوم بمراجعة طلبك والتواصل معك قريباً.",
      });
      
            setCurrentStep(3);
    } catch (error) {
      console.error("خطأ في التسجيل:", error);
      
      let errorMessage = "تعذر إرسال الطلب. حاول لاحقاً.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error("حدث خطأ في التسجيل", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stats = calculateFamilyStats();

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary hover:underline">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للصفحة الرئيسية
          </Link>
        </div>

        {currentStep < 3 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="w-6 h-6" />
                تسجيل عائلة جديدة
              </CardTitle>
              <CardDescription>
                الخطوة {currentStep} من 2 - يرجى تقديم معلومات دقيقة لمساعدتنا في تقييم احتياجاتك
              </CardDescription>
              <div className="flex gap-2 mt-4">
                {[1, 2].map((step) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded-full ${
                      step <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* الخطوة الأولى - المعلومات الشخصية */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <User className="w-5 h-5" />
                    المعلومات الشخصية
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">الاسم الكامل (رب الأسرة) *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="أدخل اسمك الكامل"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idNumber">رقم الهوية الوطنية (رب الأسرة) *</Label>
                      <Input
                        id="idNumber"
                        value={formData.idNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                        placeholder="123456789"
                        maxLength={9}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">رقم الهاتف *</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="0599123456"
                        maxLength={10}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="أدخل كلمة المرور"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="أعد إدخال كلمة المرور"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">منطقة السكن *</Label>
                    <Select value={formData.address} onValueChange={(value) => setFormData(prev => ({ ...prev, address: value }))}>
                      <SelectTrigger id="address">
                        <SelectValue placeholder="اختر المنطقة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="غزة">غزة</SelectItem>
                        <SelectItem value="شمال غزة">شمال غزة</SelectItem>
                        <SelectItem value="دير البلح">دير البلح</SelectItem>
                        <SelectItem value="النصيرات">النصيرات</SelectItem>
                        <SelectItem value="خان يونس">خان يونس</SelectItem>
                        <SelectItem value="رفح">رفح</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* الخطوة الثانية - معلومات العائلة */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="w-5 h-5" />
                    معلومات العائلة
                  </div>

                  {/* إضافة الزوجة */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">معلومات الزوجة</Label>
                      {!familyData.wife && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsWifeDialogOpen(true)}
                        >
                          <Plus className="w-4 h-4 ml-2" />
                          إضافة الزوجة
                        </Button>
                      )}
                    </div>

                    {/* عرض بيانات الزوجة */}
                    {familyData.wife && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">ز</span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-900">{familyData.wife.fullName}</h4>
                                <p className="text-sm text-blue-700">الزوجة</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                              <p><span className="font-medium">رقم الهوية:</span> {familyData.wife.idNumber}</p>
                              <p><span className="font-medium">تاريخ الميلاد:</span> {familyData.wife.dateOfBirth}</p>
                              <p><span className="font-medium">الجنس:</span> أنثى</p>
                              <p><span className="font-medium">الحالة:</span> {familyData.wife.isUniversityStudent ? "طالبة جامعية" : "غير طالبة جامعية"}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeWife}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* نافذة إضافة الزوجة */}
                    <Dialog open={isWifeDialogOpen} onOpenChange={setIsWifeDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-xs">ز</span>
                            </div>
                            إضافة معلومات الزوجة
                          </DialogTitle>
                          <DialogDescription>أدخل معلومات الزوجة (أنثى دائماً)</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="wifeName">الاسم الكامل *</Label>
                            <Input
                              id="wifeName"
                              value={newMember.fullName}
                              onChange={(e) => setNewMember(prev => ({ ...prev, fullName: e.target.value }))}
                              placeholder="أدخل اسم الزوجة الكامل"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wifeId">رقم الهوية *</Label>
                            <Input
                              id="wifeId"
                              value={newMember.idNumber}
                              onChange={(e) => setNewMember(prev => ({ ...prev, idNumber: e.target.value }))}
                              placeholder="أدخل رقم هوية الزوجة"
                              maxLength={9}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wifeDob">تاريخ الميلاد *</Label>
                            <Input
                              id="wifeDob"
                              type="date"
                              value={newMember.dateOfBirth}
                              onChange={(e) => setNewMember(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                            />
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Checkbox
                                id="wifeStudent"
                                checked={newMember.isUniversityStudent}
                                onCheckedChange={(checked) => setNewMember(prev => ({ ...prev, isUniversityStudent: checked as boolean }))}
                              />
                              <label htmlFor="wifeStudent" className="text-sm font-medium leading-none text-blue-800">
                                طالبة جامعية
                              </label>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">الجنس: أنثى (محدد تلقائياً)</p>
                          </div>
                          <div className="flex justify-end space-x-2 space-x-reverse">
                            <Button type="button" variant="outline" onClick={() => setIsWifeDialogOpen(false)}>
                              إلغاء
                            </Button>
                            <Button type="button" onClick={addWife} className="bg-blue-600 hover:bg-blue-700">
                              إضافة الزوجة
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* إضافة أفراد العائلة */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">أفراد العائلة الآخرون</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsMemberDialogOpen(true)}
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إضافة فرد
                      </Button>
                    </div>
                    
                    <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>إضافة فرد جديد للعائلة</DialogTitle>
                          <DialogDescription>أدخل معلومات الفرد الجديد</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="memberName">الاسم الكامل *</Label>
                            <Input
                              id="memberName"
                              value={newMember.fullName}
                              onChange={(e) => setNewMember(prev => ({ ...prev, fullName: e.target.value }))}
                              placeholder="أدخل الاسم الكامل"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="memberId">رقم الهوية *</Label>
                            <Input
                              id="memberId"
                              value={newMember.idNumber}
                              onChange={(e) => setNewMember(prev => ({ ...prev, idNumber: e.target.value }))}
                              placeholder="أدخل رقم الهوية"
                              maxLength={9}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="memberDob">تاريخ الميلاد *</Label>
                            <Input
                              id="memberDob"
                              type="date"
                              value={newMember.dateOfBirth}
                              onChange={(e) => setNewMember(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الجنس *</Label>
                            <Select
                              value={newMember.gender}
                              onValueChange={(value: "male" | "female") => setNewMember(prev => ({ ...prev, gender: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الجنس" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">ذكر</SelectItem>
                                <SelectItem value="female">أنثى</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id="isStudent"
                              checked={newMember.isUniversityStudent}
                              onCheckedChange={(checked) => setNewMember(prev => ({ ...prev, isUniversityStudent: checked as boolean }))}
                            />
                            <label htmlFor="isStudent" className="text-sm font-medium leading-none">
                              طالب جامعي
                            </label>
                          </div>
                          <div className="flex justify-end space-x-2 space-x-reverse">
                            <Button type="button" variant="outline" onClick={() => setIsMemberDialogOpen(false)}>
                              إلغاء
                            </Button>
                            <Button type="button" onClick={addFamilyMember}>
                              إضافة
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* قائمة أفراد العائلة */}
                    {familyData.members.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">الأفراد المضافون:</Label>
                        {familyData.members.map((member, index) => (
                          <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 font-semibold text-sm">
                                      {member.gender === "male" ? "ذ" : "أ"}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-green-900">{member.fullName}</h4>
                                    <p className="text-sm text-green-700">
                                      {member.gender === "male" ? "ذكر" : "أنثى"}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-800">
                                  <p><span className="font-medium">رقم الهوية:</span> {member.idNumber}</p>
                                  <p><span className="font-medium">تاريخ الميلاد:</span> {member.dateOfBirth}</p>
                                  <p><span className="font-medium">الحالة:</span> {member.isUniversityStudent ? "طالب جامعي" : "غير طالب جامعي"}</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ملخص العائلة */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        ملخص العائلة
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p>إجمالي الأفراد: <span className="font-medium">{stats.totalMembers}</span></p>
                        <p>عدد الأطفال: <span className="font-medium">{stats.childrenCount}</span></p>
                        <p>عدد الطلاب: <span className="font-medium">{stats.numberOfStudents}</span></p>
                        <p>عدد المسنين: <span className="font-medium">{stats.elderlyCount}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* أزرار التنقل */}
              <div className="flex justify-between pt-6">
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    <ArrowRight className="w-4 h-4 ml-2" />
                    السابق
                  </Button>
                )}
                {currentStep < 2 ? (
                  <Button type="button" onClick={nextStep} className="mr-auto">
                    التالي
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={handleSubmit} 
                    className="mr-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "جاري التسجيل..." : "تقديم التسجيل"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-200">
            <CardContent className="pt-12 pb-12 text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold">تم تقديم التسجيل بنجاح</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                شكراً لتسجيلك. تم استلام طلبك وسيتم مراجعته من قبل فريقنا.
                سنتواصل معك عبر الهاتف بتحديثات حول حالتك.
              </p>
              <div className="pt-4">
                <Button asChild>
                  <Link to="/">العودة للصفحة الرئيسية</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default NewRegister;
