import type { Request, Response } from "express";
import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { databaseDisabled, sequelize } from "./db";
import { Admin, Family, FamilyMember, HeadOfFamily, Institution, InstitutionApplication, UpdateRequest, Assistance, FamilyRegistrationRequest as FamilyRegistrationRequestModel, Notification } from "./models";
import { Op } from "sequelize";
import { AuthRequest, DatabaseError, FamilyRegistrationRequest, FamilyWithMembers } from "./types";
import { calculateNeedIndex, defaultThresholds, defaultWeights } from "./need-index";
import { requireAuth } from "./auth";
import * as fastcsv from "fast-csv";

const router = Router();

router.use((req, res, next) => {
  if (databaseDisabled) {
    return res.status(503).json({ message: "Database disabled in this environment" });
  }
  next();
});

function handleValidation(
  req: Request,
  res: Response,
  next: (error?: Error) => void
) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: (err as unknown as { param: string }).param,
        message: err.msg,
        value: (err as unknown as { value: unknown }).value
      }))
    });
  }
  next();
}

// Global error handler
function handleErrors(
  err: DatabaseError,
  req: Request,
  res: Response,
  next: (error?: Error) => void
) {
  console.error('Error:', err);

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map((e: { path: string; message: string }) => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      status: 'error',
      message: 'Resource already exists',
      errors: err.errors.map((e: { path: string; message: string }) => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
}

// Auth: institution/admin login
router.post(
  "/auth/login",
  body("email").isEmail(),
  body("password").isString().isLength({ min: 6 }),
  handleValidation,
  async (req: Request, res: Response) => {
    const { email, password, role } = req.body as { email: string; password: string; role?: "admin" | "institution" };
    const secret = process.env.JWT_SECRET || "secret";

    if (role === "admin") {
      let admin = await Admin.findOne({ where: { email } });

      // If no admin exists, create the first admin (one-time setup)
      if (!admin) {
        const adminCount = await Admin.count();
        if (adminCount === 0) {
          const passwordHash = await bcrypt.hash(password, 10);
          admin = await Admin.create({ email, passwordHash, role: "admin" });
        } else {
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }

      const ok = await bcrypt.compare(password, admin.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid credentials" });
      const token = jwt.sign({ id: admin.id, role: "admin" }, secret, { expiresIn: "2h" });
      return res.json({ token });
    }

    const institution = await Institution.findOne({ where: { contactEmail: email } });
    if (!institution) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, institution.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: institution.id, role: "institution" }, secret, { expiresIn: "2h" });
    return res.json({ token });
  }
);

  // Auth: family login (head of family)
  router.post(
    "/auth/family-login",
    body("idNumber").isString().trim().matches(/^[0-9]{9}$/).withMessage("رقم الهوية يجب أن يكون 9 أرقام"),
    body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور مطلوبة"),
    handleValidation,
    async (req: Request, res: Response) => {
      const { idNumber, password } = req.body as { idNumber: string; password: string };

      try {
        const head = await HeadOfFamily.findOne({ where: { idNumber } });
        if (!head) return res.status(401).json({ message: "Invalid credentials" });

        const ok = await bcrypt.compare(password, head.passwordHash);
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });

        const secret = process.env.JWT_SECRET || "secret";
        const token = jwt.sign({ id: head.id, role: "family" }, secret, { expiresIn: "2h" });

        // fetch minimal family info if exists
        const family = await Family.findOne({ where: { headId: head.id } });

        return res.json({
          token,
          head: { id: head.id, fullName: head.fullName, idNumber: head.idNumber, phoneNumber: head.phoneNumber },
          family: family ? { id: family.id, totalMembers: family.totalMembers } : null,
        });
      } catch (error) {
        console.error("Family login error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );



// Registration endpoint for families - now creates a request for admin approval
router.post(
  "/register",
  [
    body("fullName").isString().trim().notEmpty().withMessage("الاسم الكامل مطلوب"),
    body("idNumber")
      .isString()
      .trim()
      .matches(/^[0-9]{9}$/)
      .withMessage("رقم الهوية يجب أن يكون 9 أرقام"),
    body("phoneNumber")
      .isString()
      .trim()
      .matches(/^05[0-9]{8}$/)
      .withMessage("رقم الهاتف يجب أن يبدأ ب 05 ويتكون من 10 أرقام"),
    body("address").isString().trim().notEmpty().withMessage("العنوان مطلوب"),
    body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    body("family").isObject().withMessage("معلومات العائلة مطلوبة"),
  ],
  handleValidation,
  async (req, res) => {
    try {
      console.log('=== طلب تسجيل عائلة جديدة ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      const { fullName, idNumber, phoneNumber, password, address, family } = req.body as FamilyRegistrationRequest;

      // Validation logic
      if (!fullName || fullName.trim().length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'الاسم الكامل مطلوب ويجب أن يكون 6 أحرف على الأقل'
        });
      }

      if (!idNumber || idNumber.length !== 9) {
        return res.status(400).json({
          status: 'error',
          message: 'رقم الهوية يجب أن يكون 9 أرقام'
        });
      }

      if (!phoneNumber || !/^05[0-9]{8}$/.test(phoneNumber)) {
        return res.status(400).json({
          status: 'error',
          message: 'رقم الهاتف يجب أن يبدأ ب 05 ويتكون من 10 أرقام'
        });
      }

      if (!address || address.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'العنوان مطلوب'
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
        });
      }

      if (!family || typeof family !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'معلومات العائلة مطلوبة'
        });
      }

      if (!family.totalMembers || family.totalMembers < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'عدد أفراد العائلة يجب أن يكون أكبر من 0'
        });
      }

      if (family.numberOfStudents === undefined || family.numberOfStudents < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'عدد الطلاب يجب أن يكون 0 أو أكبر'
        });
      }

      // Check for existing registration requests or families
      const existingRequest = await FamilyRegistrationRequestModel.findOne({
        where: { [Op.or]: [{ phoneNumber }, { idNumber }] }
      });

      const existingHead = await HeadOfFamily.findOne({
        where: { [Op.or]: [{ phoneNumber }, { idNumber }] }
      });

      if (existingRequest || existingHead) {
        const message = (existingRequest?.phoneNumber === phoneNumber || existingHead?.phoneNumber === phoneNumber)
          ? 'رقم الهاتف مسجل مسبقاً'
          : 'رقم الهوية مسجل مسبقاً';
        return res.status(409).json({ status: 'error', message });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Create registration request instead of family
      const registrationRequest = await FamilyRegistrationRequestModel.create({
        fullName,
        idNumber,
        phoneNumber,
        passwordHash,
        address,
        familyData: family,
        status: 'pending'
      });

      console.log('✅ تم إنشاء طلب تسجيل العائلة بنجاح:', { requestId: registrationRequest.id });

      return res.status(201).json({
        status: 'success',
        message: "Family registration request submitted successfully. Please wait for admin approval.",
        data: {
          requestId: registrationRequest.id
        }
      });
    } catch (error) {
      console.error("❌ خطأ في إنشاء طلب التسجيل:", error);
      return res.status(500).json({
        status: 'error',
        message: 'حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى',
      });
    }
  }
);

// Welcome endpoint that logs requests and returns metadata
router.get("/welcome", (req, res) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({
    message: "Welcome to the API",
    method: req.method,
    path: req.path
  });
});

// Hello endpoint that logs requests and returns a welcome message
router.get("/hello", (req, res) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({
    message: "Hello, welcome to the API",
    method: req.method,
    path: req.path
  });
});

// Cases listing with basic filters (mock scoring for now)
router.get("/cases", async (_req, res) => {
  const families = await Family.findAll({ limit: 100 });
  res.json({ data: families });
});

// Admin summary (protected)
router.get("/admin/summary", requireAuth(["admin"]), async (_req, res) => {
  const total = await Family.count();
  const students = await Family.sum("numberOfStudents");
  const elderly = await Family.sum("elderlyCount");
  res.json({ totalFamilies: total, totalStudents: students || 0, totalElderly: elderly || 0 });
});

// Export CSV for cases with simple filters (protected for admin/institution)
router.get("/export/cases", requireAuth(["admin", "institution"]), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 1000), 5000);
  const families = await Family.findAll({ limit });
  const rows = families.map((f: Family) => ({
    id: f.id,
    totalMembers: f.totalMembers,
    numberOfStudents: f.numberOfStudents,
    elderlyCount: f.elderlyCount,
    childrenCount: f.childrenCount,
    address: f.address,
  }));

  res.header("Content-Type", "text/csv");
  res.attachment("cases.csv");

  fastcsv.write(rows, { headers: true }).pipe(res);
});



router.get("/family/profile", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    if (!headId) return res.status(401).json({ message: "Unauthorized" });

    console.log(`[FamilyProfile] Authenticated with headId: ${headId}`);

    // First get the head of family
    const head = await HeadOfFamily.findByPk(headId);
    if (!head) {
      console.error(`[FamilyProfile] Head of family not found for id: ${headId}`);
      return res.status(404).json({ message: "Head of family not found" });
    }

    console.log(`[FamilyProfile] Found head of family: ${head.fullName} (${head.id})`);

    // Then get the family and its members
    const family = await Family.findOne({ 
      where: { headId: head.id },
      include: [{
        model: FamilyMember,
        as: 'members'
      }]
    });

    if (!family) {
      console.error(`[FamilyProfile] Family not found for headId: ${head.id}`);
      return res.status(404).json({ message: "Family not found" });
    }

    console.log('Found family data:', {
      headId: head.id,
      familyId: family.id,
      memberCount: family.members?.length || 0
    });

    res.json({
      headOfFamily: {
        id: head.id,
        fullName: head.fullName,
        idNumber: head.idNumber,
        phoneNumber: head.phoneNumber,
      },
      family: {
        id: family.id,
        totalMembers: family.totalMembers,
        numberOfStudents: family.numberOfStudents,
        address: family.address,
        elderlyCount: family.elderlyCount,
        childrenCount: family.childrenCount,
      },
      members: family.members?.map(m => ({
        id: m.id,
        fullName: m.fullName,
        idNumber: m.idNumber,
        dateOfBirth: m.dateOfBirth,
        gender: m.gender,
        isUniversityStudent: m.isUniversityStudent,
      })) || []
    });
  } catch (error) {
    console.error("Error fetching family profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: Update address
router.put("/family/address", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    const family = await Family.findOne({ where: { headId } });
    if (!family) {
      return res.status(404).json({ message: "Family not found" });
    }

    await family.update({ address });

    res.json({ message: "Address updated successfully", address: family.address });
  } catch (error) {
    console.error("Error updating family address:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Family: Add a new member
router.post("/family/members", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    const family = await Family.findOne({ where: { headId } });
    if (!family) return res.status(404).json({ message: "Family not found" });

    const { fullName, idNumber, dateOfBirth, gender, isUniversityStudent } = req.body;

    // Basic validation
    if (!fullName || !idNumber || !dateOfBirth || !gender) {
      return res.status(400).json({ message: "Missing required member fields" });
    }

    const newMember = await FamilyMember.create({
      familyId: family.id,
      fullName,
      idNumber,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      isUniversityStudent: isUniversityStudent || false,
    });

    // Update family counts
    await family.increment('totalMembers');
    if (gender === 'female') {
      await family.increment('femaleCount');
    }

    res.status(201).json(newMember);
  } catch (error) {
    console.error("Error adding family member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: Update a member
router.put("/family/members/:memberId", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    const { memberId } = req.params;
    const { fullName, idNumber, dateOfBirth, gender, isUniversityStudent } = req.body;

    const family = await Family.findOne({ where: { headId } });
    if (!family) return res.status(404).json({ message: "Family not found" });

    const member = await FamilyMember.findOne({ where: { id: memberId, familyId: family.id } });
    if (!member) return res.status(404).json({ message: "Member not found in this family" });

    // Prevent updating head of family's core details via this endpoint
    const head = await HeadOfFamily.findByPk(headId);
    if (member.idNumber === head?.idNumber) {
        return res.status(403).json({ message: "Cannot edit head of family details here." });
    }

    const oldGender = member.gender;
    await member.update({ fullName, idNumber, dateOfBirth: new Date(dateOfBirth), gender, isUniversityStudent });

    // Update female count if gender changed
    if (oldGender !== gender) {
      if (gender === 'female') {
        await family.increment('femaleCount');
      } else if (oldGender === 'female') {
        await family.decrement('femaleCount');
      }
    }

    res.json(member);
  } catch (error) {
    console.error("Error updating family member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: Delete a member
router.delete("/family/members/:memberId", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    const { memberId } = req.params;

    const family = await Family.findOne({ where: { headId } });
    if (!family) return res.status(404).json({ message: "Family not found" });

    const member = await FamilyMember.findOne({ where: { id: memberId, familyId: family.id } });
    if (!member) return res.status(404).json({ message: "Member not found in this family" });

    // Prevent deleting head of family
    const head = await HeadOfFamily.findByPk(headId);
    if (member.idNumber === head?.idNumber) {
        return res.status(403).json({ message: "Cannot delete head of family." });
    }

    const wasFemale = member.gender === 'female';
    await member.destroy();

    // Update family counts
    await family.decrement('totalMembers');
    if (wasFemale) {
      await family.decrement('femaleCount');
    }

    res.status(204).send(); // No Content
  } catch (error) {
    console.error("Error deleting family member:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: Get update requests
router.get("/family/requests", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    const family = await Family.findOne({ where: { headId } });
    if (!family) return res.status(404).json({ message: "Family not found" });

    const requests = await UpdateRequest.findAll({ 
      where: { familyId: family.id },
      order: [["createdAt", "DESC"]]
    });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching update requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: Create an update request
router.post("/family/requests", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  console.log(`Request received: ${req.method} ${req.path}`);
  try {
    const headId = req.user?.id;
    const { type, payload } = req.body;

    if (!type || !payload) {
      return res.status(400).json({ message: "Type and payload are required" });
    }

    const family = await Family.findOne({ where: { headId } });
    if (!family) return res.status(404).json({ message: "Family not found" });

    // Check for existing pending request to prevent duplicates
    let existingRequest = null;
    if (type === "ADDRESS_UPDATE") {
      existingRequest = await UpdateRequest.findOne({
        where: {
          familyId: family.id,
          status: "pending",
          type: "ADDRESS_UPDATE",
          payload: {
            newAddress: payload.newAddress
          }
        }
      });
    } else if (type === "MEMBER_ADD") {
      existingRequest = await UpdateRequest.findOne({
        where: {
          familyId: family.id,
          status: "pending",
          type: "MEMBER_ADD",
          payload: {
            idNumber: payload.idNumber
          }
        }
      });
    } else if (type === "MEMBER_UPDATE") {
      existingRequest = await UpdateRequest.findOne({
        where: {
          familyId: family.id,
          status: "pending",
          type: "MEMBER_UPDATE",
          payload: {
            memberId: payload.memberId
          }
        }
      });
    } else if (type === "MEMBER_DELETE") {
      existingRequest = await UpdateRequest.findOne({
        where: {
          familyId: family.id,
          status: "pending",
          type: "MEMBER_DELETE",
          payload: {
            memberId: payload.memberId
          }
        }
      });
    }

    if (existingRequest) {
      return res.status(409).json({ message: "طلب تعديل مشابه قيد المراجعة بالفعل" });
    }

    const newRequest = await UpdateRequest.create({
      familyId: family.id,
      type,
      payload,
      status: "pending",
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error creating update request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: Cancel an update request
router.patch("/family/requests/:id/cancel", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    const { id } = req.params;

    const family = await Family.findOne({ where: { headId } });
    if (!family) return res.status(404).json({ message: "Family not found" });

    const request = await UpdateRequest.findOne({ where: { id, familyId: family.id } });
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be cancelled" });
    }

    await request.update({ status: "cancelled" });

    res.json(request);
  } catch (error) {
    console.error("Error cancelling update request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Institution registration endpoint
router.post("/institutions/apply", [
  body("name").isString().trim().notEmpty().withMessage("اسم المؤسسة مطلوب"),
  body("contactEmail").isEmail().withMessage("البريد الإلكتروني غير صحيح"),
  body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  body("about").isString().trim().notEmpty().withMessage("نبذة عن المؤسسة مطلوبة"),
  body("services").isString().trim().notEmpty().withMessage("الخدمات المقدمة مطلوبة"),
  body("regions").isArray({ min: 1 }).withMessage("يجب اختيار منطقة واحدة على الأقل"),
], handleValidation, async (req, res) => {
  try {
    const { name, contactEmail, password, about, services, regions } = req.body;

    // Check for existing applications or institutions
    const existingApp = await InstitutionApplication.findOne({
      where: { [Op.or]: [{ contactEmail }, { name }] }
    });
    const existingInstitution = await Institution.findOne({
      where: { [Op.or]: [{ contactEmail }, { name }] }
    });

    if (existingApp || existingInstitution) {
      const message = (existingApp?.contactEmail === contactEmail || existingInstitution?.contactEmail === contactEmail)
        ? 'البريد الإلكتروني مسجل مسبقاً'
        : 'اسم المؤسسة مسجل مسبقاً';
      return res.status(409).json({ status: 'error', message });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const application = await InstitutionApplication.create({
      name,
      contactEmail,
      passwordHash,
      about,
      services,
      regions,
      status: 'pending'
    });

    console.log('✅ تم إنشاء طلب تسجيل المؤسسة بنجاح:', { applicationId: application.id });

    return res.status(201).json({
      status: 'success',
      message: "تم إرسال طلب تسجيل المؤسسة بنجاح. سيتم مراجعته من قبل الإدارة.",
      data: { applicationId: application.id }
    });
  } catch (error) {
    console.error("❌ خطأ في إنشاء طلب تسجيل المؤسسة:", error);
    return res.status(500).json({
      status: 'error',
      message: 'حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى',
    });
  }
});

// Admin: manage institution applications
router.get("/admin/institution-applications", requireAuth(["admin"]), async (_req, res) => {
  const apps = await InstitutionApplication.findAll({ where: { status: "pending" }, order: [["createdAt", "DESC"]] });
  res.json({ data: apps });
});

router.post("/admin/institution-applications/:id/approve", requireAuth(["admin"]), async (req, res) => {
  const id = req.params.id;
  const app = await InstitutionApplication.findByPk(id);
  if (!app) return res.status(404).json({ message: "Not found" });
  if (app.status !== "pending") return res.status(400).json({ message: "Already processed" });
  // create institution
  const inst = await Institution.create({
    name: app.name,
    contactEmail: app.contactEmail,
    passwordHash: app.passwordHash,
    about: app.about,
    services: app.services,
    regions: app.regions
  });
  await app.update({ status: "approved" });
  res.json({ ok: true, institutionId: inst.id });
});

router.post("/admin/institution-applications/:id/reject", requireAuth(["admin"]), async (req, res) => {
  const id = req.params.id;
  const app = await InstitutionApplication.findByPk(id);
  if (!app) return res.status(404).json({ message: "Not found" });
  if (app.status !== "pending") return res.status(400).json({ message: "Already processed" });
  await app.update({ status: "rejected" });
  res.json({ ok: true });
});

// Admin: get list of families
router.get("/admin/families", requireAuth(["admin"]), async (_req, res) => {
  try {
    const families = await Family.findAll({
      include: [
        {
          model: HeadOfFamily,
          as: 'head',
          attributes: ['fullName', 'phoneNumber', 'idNumber']
        },
        {
          model: FamilyMember,
          as: 'members',
          attributes: ['fullName', 'idNumber', 'dateOfBirth', 'gender', 'isUniversityStudent']
        }
      ],
      attributes: ['id', 'totalMembers', 'numberOfStudents', 'elderlyCount', 'childrenCount', 'femaleCount', 'address'],
      limit: 1000
    });

    const formattedFamilies = families.map(f => {
      const familyWithMembers = f as Family & {
        members?: FamilyMember[];
        head?: HeadOfFamily;
      };

      return {
        id: f.id,
        headId: f.head?.idNumber || '',
        headName: f.head?.fullName || '',
        address: f.address,
        totalMembers: f.totalMembers,
        numberOfStudents: f.numberOfStudents,
        elderlyCount: f.elderlyCount,
        childrenCount: f.childrenCount,
        femaleCount: f.femaleCount,
        monthlyIncome: 0, // Placeholder since income field was removed
        members: familyWithMembers.members?.map((m: FamilyMember) => ({
          name: m.fullName,
          idNumber: m.idNumber,
          birthdate: m.dateOfBirth.toISOString().split('T')[0], // Format as YYYY-MM-DD
          gender: m.gender === 'male' ? 'ذكر' : 'أنثى',
          isUniversityStudent: m.isUniversityStudent
        })) || []
      };
    });

    console.log("Fetched families count:", families.length);
    res.json({ data: formattedFamilies });
  } catch (error) {
    console.error("Error fetching families:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: get update requests
router.get("/admin/update-requests", requireAuth(["admin"]), async (_req, res) => {
  try {
    const requests = await UpdateRequest.findAll({
      where: { status: { [Op.ne]: 'cancelled' } },
      include: [
        {
          model: Family,
          as: 'family',
          include: [
            {
              model: HeadOfFamily,
              as: 'head',
              attributes: ['fullName']
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const formattedRequests = requests.map(r => ({
      id: r.id,
      familyId: r.familyId,
      type: r.type,
      status: r.status,
      submittedAt: r.createdAt,
      details: r.payload,
      familyName: r.family?.head?.fullName || 'غير محدد'
    }));

    res.json({ data: formattedRequests });
  } catch (error) {
    console.error("Error fetching update requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: approve update request
router.post("/admin/update-requests/:id/approve", requireAuth(["admin"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const request = await UpdateRequest.findByPk(id, { transaction: t });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    // Apply the changes based on request type
    if (request.type === "MEMBER_ADD") {
      const memberData = request.payload as {
        fullName: string;
        idNumber: string;
        dateOfBirth: string;
        gender: "male" | "female";
        isUniversityStudent?: boolean;
      };

      // Validate required fields
      if (!memberData.fullName || !memberData.idNumber ||
          !memberData.dateOfBirth || !memberData.gender) {
        await t.rollback();
        return res.status(400).json({ message: "Missing required member add fields" });
      }

      // Validate idNumber uniqueness
      const existingMember = await FamilyMember.findOne({
        where: { idNumber: memberData.idNumber },
        transaction: t
      });
      const existingHead = await HeadOfFamily.findOne({
        where: { idNumber: memberData.idNumber },
        transaction: t
      });
      if (existingMember || existingHead) {
        await t.rollback();
        return res.status(400).json({ message: "رقم الهوية موجود مسبقاً" });
      }

      await FamilyMember.create({
        familyId: request.familyId,
        fullName: memberData.fullName,
        idNumber: memberData.idNumber,
        dateOfBirth: new Date(memberData.dateOfBirth),
        gender: memberData.gender,
        isUniversityStudent: memberData.isUniversityStudent || false,
      }, { transaction: t });

      // Update family counts
      const family = await Family.findByPk(request.familyId, { transaction: t });
      if (family) {
        await family.increment('totalMembers', { transaction: t });
        if (memberData.isUniversityStudent) {
          await family.increment('numberOfStudents', { transaction: t });
        }
        // Check if elderly (assuming 60+ years old)
        const age = new Date().getFullYear() - new Date(memberData.dateOfBirth).getFullYear();
        if (age >= 60) {
          await family.increment('elderlyCount', { transaction: t });
        }
        if (memberData.gender === 'female') {
          await family.increment('femaleCount', { transaction: t });
        }
      }
    } else if (request.type === "MEMBER_UPDATE") {
      const updateData = request.payload as {
        memberId: string;
        changes: Array<{ field: string; from: unknown; to: unknown }>;
      };

      // Validate required fields
      if (!updateData.memberId || !Array.isArray(updateData.changes) || updateData.changes.length === 0) {
        await t.rollback();
        return res.status(400).json({ message: "Missing required member update fields or no changes provided" });
      }

      const member = await FamilyMember.findByPk(updateData.memberId, { transaction: t });
      if (!member) {
        await t.rollback();
        return res.status(404).json({ message: "Member not found" });
      }

      const updateFields: Partial<FamilyMember> = {};
      let idNumberChanging = false;
      let newIdNumber = member.idNumber;
      const wasUniversityStudent = member.isUniversityStudent;
      let isUniversityStudent = member.isUniversityStudent;
      const oldGender = member.gender;
      let newGender = member.gender;

      for (const change of updateData.changes) {
        const { field, to } = change;
        if (field === 'fullName') {
          if (typeof to !== 'string' || !to.trim()) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid fullName value" });
          }
          updateFields.fullName = to;
        } else if (field === 'idNumber') {
          if (typeof to !== 'string' || !to.trim()) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid idNumber value" });
          }
          newIdNumber = to;
          idNumberChanging = true;
          updateFields.idNumber = to;
        } else if (field === 'dateOfBirth') {
          if (typeof to !== 'string' || !to.trim()) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid dateOfBirth value" });
          }
          updateFields.dateOfBirth = new Date(to);
        } else if (field === 'gender') {
          if (to !== 'male' && to !== 'female') {
            await t.rollback();
            return res.status(400).json({ message: "Invalid gender value" });
          }
          updateFields.gender = to;
          newGender = to;
        } else if (field === 'isUniversityStudent') {
          if (typeof to !== 'boolean') {
            await t.rollback();
            return res.status(400).json({ message: "Invalid isUniversityStudent value" });
          }
          updateFields.isUniversityStudent = to;
          isUniversityStudent = to;
        } else {
          await t.rollback();
          return res.status(400).json({ message: `Unknown field: ${field}` });
        }
      }

      // If idNumber is changing, validate uniqueness
      if (idNumberChanging && member.idNumber !== newIdNumber) {
        const existingMember = await FamilyMember.findOne({
          where: { idNumber: newIdNumber },
          transaction: t
        });
        const existingHead = await HeadOfFamily.findOne({
          where: { idNumber: newIdNumber },
          transaction: t
        });
        if (existingMember || existingHead) {
          await t.rollback();
          return res.status(400).json({ message: "رقم الهوية موجود مسبقاً" });
        }
      }

      await member.update(updateFields, { transaction: t });

      // Update family counts if isUniversityStudent or gender changed
      const family = await Family.findByPk(request.familyId, { transaction: t });
      if (family) {
        if (wasUniversityStudent !== isUniversityStudent) {
          if (isUniversityStudent) {
            await family.increment('numberOfStudents', { transaction: t });
          } else {
            await family.decrement('numberOfStudents', { transaction: t });
          }
        }
        if (oldGender !== newGender) {
          if (newGender === 'female') {
            await family.increment('femaleCount', { transaction: t });
          } else if (oldGender === 'female') {
            await family.decrement('femaleCount', { transaction: t });
          }
        }
      }
    } else if (request.type === "MEMBER_DELETE") {
      const deleteData = request.payload as {
        memberId: string;
      };
      const member = await FamilyMember.findByPk(deleteData.memberId, { transaction: t });
      if (!member) {
        await t.rollback();
        return res.status(404).json({ message: "Member not found" });
      }

      await member.destroy({ transaction: t });

      // Update family counts
      const family = await Family.findByPk(request.familyId, { transaction: t });
      if (family) {
        await family.decrement('totalMembers', { transaction: t });
        if (member.isUniversityStudent) {
          await family.decrement('numberOfStudents', { transaction: t });
        }
        // Check if was elderly
        const age = new Date().getFullYear() - member.dateOfBirth.getFullYear();
        if (age >= 60) {
          await family.decrement('elderlyCount', { transaction: t });
        }
        if (member.gender === 'female') {
          await family.decrement('femaleCount', { transaction: t });
        }
      }
    } else if (request.type === "ADDRESS_UPDATE") {
      const addressData = request.payload as {
        newAddress: string;
      };
      const family = await Family.findByPk(request.familyId, { transaction: t });
      if (!family) {
        await t.rollback();
        return res.status(404).json({ message: "Family not found" });
      }
      await family.update({ address: addressData.newAddress }, { transaction: t });
    }

    await request.update({ status: "approved" }, { transaction: t });
    await t.commit();
    res.json({ ok: true });
  } catch (error) {
    await t.rollback();
    console.error("Error approving update request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: reject update request
router.post("/admin/update-requests/:id/reject", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await UpdateRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    await request.update({ status: "rejected", rejectionReason: reason });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error rejecting update request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: manage family registration requests
router.get("/admin/family-registration-requests", requireAuth(["admin"]), async (_req, res) => {
  try {
    const requests = await FamilyRegistrationRequestModel.findAll({
      where: { status: "pending" },
      order: [["createdAt", "DESC"]]
    });

    const formattedRequests = requests.map(r => ({
      id: r.id,
      fullName: r.fullName,
      idNumber: r.idNumber,
      phoneNumber: r.phoneNumber,
      address: r.address,
      familyData: r.familyData,
      submittedAt: r.createdAt
    }));

    res.json({ data: formattedRequests });
  } catch (error) {
    console.error("Error fetching family registration requests:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/family-registration-requests/:id/approve", requireAuth(["admin"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const request = await FamilyRegistrationRequestModel.findByPk(id, { transaction: t });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    // Create the family from the request data
    const head = await HeadOfFamily.create({
      fullName: request.fullName,
      idNumber: request.idNumber,
      phoneNumber: request.phoneNumber,
      passwordHash: request.passwordHash
    }, { transaction: t });

    const familyData = request.familyData as {
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
    const fam = await Family.create({
      headId: head.id,
      totalMembers: familyData.totalMembers,
      numberOfStudents: familyData.numberOfStudents,
      address: request.address,
      elderlyCount: familyData.elderlyCount || 0,
      childrenCount: familyData.childrenCount || 0,
      femaleCount: 0, // Will be calculated after creating members
    }, { transaction: t });

    let femaleCount = 0;

    if (familyData.wife) {
      await FamilyMember.create({
        familyId: fam.id,
        ...familyData.wife,
        dateOfBirth: new Date(familyData.wife.dateOfBirth),
      }, { transaction: t });
      if (familyData.wife.gender === 'female') {
        femaleCount++;
      }
    }

    if (familyData.members && Array.isArray(familyData.members)) {
      for (const member of familyData.members) {
        await FamilyMember.create({
          familyId: fam.id,
          ...member,
          dateOfBirth: new Date(member.dateOfBirth),
        }, { transaction: t });
        if (member.gender === 'female') {
          femaleCount++;
        }
      }
    }

    // Update femaleCount in family
    await fam.update({ femaleCount }, { transaction: t });

    // Mark request as approved
    await request.update({ status: "approved" }, { transaction: t });

    await t.commit();
    res.json({ ok: true, familyId: fam.id, headOfFamilyId: head.id });
  } catch (error) {
    await t.rollback();
    console.error("Error approving family registration request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/family-registration-requests/:id/reject", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await FamilyRegistrationRequestModel.findByPk(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    await request.update({ status: "rejected", rejectionReason: reason });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error rejecting family registration request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: manage institutions
router.get("/admin/institutions", requireAuth(["admin"]), async (_req, res) => {
  try {
    const institutions = await Institution.findAll({
      attributes: ['id', 'name', 'contactEmail', 'about', 'services', 'regions'],
      order: [["createdAt", "DESC"]]
    });

    const formattedInstitutions = institutions.map(inst => ({
      id: inst.id,
      name: inst.name,
      contactEmail: inst.contactEmail,
      about: inst.about,
      services: inst.services,
      regions: inst.regions || []
    }));

    res.json({ data: formattedInstitutions });
  } catch (error) {
    console.error("Error fetching institutions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/admin/institutions/:id/regions", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { region } = req.body;

    if (!region || typeof region !== 'string' || !region.trim()) {
      return res.status(400).json({ message: "Region is required" });
    }

    const institution = await Institution.findByPk(id);
    if (!institution) return res.status(404).json({ message: "Institution not found" });

    const currentRegions = institution.regions || [];
    if (currentRegions.includes(region.trim())) {
      return res.status(400).json({ message: "Region already exists for this institution" });
    }

    const updatedRegions = [...currentRegions, region.trim()];
    await institution.update({ regions: updatedRegions });

    res.json({ ok: true, regions: updatedRegions });
  } catch (error) {
    console.error("Error adding region to institution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/admin/institutions/:id/regions/:region", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id, region } = req.params;

    const institution = await Institution.findByPk(id);
    if (!institution) return res.status(404).json({ message: "Institution not found" });

    const currentRegions = institution.regions || [];
    const updatedRegions = currentRegions.filter(r => r !== region);

    if (updatedRegions.length === currentRegions.length) {
      return res.status(400).json({ message: "Region not found for this institution" });
    }

    await institution.update({ regions: updatedRegions });

    res.json({ ok: true, regions: updatedRegions });
  } catch (error) {
    console.error("Error removing region from institution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/admin/institutions/:id", requireAuth(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    const institution = await Institution.findByPk(id);
    if (!institution) return res.status(404).json({ message: "Institution not found" });

    await institution.destroy();

    res.json({ ok: true, message: "Institution deleted successfully" });
  } catch (error) {
    console.error("Error deleting institution:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: delete family
router.delete("/admin/families/:id", requireAuth(["admin"]), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const family = await Family.findByPk(id, { transaction: t });
    if (!family) return res.status(404).json({ message: "Family not found" });

    // Delete all update requests for this family
    await UpdateRequest.destroy({ where: { familyId: id }, transaction: t });

    // Delete all assistance records for this family
    await Assistance.destroy({ where: { familyId: id }, transaction: t });

    // Delete all family members
    await FamilyMember.destroy({ where: { familyId: id }, transaction: t });

    // Delete the family
    await family.destroy({ transaction: t });

    // Delete the head of family
    await HeadOfFamily.destroy({ where: { id: family.headId }, transaction: t });

    await t.commit();
    res.json({ ok: true, message: "Family deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting family:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: get profile
router.get("/admin/profile", requireAuth(["admin"]), async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const admin = await Admin.findByPk(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({ email: admin.email });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Institution: get profile
router.get("/institutions/profile", requireAuth(["institution"]), async (req: AuthRequest, res: Response) => {
  try {
    const institutionId = req.user?.id;
    if (!institutionId) return res.status(401).json({ message: "Unauthorized" });

    const institution = await Institution.findByPk(institutionId);
    if (!institution) return res.status(404).json({ message: "Institution not found" });

    res.json({
      id: institution.id,
      name: institution.name,
      contactEmail: institution.contactEmail,
      about: institution.about,
      services: institution.services,
      regions: institution.regions || []
    });
  } catch (error) {
    console.error("Error fetching institution profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Institution: get cases (families in assigned regions)
router.get("/institutions/cases", requireAuth(["institution"]), async (req: AuthRequest, res: Response) => {
  try {
    const institutionId = req.user?.id;
    if (!institutionId) return res.status(401).json({ message: "Unauthorized" });

    const institution = await Institution.findByPk(institutionId);
    if (!institution) return res.status(404).json({ message: "Institution not found" });

    const assignedRegions = institution.regions || [];
    if (assignedRegions.length === 0) {
      return res.json({ data: [] });
    }

    // Fetch families where address contains any of the assigned regions
    const families = await Family.findAll({
      where: {
        [Op.or]: assignedRegions.map(region => ({
          address: { [Op.iLike]: `%${region}%` }
        }))
      },
      include: [
        {
          model: HeadOfFamily,
          as: 'head',
          attributes: ['fullName', 'idNumber']
        }
      ],
      limit: 1000
    });

    const mapped = families.map((f: Family & { head?: HeadOfFamily }) => {
      const totalMembers = f.totalMembers;
      const elderlyCount = f.elderlyCount;
      const universityStudents = f.numberOfStudents;
      const males = Math.max(0, Math.round(totalMembers * 0.5));
      const females = Math.max(0, totalMembers - males);
      const region = assignedRegions.find(r => f.address.includes(r)) || assignedRegions[0];

      const needInput = {
        familySize: totalMembers,
        numberOfStudents: universityStudents,
        elderlyCount,
        childrenCount: f.childrenCount,
        femaleCount: females,
      };
      const needResult = calculateNeedIndex(needInput, defaultWeights, defaultThresholds);

      const row = {
        id: f.id,
        headName: f.head?.fullName || `رب الأسرة ${f.id.slice(0, 8)}`,
        headIdNumber: f.head?.idNumber || String(100000 + parseInt(f.id.slice(0, 8), 16)),
        region,
        totalMembers,
        males,
        females,
        elderlyCount,
        universityStudents,
        monthlyIncome: 0, // Placeholder, as income field was removed
        needIndex: needResult.score,
      };
      return row;
    });

    res.json({ data: mapped });
  } catch (error) {
    console.error("Error fetching institution cases:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Institution: send notification (single or bulk)
router.post("/institutions/notifications", requireAuth(["institution"]), async (req: AuthRequest, res: Response) => {
  try {
    const institutionId = req.user?.id;
    if (!institutionId) return res.status(401).json({ message: "Unauthorized" });

    const { targetIds, message } = req.body;

    // Support both single targetId (backward compatibility) and array targetIds
    const ids = Array.isArray(targetIds) ? targetIds : (req.body.targetId ? [req.body.targetId] : []);

    if (!ids.length || !message) {
      return res.status(400).json({ message: "Target IDs and message are required" });
    }

    const successful = [];
    const failed = [];

    for (const targetId of ids) {
      // Validate targetId format (must be 9 digits)
      if (!/^[0-9]{9}$/.test(targetId)) {
        failed.push({
          targetId,
          reason: "Invalid ID format: must be exactly 9 digits"
        });
        continue;
      }

      // Look up the head of family by idNumber to get the UUID
      const head = await HeadOfFamily.findOne({ where: { idNumber: targetId } });
      if (!head) {
        failed.push({
          targetId,
          reason: "Head of family not found with this ID number"
        });
        continue;
      }

      try {
        const notification = await Notification.create({
          targetType: "head_of_family",
          targetId: head.id, // Use the UUID from the head record
          message,
        });

        successful.push({
          id: notification.id,
          targetId,
          headName: head.fullName
        });
      } catch (createError) {
        console.error(`Error creating notification for ${targetId}:`, createError);
        failed.push({
          targetId,
          reason: "Failed to create notification"
        });
      }
    }

    res.status(201).json({
      message: `Processed ${ids.length} notifications`,
      successful,
      failed,
      totalSuccessful: successful.length,
      totalFailed: failed.length
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Family: get notifications
router.get("/family/notifications", requireAuth(["family"]), async (req: AuthRequest, res: Response) => {
  try {
    const headId = req.user?.id;
    if (!headId) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await Notification.findAll({
      where: {
        targetType: "head_of_family",
        targetId: headId,
      },
      order: [["createdAt", "DESC"]],
    });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching family notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin: change password
router.post("/admin/change-password", requireAuth(["admin"]), async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const admin = await Admin.findByPk(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!isOldPasswordValid) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await admin.update({ passwordHash: newPasswordHash });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
