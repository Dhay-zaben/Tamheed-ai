(function () {
  const {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
  } = window.TAMHEED_FIREBASE;

  const STORAGE_KEYS = {
    accounts: "tamheed_accounts",
    session: "tamheed_session",
    settings: "tamheed_settings",
    progress: "tamheed_progress",
    companyRoles: "tamheed_company_roles"
  };

  const DATA = window.TAMHEED_DATA;
  const memoryStore = {};
  const DEMO_ACCOUNTS = {
    student: {
      id: "student-demo",
      role: "student",
      name: "سارة",
      nameEn: "Sara",
      email: "sara@student.com",
      password: "123456",
      city: "Riyadh",
      targetRoleAr: "محللة بيانات",
      targetRoleEn: "Data Analyst",
      experience: 1,
      topSkills: ["SQL", "Power BI", "Excel", "Communication"],
      portfolio: ["behance.net/sarahdata"],
      badges: ["CV Verified"]
    },
    company: {
      id: "company-demo",
      role: "company",
      name: "HR",
      nameEn: "HR",
      email: "hr@tamheed.com",
      password: "123456",
      companyName: "Tamheed",
      city: "Riyadh"
    }
  };

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
        return memoryStore[key];
      }
      return fallback;
    }
  }

  function writeStore(key, value) {
    memoryStore[key] = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36);
  }

  class TamheedApp {
    constructor(root) {
      this.root = root;
      this.state = {
        accounts: this.loadAccounts(),
        session: null,
        settings: Object.assign({ language: "ar", theme: "light" }, readStore(STORAGE_KEYS.settings, {})),
        progress: readStore(STORAGE_KEYS.progress, {}),
        companyRoles: readStore(STORAGE_KEYS.companyRoles, []),
        route: this.parseRoute(),
        authResolved: false,
        cvUploadPending: false,
        aiInterviewDrafts: {},
        aiInterviewIndex: 0,
        aiInterviewDone: false,
        generatedAssessment: [],
        labTimer: 180,
        labDraftAnswer: "",
        behaviorDraftAnswer: "",
        cvStatusMessage: "",
        authRole: "student",
        authDrafts: {
          login: {
            student: { email: "", password: "" },
            company: { email: "", password: "" }
          },
          register: {
            student: { fullName: "", email: "", password: "", confirmPassword: "" },
            company: { companyName: "", hrName: "", email: "", password: "", confirmPassword: "" }
          }
        },
        authPending: false,
        formErrors: {},
        toast: "",
        filters: {
          city: "all",
          type: "all",
          minMatch: 0,
          skill: "all",
          remote: false
        }
      };
      this.labInterval = null;
      this.toastTimer = null;
      this.bindGlobalEvents();
      this.applySettings();
      this.configurePdfJs();
      this.ensureSeedData();
      this.ensureDemoAccounts();
      this.render();
      this.bindFirebaseSession();
    }

    loadAccounts() {
      const seeded = {
        students: [...DATA.users.students],
        companies: [...DATA.users.companies]
      };
      return readStore(STORAGE_KEYS.accounts, seeded);
    }

    ensureSeedData() {
      if (!readStore(STORAGE_KEYS.accounts, null)) {
        writeStore(STORAGE_KEYS.accounts, this.state.accounts);
      }
      if (!readStore(STORAGE_KEYS.progress, null)) {
        const seededProgress = {};
        this.state.accounts.students.forEach((student, index) => {
          const cvBase = clamp(38 + index * 8, 0, 60);
          seededProgress[student.id] = {
            cvUploaded: index === 0,
            cvAnalysis: index === 0 ? this.mockCvAnalysis(student) : null,
            readinessParts: {
              cv: cvBase,
              micro: index === 1 ? 20 : 0,
              behavior: index === 0 ? 12 : 0,
              plan: index === 0 ? 5 : 0
            },
            badges: [...student.badges],
            planChecks: index === 0 ? [true, true, false, false] : [false, false, false, false],
            appliedJobs: [],
            lab: {
              attempted: index === 1,
              passed: index === 1,
              answerId: index === 1 ? "a" : null
            },
            behavior: {
              completed: index === 0,
              scores: index === 0 ? { communication: 4, empathy: 4, problem: 4 } : null
            },
            interview: {
              completed: false,
              score: 0
            }
          };
        });
        this.state.progress = seededProgress;
        writeStore(STORAGE_KEYS.progress, seededProgress);
      }
    }

    ensureDemoAccounts() {
      let changed = false;

      const syncRecord = (poolKey, demo, legacyEmail) => {
        const pool = this.state.accounts[poolKey];
        let record = pool.find((item) => item.email.toLowerCase() === demo.email.toLowerCase());
        if (!record && legacyEmail) {
          record = pool.find((item) => item.email.toLowerCase() === legacyEmail.toLowerCase());
        }
        if (record) {
          const before = JSON.stringify(record);
          Object.assign(record, demo, { id: record.id });
          if (JSON.stringify(record) !== before) {
            changed = true;
          }
        } else {
          pool.unshift(Object.assign({}, demo));
          changed = true;
        }
      };

      syncRecord("students", DEMO_ACCOUNTS.student, "sarah@tamheed.demo");
      syncRecord("companies", DEMO_ACCOUNTS.company, "hr@waditech.demo");

      const studentProgressId = this.state.accounts.students[0].id;
      if (!this.state.progress[studentProgressId]) {
        this.state.progress[studentProgressId] = {
          cvUploaded: true,
          cvAnalysis: this.mockCvAnalysis(this.state.accounts.students[0]),
          readinessParts: { cv: 46, micro: 0, behavior: 10, plan: 4 },
          badges: ["CV Verified"],
          planChecks: [true, false, false, false],
          appliedJobs: [],
          lab: { attempted: false, passed: false, answerId: null },
          behavior: { completed: false, scores: null },
          interview: { completed: false, score: 0 }
        };
      }

      if (changed) {
        this.persistAccounts();
        this.persistProgress();
      }
    }

    t(key) {
      return DATA.translations[this.state.settings.language][key] || key;
    }

    currentUser() {
      if (!this.state.session) return null;
      const pool = this.state.session.role === "company" ? this.state.accounts.companies : this.state.accounts.students;
      return pool.find((item) => item.id === this.state.session.id) || null;
    }

    currentProgress() {
      const user = this.currentUser();
      if (!user || user.role !== "student") return null;
      if (!this.state.progress[user.id]) {
        this.state.progress[user.id] = {
          cvUploaded: false,
          cvAnalysis: null,
          readinessParts: { cv: 0, micro: 0, behavior: 0, plan: 0 },
          badges: [],
          planChecks: [false, false, false, false],
          appliedJobs: [],
          lab: { attempted: false, passed: false, answerId: null },
          behavior: { completed: false, scores: null },
          interview: { completed: false, score: 0 }
        };
        this.persistProgress();
      }
      return this.state.progress[user.id];
    }

    persistAccounts() {
      writeStore(STORAGE_KEYS.accounts, this.state.accounts);
    }

    persistSession() {
      writeStore(STORAGE_KEYS.session, this.state.session);
    }

    persistSettings() {
      writeStore(STORAGE_KEYS.settings, this.state.settings);
    }

    persistProgress() {
      writeStore(STORAGE_KEYS.progress, this.state.progress);
    }

    persistCompanyRoles() {
      writeStore(STORAGE_KEYS.companyRoles, this.state.companyRoles);
    }

    getAuthDraft(mode) {
      return this.state.authDrafts[mode][this.state.authRole];
    }

    updateAuthDraft(mode, field, value) {
      this.state.authDrafts[mode][this.state.authRole][field] = value;
    }

    setToast(message) {
      this.state.toast = message;
      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        this.state.toast = "";
        this.render();
      }, 2400);
    }

    errorText(key) {
      return this.state.formErrors[key] ? `<small class="field-error">${this.state.formErrors[key]}</small>` : "";
    }

    validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    configurePdfJs() {
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js";
      }
    }

    defaultRouteForRole(role) {
      return role === "company" ? "/company-dashboard" : "/student-dashboard";
    }

    firebaseErrorMessage(error) {
      const messages = {
        "auth/email-already-in-use": this.state.settings.language === "ar" ? "البريد مستخدم مسبقاً" : "Email already exists",
        "auth/invalid-email": this.state.settings.language === "ar" ? "صيغة البريد غير صحيحة" : "Invalid email format",
        "auth/invalid-credential": this.state.settings.language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials",
        "auth/user-not-found": this.state.settings.language === "ar" ? "الحساب غير موجود" : "Account not found",
        "auth/wrong-password": this.state.settings.language === "ar" ? "بيانات الدخول غير صحيحة" : "Invalid credentials",
        "auth/weak-password": this.state.settings.language === "ar" ? "كلمة المرور ضعيفة" : "Weak password",
        "auth/too-many-requests": this.state.settings.language === "ar" ? "محاولات كثيرة، حاول لاحقاً" : "Too many attempts, try again later"
      };
      return messages[error?.code] || (this.state.settings.language === "ar" ? "حدث خطأ غير متوقع" : "Unexpected error");
    }

    findLocalProfileByEmail(email) {
      const normalized = String(email || "").toLowerCase();
      const student = this.state.accounts.students.find((item) => item.email.toLowerCase() === normalized);
      if (student) {
        return { role: "student", name: student.name, email: student.email };
      }
      const company = this.state.accounts.companies.find((item) => item.email.toLowerCase() === normalized);
      if (company) {
        return { role: "company", name: company.companyName || company.name, email: company.email };
      }
      return null;
    }

    syncFirebaseProfile(uid, profile) {
      const role = profile.role === "company" ? "company" : "student";
      const poolKey = role === "company" ? "companies" : "students";
      const otherPoolKey = role === "company" ? "students" : "companies";
      this.state.accounts[otherPoolKey] = this.state.accounts[otherPoolKey].filter((item) => item.id !== uid);
      const pool = this.state.accounts[poolKey];
      const existing = pool.find((item) => item.id === uid);
      const baseRecord = role === "company"
        ? {
            id: uid,
            role,
            name: profile.name,
            nameEn: profile.name,
            email: profile.email,
            password: "",
            companyName: profile.name,
            cv: profile.cv || (existing ? existing.cv : null),
            city: "Riyadh"
          }
        : {
            id: uid,
            role,
            name: profile.name,
            nameEn: profile.name,
            email: profile.email,
            password: "",
            cv: profile.cv || (existing ? existing.cv : null),
            city: "Riyadh",
            targetRoleAr: "محترف رقمي",
            targetRoleEn: "Digital Professional",
            experience: 0,
            topSkills: profile.cv && profile.cv.parsed && profile.cv.parsed.skills && profile.cv.parsed.skills.length
              ? profile.cv.parsed.skills
              : (existing && existing.topSkills ? existing.topSkills : []),
            portfolio: existing && existing.portfolio ? existing.portfolio : [],
            badges: existing && existing.badges ? existing.badges : []
          };
      if (existing) {
        Object.assign(existing, baseRecord);
      } else {
        pool.unshift(baseRecord);
      }
      if (role === "student" && !this.state.progress[uid]) {
        this.state.progress[uid] = {
          cvUploaded: false,
          cvAnalysis: null,
          readinessParts: { cv: 0, micro: 0, behavior: 0, plan: 0 },
          badges: [],
          planChecks: [false, false, false, false],
          appliedJobs: [],
          lab: { attempted: false, passed: false, answerId: null },
          behavior: { completed: false, scores: null },
          interview: { completed: false, score: 0 }
        };
        this.persistProgress();
      }
      this.persistAccounts();
    }

    async registerUser(role, name, email, password) {
      const credentials = await createUserWithEmailAndPassword(auth, email, password);
      const profile = {
        role,
        name,
        email,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, "users", credentials.user.uid), profile);
      return {
        id: credentials.user.uid,
        role,
        name,
        email
      };
    }

    async loginUser(email, password) {
      return signInWithEmailAndPassword(auth, email, password);
    }

    async logoutUser() {
      return signOut(auth);
    }

    buildCvSummaryMarkup(cvData) {
      if (!cvData || (!cvData.parsed && !cvData.aiAnalysis)) {
        return `<p class="muted">${this.state.settings.language === "ar" ? "ارفع سيرتك عشان نحللها" : "Upload your CV to analyze it."}</p>`;
      }
      const parsed = cvData.parsed || { email: "", phone: "", linkedin: "", skills: [] };
      const aiAnalysis = cvData.aiAnalysis || null;
      const previewText = (cvData.rawText || "").slice(0, 1200);
      return `
        <div class="stack">
          ${aiAnalysis ? `
            <p><strong>${this.state.settings.language === "ar" ? "الملخص" : "Summary"}:</strong> ${aiAnalysis.summary || "-"}</p>
            <p><strong>${this.state.settings.language === "ar" ? "الدور المقترح" : "Suggested role"}:</strong> ${aiAnalysis.suggested_role || "-"}</p>
            <p><strong>${this.state.settings.language === "ar" ? "المهارات الأساسية" : "Key skills"}:</strong> ${(aiAnalysis.skills || []).length ? aiAnalysis.skills.join(" , ") : "-"}</p>
            <p><strong>${this.state.settings.language === "ar" ? "المهارات الناقصة" : "Missing skills"}:</strong> ${(aiAnalysis.missing_skills || []).length ? aiAnalysis.missing_skills.join(" , ") : "-"}</p>
            <p><strong>${this.state.settings.language === "ar" ? "اقتراحات التحسين" : "Suggestions"}:</strong> ${(aiAnalysis.suggestions || []).length ? aiAnalysis.suggestions.join(" | ") : "-"}</p>
          ` : ""}
          <p><strong>Email:</strong> ${parsed.email || "-"}</p>
          <p><strong>${this.state.settings.language === "ar" ? "الجوال" : "Phone"}:</strong> ${parsed.phone || "-"}</p>
          <p><strong>LinkedIn:</strong> ${parsed.linkedin || "-"}</p>
          <p><strong>${this.state.settings.language === "ar" ? "المهارات" : "Skills"}:</strong> ${parsed.skills.length ? parsed.skills.join(" , ") : "-"}</p>
          <div id="cvPreview" class="code-block">${previewText || (this.state.settings.language === "ar" ? "لا يوجد نص معاينة متاح." : "No preview text available.")}</div>
        </div>
      `;
    }

    async saveCvToFirestore(cvPayload) {
      const currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        throw new Error("auth-required");
      }
      await setDoc(
        doc(db, "users", currentAuthUser.uid),
        {
          cv: {
            rawText: cvPayload.rawText || "",
            parsed: cvPayload.parsed || { email: "", phone: "", linkedin: "", skills: [] },
            aiAnalysis: cvPayload.aiAnalysis || null,
            updatedAt: serverTimestamp()
          }
        },
        { merge: true }
      );
    }

    async requestCvAnalysis(file) {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      const response = await fetch("/.netlify/functions/analyze-cv", {
        method: "POST",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || "analysis-failed");
        error.status = response.status;
        throw error;
      }
      return payload;
    }

    bindFirebaseSession() {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          this.state.session = null;
          this.state.authResolved = true;
          this.persistSession();
          const protectedRoute = new Set(["student-dashboard", "upload", "jobs", "job", "plan", "labs", "behavior", "interview", "profile", "company-dashboard", "candidate", "candidates", "assessments"]);
          if (protectedRoute.has(this.state.route.name)) {
            this.go("/login");
          } else {
            this.render();
          }
          return;
        }

        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const snapshot = await getDoc(userRef);
          let profile = snapshot.exists() ? snapshot.data() : null;
          if (!profile) {
            const fallbackProfile = this.findLocalProfileByEmail(firebaseUser.email);
            if (fallbackProfile) {
              profile = fallbackProfile;
              await setDoc(userRef, {
                role: profile.role,
                name: profile.name,
                email: profile.email,
                createdAt: serverTimestamp()
              }, { merge: true });
            }
          }

          if (!profile) {
            throw new Error("missing-profile");
          }

          this.syncFirebaseProfile(firebaseUser.uid, profile);
          this.state.session = { id: firebaseUser.uid, role: profile.role };
          this.state.authResolved = true;
          this.persistSession();

          const publicRoute = new Set(["landing", "login", "register", "forgot"]);
          if (publicRoute.has(this.state.route.name)) {
            this.go(this.defaultRouteForRole(profile.role));
          } else {
            this.render();
          }
        } catch (error) {
          console.error(error.code, error.message);
          this.state.session = null;
          this.state.authResolved = true;
          this.state.formErrors = {
            "login.password": error.message === "missing-profile"
              ? (this.state.settings.language === "ar" ? "لم يتم العثور على ملف المستخدم" : "User profile not found")
              : this.firebaseErrorMessage(error)
          };
          this.persistSession();
          if (this.state.route.name === "login") {
            this.render();
          } else {
            this.go("/login");
          }
        }
      });
    }

    parseRoute() {
      const hash = window.location.hash.replace(/^#/, "") || "/";
      const parts = hash.split("/").filter(Boolean);
      if (!parts.length) return { name: "landing", params: [] };
      return { name: parts[0], params: parts.slice(1) };
    }

    go(route) {
      window.location.hash = route;
    }

    bindGlobalEvents() {
      window.addEventListener("hashchange", () => {
        this.state.route = this.parseRoute();
        this.render();
      });

      document.addEventListener("click", (event) => {
        const navTarget = event.target.closest("[data-nav]");
        if (navTarget) {
          event.preventDefault();
          this.go(navTarget.dataset.nav);
          return;
        }

        const actionTarget = event.target.closest("[data-action]");
        if (actionTarget) {
          event.preventDefault();
          this.handleAction(actionTarget.dataset.action, actionTarget);
        }
      });

      document.addEventListener("change", (event) => {
        if (event.target.matches("[data-auth-role]")) {
          this.state.authRole = event.target.value;
          this.state.formErrors = {};
          this.render();
          return;
        }
        if (event.target.matches("[data-setting]")) {
          this.handleSettingChange(event.target);
        }
        if (event.target.matches("[data-filter]")) {
          this.handleFilterChange(event.target);
        }
        if (event.target.matches("[data-plan-check]")) {
          this.handlePlanCheck(event.target);
        }
        if (event.target.matches('input[name="lab-answer"]')) {
          this.state.labDraftAnswer = event.target.value;
        }
        if (event.target.matches('input[name="behavior-answer"]')) {
          this.state.behaviorDraftAnswer = event.target.value;
        }
      });

      document.addEventListener("submit", (event) => {
        if (event.target.matches("[data-form]")) {
          event.preventDefault();
          this.handleFormSubmit(event.target.dataset.form, event.target);
        }
      });

      document.addEventListener("input", (event) => {
        if (event.target.matches("[data-chat-input]")) {
          this.state.aiInterviewDrafts[this.state.aiInterviewIndex] = event.target.value;
        }
        if (event.target.matches("[data-auth-field]")) {
          this.updateAuthDraft(event.target.dataset.mode, event.target.dataset.authField, event.target.value);
          if (this.state.formErrors[event.target.dataset.errorKey]) {
            delete this.state.formErrors[event.target.dataset.errorKey];
            this.render();
          }
        }
      });
    }

    applySettings() {
      document.documentElement.lang = this.state.settings.language;
      document.documentElement.dir = this.state.settings.language === "ar" ? "rtl" : "ltr";
      document.body.dataset.theme = this.state.settings.theme;
    }

    handleSettingChange(input) {
      if (input.dataset.setting === "language") {
        this.state.settings.language = input.checked ? "en" : "ar";
      }
      if (input.dataset.setting === "theme") {
        this.state.settings.theme = input.checked ? "dark" : "light";
      }
      this.applySettings();
      this.persistSettings();
      this.render();
    }

    handleFilterChange(input) {
      const key = input.dataset.filter;
      if (key === "remote") {
        this.state.filters.remote = input.checked;
      } else if (key === "minMatch") {
        this.state.filters.minMatch = Number(input.value);
      } else {
        this.state.filters[key] = input.value;
      }
      this.render();
    }

    handlePlanCheck(input) {
      const progress = this.currentProgress();
      if (!progress) return;
      progress.planChecks[Number(input.dataset.index)] = input.checked;
      progress.readinessParts.plan = clamp(progress.planChecks.filter(Boolean).length * 2.5, 0, 10);
      this.persistProgress();
      this.render();
    }

    handleAction(action, target) {
      const user = this.currentUser();
      const progress = this.currentProgress();

      if (action === "logout") {
        this.logoutUser().catch(() => {
          this.state.formErrors = {
            "login.password": this.state.settings.language === "ar" ? "تعذر تسجيل الخروج" : "Unable to sign out"
          };
          this.render();
        });
        return;
      }

      if (action === "show-demo") {
        this.go(user ? (user.role === "student" ? "/student-dashboard" : "/company-dashboard") : "/login");
        return;
      }

      if (action === "analyze-cv") {
        if (this.state.cvUploadPending) {
          return;
        }
        if (!auth.currentUser) {
          this.state.cvStatusMessage = "لازم تسجل دخول أول";
          this.render();
          return;
        }
        const input = document.getElementById("cvInput");
        const file = input && input.files ? input.files[0] : null;
        if (!file) {
          this.state.cvStatusMessage = this.state.settings.language === "ar" ? "اختر ملف PDF أول" : "Choose a PDF first";
          this.render();
          return;
        }
        if (file.type !== "application/pdf") {
          this.state.cvStatusMessage = this.state.settings.language === "ar" ? "الملف لازم يكون PDF" : "File must be a PDF";
          this.render();
          return;
        }

        this.state.cvUploadPending = true;
        this.state.cvStatusMessage = "جاري قراءة السيرة وتحليلها...";
        this.render();

        this.requestCvAnalysis(file)
          .then(async (analysisResult) => {
            const skills = Array.isArray(analysisResult.skills) ? analysisResult.skills : [];
            const cvPayload = {
              rawText: analysisResult.raw_text_preview || "",
              parsed: {
                email: "",
                phone: "",
                linkedin: "",
                skills
              },
              aiAnalysis: {
                summary: analysisResult.summary || "",
                suggested_role: analysisResult.suggested_role || "",
                skills,
                missing_skills: Array.isArray(analysisResult.missing_skills) ? analysisResult.missing_skills : [],
                suggestions: Array.isArray(analysisResult.suggestions) ? analysisResult.suggestions : []
              }
            };
            await this.saveCvToFirestore(cvPayload);

            const currentUser = this.currentUser();
            if (currentUser) {
              currentUser.cv = cvPayload;
              if (currentUser.role === "student") {
                currentUser.topSkills = skills.length ? skills : currentUser.topSkills;
                const progressSafe = this.currentProgress();
                if (progressSafe) {
                  progressSafe.cvUploaded = true;
                  progressSafe.cvAnalysis = {
                    skills,
                    seniority: "Entry",
                    recommendedRoles: [this.altRole(currentUser)],
                    baseScore: clamp(skills.length * 6, 18, 60)
                  };
                  if (!progressSafe.badges.includes("CV Verified")) {
                    progressSafe.badges.push("CV Verified");
                  }
                  progressSafe.readinessParts.cv = clamp(progressSafe.cvAnalysis.baseScore, 0, 60);
                  this.persistProgress();
                }
              }
              this.persistAccounts();
            }

            this.state.cvStatusMessage = "تم ✅ حفظ تحليل السيرة في حسابك";
            this.state.cvUploadPending = false;
            this.render();
          })
          .catch((error) => {
            this.state.cvStatusMessage = error.message || (this.state.settings.language === "ar" ? "تعذر تحليل السيرة حالياً" : "Unable to analyze the CV right now");
            this.state.cvUploadPending = false;
            this.render();
          });
        return;
      }

      if (action === "simulate-cv-upload") {
        if (!progress) return;
        this.state.cvUploadPending = true;
        this.render();
        window.setTimeout(() => {
          progress.cvUploaded = true;
          progress.cvAnalysis = this.mockCvAnalysis(user);
          progress.readinessParts.cv = clamp(progress.cvAnalysis.baseScore, 0, 60);
          if (!progress.badges.includes("CV Verified")) {
            progress.badges.push("CV Verified");
          }
          this.state.cvUploadPending = false;
          this.persistProgress();
          this.go("/student-dashboard");
        }, 3600);
        return;
      }

      if (action === "apply-job") {
        if (!progress) return;
        const jobId = target.dataset.jobId;
        if (!progress.appliedJobs.includes(jobId)) {
          progress.appliedJobs.push(jobId);
          this.persistProgress();
        }
        window.alert(this.state.settings.language === "ar" ? "تم تسجيل التقديم بنجاح" : "Application saved successfully");
        this.render();
        return;
      }

      if (action === "start-lab") {
        if (!progress || progress.lab.attempted) return;
        this.state.labTimer = 180;
        this.state.labDraftAnswer = "";
        clearInterval(this.labInterval);
        this.labInterval = window.setInterval(() => {
          this.state.labTimer -= 1;
          if (this.state.labTimer <= 0) {
            clearInterval(this.labInterval);
            progress.lab.attempted = true;
            progress.lab.passed = false;
            progress.lab.answerId = "timeout";
            this.persistProgress();
          }
          this.render();
        }, 1000);
        this.render();
        return;
      }

      if (action === "submit-lab-answer") {
        if (!progress || progress.lab.attempted) return;
        const lab = DATA.labs[0];
        if (!this.state.labDraftAnswer) {
          window.alert(this.state.settings.language === "ar" ? "اختر إجابة أولاً" : "Select an answer first");
          return;
        }
        clearInterval(this.labInterval);
        const answer = lab.options.find((item) => item.id === this.state.labDraftAnswer);
        progress.lab.attempted = true;
        progress.lab.passed = !!answer.correct;
        progress.lab.answerId = answer.id;
        progress.readinessParts.micro = answer.correct ? 25 : 6;
        if (answer.correct && !progress.badges.includes("SQL Debug Verified")) {
          progress.badges.push("SQL Debug Verified");
        }
        this.persistProgress();
        this.render();
        return;
      }

      if (action === "submit-behavior") {
        if (!progress || progress.behavior.completed) return;
        if (!this.state.behaviorDraftAnswer) {
          window.alert(this.state.settings.language === "ar" ? "اختر رداً" : "Choose a response");
          return;
        }
        const choice = DATA.behaviorScenario.options.find((item) => item.id === this.state.behaviorDraftAnswer);
        progress.behavior.completed = true;
        progress.behavior.scores = {
          communication: choice.communication,
          empathy: choice.empathy,
          problem: choice.problem
        };
        progress.readinessParts.behavior = clamp(choice.communication + choice.empathy + choice.problem, 0, 15);
        if (progress.readinessParts.behavior >= 13 && !progress.badges.includes("Behavioral Ready")) {
          progress.badges.push("Behavioral Ready");
        }
        this.persistProgress();
        this.render();
        return;
      }

      if (action === "next-interview") {
        const answer = (this.state.aiInterviewDrafts[this.state.aiInterviewIndex] || "").trim();
        if (!answer) {
          window.alert(this.state.settings.language === "ar" ? "أدخل إجابة مختصرة" : "Enter a short answer");
          return;
        }
        if (this.state.aiInterviewIndex < DATA.interviewQuestions.length - 1) {
          this.state.aiInterviewIndex += 1;
        } else {
          const nonEmpty = Object.values(this.state.aiInterviewDrafts).filter(Boolean).length;
          const progressSafe = progress || this.currentProgress();
          if (progressSafe) {
            progressSafe.interview.completed = true;
            progressSafe.interview.score = clamp(60 + nonEmpty * 7, 0, 95);
            if (progressSafe.interview.score >= 85 && !progressSafe.badges.includes("Interview Ready")) {
              progressSafe.badges.push("Interview Ready");
            }
            this.persistProgress();
          }
          this.state.aiInterviewDone = true;
        }
        this.render();
        return;
      }

      if (action === "reset-interview") {
        this.state.aiInterviewDrafts = {};
        this.state.aiInterviewIndex = 0;
        this.state.aiInterviewDone = false;
        this.render();
        return;
      }

      if (action === "download-profile") {
        window.alert(this.state.settings.language === "ar" ? "تم تجهيز بطاقة PNG للتنزيل (محاكاة)" : "PNG card prepared for download (simulation)");
        return;
      }

      if (action === "invite-candidate") {
        window.alert(this.state.settings.language === "ar" ? "تم إرسال الدعوة للمقابلة" : "Interview invite sent");
        return;
      }

      if (action === "use-demo-account") {
        const demo = DEMO_ACCOUNTS[this.state.authRole];
        this.state.authDrafts.login[this.state.authRole] = {
          email: demo.email,
          password: demo.password
        };
        this.state.formErrors = {};
        this.render();
        return;
      }

      if (action === "go-register") {
        this.state.formErrors = {};
        this.go("/register");
        return;
      }

      if (action === "go-login") {
        this.state.formErrors = {};
        this.go("/login");
        return;
      }
    }

    async handleFormSubmit(formName, form) {
      const data = new FormData(form);

      if (formName === "login") {
        if (this.state.authPending) {
          return;
        }
        const role = data.get("role");
        const email = String(data.get("email") || "").trim().toLowerCase();
        const password = String(data.get("password") || "");
        const errors = {};
        if (!this.validateEmail(email)) {
          errors["login.email"] = this.state.settings.language === "ar" ? "صيغة البريد غير صحيحة" : "Invalid email format";
        }
        if (password.length < 6) {
          errors["login.password"] = this.state.settings.language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters";
        }
        if (Object.keys(errors).length) {
          this.state.formErrors = errors;
          this.render();
          return;
        }
        try {
          this.state.authPending = true;
          this.state.formErrors = {};
          this.render();
          await this.loginUser(email, password);
        } catch (error) {
          console.error(error.code, error.message);
          this.state.formErrors = {
            "login.password": this.firebaseErrorMessage(error)
          };
          this.render();
        } finally {
          this.state.authPending = false;
        }
        return;
      }

      if (formName === "register") {
        if (this.state.authPending) {
          return;
        }
        const role = data.get("role");
        const email = String(data.get("email") || "").trim().toLowerCase();
        const password = String(data.get("password") || "");
        const confirmPassword = String(data.get("confirmPassword") || "");
        const errors = {};
        const poolKey = role === "company" ? "companies" : "students";
        const fullName = String(data.get("fullName") || "").trim();
        const companyName = String(data.get("companyName") || "").trim();
        const hrName = String(data.get("hrName") || "").trim();

        if (role === "student" && !fullName) {
          errors["register.fullName"] = this.state.settings.language === "ar" ? "الاسم مطلوب" : "Full name is required";
        }
        if (role === "company" && !companyName) {
          errors["register.companyName"] = this.state.settings.language === "ar" ? "اسم الشركة مطلوب" : "Company name is required";
        }
        if (role === "company" && !hrName) {
          errors["register.hrName"] = this.state.settings.language === "ar" ? "اسم مسؤول التوظيف مطلوب" : "HR name is required";
        }
        if (!this.validateEmail(email)) {
          errors["register.email"] = this.state.settings.language === "ar" ? "صيغة البريد غير صحيحة" : "Invalid email format";
        }
        if (password.length < 6) {
          errors["register.password"] = this.state.settings.language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters";
        }
        if (password !== confirmPassword) {
          errors["register.confirmPassword"] = this.state.settings.language === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match";
        }
        if (Object.keys(errors).length) {
          this.state.formErrors = errors;
          this.render();
          return;
        }

        try {
          this.state.authPending = true;
          const displayName = role === "company" ? companyName : fullName;
          const created = await this.registerUser(role, displayName, email, password);
          const localRecord = role === "company"
            ? {
                id: created.id,
                role,
                name: hrName,
                nameEn: hrName,
                email,
                password: "",
                companyName,
                city: "Riyadh"
              }
            : {
                id: created.id,
                role,
                name: fullName,
                nameEn: fullName,
                email,
                password: "",
                city: "Riyadh",
                targetRoleAr: "محترف رقمي",
                targetRoleEn: "Digital Professional",
                experience: 0,
                topSkills: [],
                portfolio: [],
                badges: []
              };
          this.state.accounts.students = this.state.accounts.students.filter((item) => item.email.toLowerCase() !== email);
          this.state.accounts.companies = this.state.accounts.companies.filter((item) => item.email.toLowerCase() !== email);
          this.state.accounts[poolKey] = this.state.accounts[poolKey].filter((item) => item.id !== created.id);
          this.state.accounts[poolKey].unshift(localRecord);
          this.persistAccounts();
          if (role === "student" && !this.state.progress[created.id]) {
            this.state.progress[created.id] = {
              cvUploaded: false,
              cvAnalysis: null,
              readinessParts: { cv: 0, micro: 0, behavior: 0, plan: 0 },
              badges: [],
              planChecks: [false, false, false, false],
              appliedJobs: [],
              lab: { attempted: false, passed: false, answerId: null },
              behavior: { completed: false, scores: null },
              interview: { completed: false, score: 0 }
            };
            this.persistProgress();
          }
          this.state.formErrors = {};
          this.setToast(this.state.settings.language === "ar" ? "تم إنشاء الحساب بنجاح" : "Account created successfully");
        } catch (error) {
          console.error(error.code, error.message);
          this.state.formErrors = {
            "register.email": this.firebaseErrorMessage(error)
          };
          this.render();
        } finally {
          this.state.authPending = false;
        }
        return;
      }

      if (formName === "role-requirement") {
        const requiredSkills = String(data.get("requiredSkills") || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const roleReq = {
          id: uid("role"),
          title: String(data.get("title") || ""),
          requiredSkills,
          years: Number(data.get("years") || 0),
          salary: String(data.get("salary") || ""),
          location: String(data.get("location") || "Riyadh")
        };
        this.state.companyRoles = [roleReq, ...this.state.companyRoles];
        this.persistCompanyRoles();
        this.go("/company-dashboard");
        return;
      }

      if (formName === "assessment-builder") {
        const stack = String(data.get("stack") || "General");
        const difficulty = String(data.get("difficulty") || "Mid");
        const generated = [
          `${stack} scenario: debug an edge case for a production form validation flow.`,
          `${stack} logic check: explain why your first fix avoids regression at ${difficulty} level.`,
          `${stack} collaboration prompt: describe how you would document assumptions for reviewers.`
        ];
        this.state.generatedAssessment = generated;
        this.render();
        return;
      }
    }

    mockCvAnalysis(user) {
      const baseSkills = user.topSkills && user.topSkills.length ? user.topSkills : ["Communication", "Excel"];
      const matched = this.getMatchesForUser(user)[0];
      return {
        skills: baseSkills,
        seniority: user.experience >= 2 ? "Junior+" : "Entry",
        recommendedRoles: matched ? [this.jobTitle(matched.job), this.altRole(user)] : [this.altRole(user)],
        baseScore: matched ? clamp(matched.match + 12, 25, 60) : 34
      };
    }

    altRole(user) {
      return this.state.settings.language === "ar" ? user.targetRoleAr : user.targetRoleEn;
    }

    jobTitle(job) {
      return this.state.settings.language === "ar" ? job.titleAr : job.titleEn;
    }

    displayName(user) {
      return this.state.settings.language === "ar" ? user.name : (user.nameEn || user.name);
    }

    candidateRole(user) {
      return this.state.settings.language === "ar" ? user.targetRoleAr : user.targetRoleEn;
    }

    getReadiness(userId) {
      const progress = this.state.progress[userId];
      if (!progress) return 0;
      const sum = progress.readinessParts.cv + progress.readinessParts.micro + progress.readinessParts.behavior + progress.readinessParts.plan;
      return clamp(Math.round(sum), 0, 100);
    }

    getMatchesForUser(user) {
      const skills = (user.topSkills || []).map((item) => item.toLowerCase());
      return DATA.jobs.map((job) => {
        const matchedSkills = job.skills.filter((skill) => skills.includes(skill.toLowerCase()));
        const missingSkills = job.skills.filter((skill) => !skills.includes(skill.toLowerCase()));
        const match = clamp(Math.round((matchedSkills.length / job.skills.length) * 100), 15, 98);
        return { job, matchedSkills, missingSkills, match };
      }).sort((a, b) => b.match - a.match);
    }

    getFilteredMatches(user) {
      const all = this.getMatchesForUser(user);
      return all.filter((item) => {
        const passCity = this.state.filters.city === "all" || item.job.city === this.state.filters.city;
        const passType = this.state.filters.type === "all" || item.job.type === this.state.filters.type;
        const passScore = item.match >= this.state.filters.minMatch;
        const passSkill = this.state.filters.skill === "all" || item.job.skills.includes(this.state.filters.skill);
        const passRemote = !this.state.filters.remote || item.job.remote;
        return passCity && passType && passScore && passSkill && passRemote;
      });
    }

    getSkillGaps(user) {
      const topMatch = this.getMatchesForUser(user)[0];
      if (!topMatch) return [];
      return topMatch.missingSkills.map((skill, index) => ({
        skill,
        current: index === 0 ? "20%" : "35%",
        target: "85%",
        priority: index === 0 ? "High" : "Medium",
        impact: index === 0 ? "+12 readiness" : "+7 readiness"
      }));
    }

    rankCandidates(roleReq) {
      return this.state.accounts.students.map((student) => {
        const studentSkills = (student.topSkills || []).map((item) => item.toLowerCase());
        const matchedSkills = roleReq.requiredSkills.filter((skill) => studentSkills.includes(skill.toLowerCase()));
        const skillMatch = roleReq.requiredSkills.length ? Math.round((matchedSkills.length / roleReq.requiredSkills.length) * 100) : 0;
        const readiness = this.getReadiness(student.id);
        const overall = Math.round(skillMatch * 0.55 + readiness * 0.45);
        return {
          student,
          readiness,
          skillMatch,
          overall,
          matchedSkills,
          missingSkills: roleReq.requiredSkills.filter((skill) => !studentSkills.includes(skill.toLowerCase()))
        };
      }).sort((a, b) => b.overall - a.overall);
    }

    topBar() {
      const user = this.currentUser();
      const isPublic = !user;
      return `
        <header class="topbar glass">
          <button class="brand" data-nav="/">
            <span class="brand-mark"></span>
            <span>
              <strong>${this.t("brand")}</strong>
              <small>${this.t("tagline")}</small>
            </span>
          </button>
          <nav class="topnav">
            ${isPublic ? `
              <button data-nav="/">${this.t("navHome")}</button>
              <button data-nav="/plans">${this.t("navPlans")}</button>
              <button data-nav="/about">${this.t("navAbout")}</button>
              <button data-nav="/contact">${this.t("navContact")}</button>
            ` : `
              <button data-nav="${user.role === "student" ? "/student-dashboard" : "/company-dashboard"}">${this.t("dashboard")}</button>
              <button data-nav="${user.role === "student" ? "/jobs" : "/assessments"}">${user.role === "student" ? this.t("jobs") : this.t("assessments")}</button>
            `}
          </nav>
          <div class="toolbar">
            <label class="toggle-pill">
              <span>AR</span>
              <input type="checkbox" data-setting="language" ${this.state.settings.language === "en" ? "checked" : ""}>
              <span>EN</span>
            </label>
            <label class="toggle-pill">
              <span>☀</span>
              <input type="checkbox" data-setting="theme" ${this.state.settings.theme === "dark" ? "checked" : ""}>
              <span>☾</span>
            </label>
            ${user ? `<button class="btn btn-ghost" data-action="logout">${this.t("navLogout")}</button>` : `<button class="btn btn-primary" data-nav="/login">${this.t("navLogin")}</button>`}
          </div>
        </header>
      `;
    }

    bottomTabs() {
      const user = this.currentUser();
      if (!user) return "";
      const tabs = user.role === "student"
        ? [
            ["/student-dashboard", this.t("navHome")],
            ["/jobs", this.t("jobs")],
            ["/labs", this.t("labs")],
            ["/plan", this.t("plan")],
            ["/profile", this.t("profile")]
          ]
        : [
            ["/company-dashboard", this.t("dashboard")],
            ["/company-dashboard", this.t("roles")],
            ["/candidates", this.t("candidates")],
            ["/assessments", this.t("assessments")],
            ["/contact", this.t("settings")]
          ];
      return `
        <nav class="bottom-tabs glass">
          ${tabs.map(([route, label]) => `<button data-nav="${route}" class="${window.location.hash === "#" + route ? "active" : ""}">${label}</button>`).join("")}
        </nav>
      `;
    }

    landingPage() {
      const user = this.currentUser();
      return `
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">Saudi AI Career Readiness</span>
            <h1>${this.state.settings.language === "ar" ? "من السيرة الذاتية إلى المقابلة بثقة قابلة للقياس" : "From CV to interview with measurable confidence"}</h1>
            <p>${this.state.settings.language === "ar" ? "تمهيد يربط الجاهزية المهنية بالمهارات الفعلية، التقييم العملي، وتوصيات ذكية مصممة لسوق العمل السعودي." : "Tamheed connects real skills, practical proof, and AI-guided development for the Saudi hiring market."}</p>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="${user ? (user.role === "student" ? "/student-dashboard" : "/company-dashboard") : "/register"}">${this.t("ctaStart")}</button>
              <button class="btn btn-ghost" data-action="show-demo">${this.t("ctaDemo")}</button>
            </div>
            <div class="hero-metrics">
              <div class="metric-card"><strong>92%</strong><span>${this.state.settings.language === "ar" ? "وضوح أعلى للمرشح" : "Clearer candidate signal"}</span></div>
              <div class="metric-card"><strong>4 أسابيع</strong><span>${this.state.settings.language === "ar" ? "خطة تطوير عملية" : "Actionable plan"}</span></div>
              <div class="metric-card"><strong>1 منصة</strong><span>${this.state.settings.language === "ar" ? "للطالب والشركة" : "Student + company"}</span></div>
            </div>
          </div>
          <div class="hero-showcase">
            <div class="showcase-card">
              <div class="ring" style="--value:78">
                <span>78</span>
              </div>
              <div>
                <h3>${this.state.settings.language === "ar" ? "جاهزية مهنية ذكية" : "Smart readiness"}</h3>
                <p>${this.state.settings.language === "ar" ? "تحليل سيرة + فجوات + مهارات موثقة" : "CV analysis + gaps + verified skills"}</p>
              </div>
            </div>
            <div class="showcase-grid">
              <article class="mini-shot">
                <span>${this.state.settings.language === "ar" ? "أفضل مطابقة" : "Top Match"}</span>
                <strong>stc / Data Analyst</strong>
                <small>84% match</small>
              </article>
              <article class="mini-shot">
                <span>${this.state.settings.language === "ar" ? "شارة موثقة" : "Verified Badge"}</span>
                <strong>SQL Debug Verified</strong>
                <small>${this.state.settings.language === "ar" ? "بعد اختبار مصغر" : "After micro-lab"}</small>
              </article>
            </div>
          </div>
        </section>
        <section class="section-grid">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "كيف تعمل المنصة" : "How it works"}</h3>
            <p>${this.state.settings.language === "ar" ? "ترفع السيرة، تحصل على تحليل ذكي، تنفذ مختبراً عملياً، ثم تبني خطة تطوير قابلة للتتبع." : "Upload your CV, receive AI analysis, prove skills in labs, then execute a trackable development plan."}</p>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "لأقسام الموارد البشرية" : "For HR teams"}</h3>
            <p>${this.state.settings.language === "ar" ? "أنشئ متطلبات خاصة لكل وظيفة واحصل على ترتيب واضح للمرشحين حسب الجاهزية والمهارات الموثقة." : "Create private role criteria and instantly rank candidates by readiness and verified skill evidence."}</p>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "متوافق مع رؤية 2030" : "Aligned with Vision 2030"}</h3>
            <p>${this.state.settings.language === "ar" ? "رفع قابلية التوظيف، تسريع المواءمة بين التعليم وسوق العمل، وتمكين المواهب الرقمية الوطنية." : "Improving employability, tightening education-to-market alignment, and enabling local digital talent."}</p>
          </article>
        </section>
      `;
    }

    plansPage() {
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "خطط تمهيد" : "Tamheed Plans"}</h1>
          <p>${this.state.settings.language === "ar" ? "هيكل تسعير تجريبي لعرض القيمة." : "Prototype pricing architecture to show value."}</p>
        </section>
        <section class="cards three-up">
          <article class="plan-card">
            <span class="badge-soft">${this.state.settings.language === "ar" ? "للأفراد" : "For Individuals"}</span>
            <h3>${this.state.settings.language === "ar" ? "Starter" : "Starter"}</h3>
            <strong>49 SAR</strong>
            <p>${this.state.settings.language === "ar" ? "تحليل سيرة + 1 مختبر + خطة 4 أسابيع" : "CV scan + 1 lab + 4-week plan"}</p>
          </article>
          <article class="plan-card featured">
            <span class="badge-soft">${this.state.settings.language === "ar" ? "الأكثر طلباً" : "Most Popular"}</span>
            <h3>${this.state.settings.language === "ar" ? "Pro" : "Pro"}</h3>
            <strong>149 SAR</strong>
            <p>${this.state.settings.language === "ar" ? "مطابقة وظائف + مقابلة ذكية + ملف QR" : "Job matching + mock interview + smart QR profile"}</p>
          </article>
          <article class="plan-card">
            <span class="badge-soft">${this.state.settings.language === "ar" ? "للشركات" : "For Companies"}</span>
            <h3>${this.state.settings.language === "ar" ? "Enterprise" : "Enterprise"}</h3>
            <strong>Custom</strong>
            <p>${this.state.settings.language === "ar" ? "ترتيب مرشحين + اختبارات مولدة + مسارات تقييم" : "Candidate ranking + generated assessments + custom evaluation flows"}</p>
          </article>
        </section>
      `;
    }

    aboutPage() {
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "عن تمهيد" : "About Tamheed"}</h1>
          <p>${this.state.settings.language === "ar" ? "منصة عربية تترجم الجاهزية المهنية إلى مؤشرات قابلة للفهم والتنفيذ." : "An Arabic-first platform translating career readiness into measurable, actionable signals."}</p>
        </section>
        <section class="info-card large">
          <h3>${this.state.settings.language === "ar" ? "رؤية 2030" : "Vision 2030"}</h3>
          <p>${this.state.settings.language === "ar" ? "تمهيد يدعم تمكين المواهب الوطنية عبر مواءمة أفضل بين ما يتعلمه المرشح وما يتطلبه سوق العمل، مع تركيز على التحقق العملي من المهارات." : "Tamheed supports national talent development by aligning candidate growth with hiring demand, with a strong emphasis on practical validation."}</p>
        </section>
      `;
    }

    contactPage() {
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "تواصل معنا" : "Contact"}</h1>
          <p>${this.state.settings.language === "ar" ? "قناة تجريبية لعرض التجربة." : "Prototype contact surface for the experience."}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <h3>Email</h3>
            <p>hello@tamheed.demo</p>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "الموقع" : "Location"}</h3>
            <p>Riyadh, Saudi Arabia</p>
          </article>
        </section>
      `;
    }

    authPage(mode) {
      const isLogin = mode === "login";
      const draft = this.getAuthDraft(mode);
      const demo = DEMO_ACCOUNTS[this.state.authRole];
      return `
        <section class="auth-shell">
          <div class="auth-side">
            <span class="eyebrow">${this.state.settings.language === "ar" ? "وصول آمن" : "Secure access"}</span>
            <h1 class="auth-title ${isLogin ? "auth-title-login" : ""}">${isLogin ? (this.state.settings.language === "ar" ? "تسجيل دخول" : "Login") : this.t("register")}</h1>
            <p>${isLogin
              ? (this.state.settings.language === "ar" ? "سجّل الدخول بحسابك أو استخدم الحساب التجريبي المناسب للدور المحدد." : "Sign in with your account or use the demo account for the selected role.")
              : (this.state.settings.language === "ar" ? "أنشئ حساباً جديداً وسيتم تسجيل دخولك مباشرة بعد الحفظ." : "Create a new account and you will be signed in automatically.")}</p>
          </div>
          <div class="auth-flow">
            <form class="auth-card" data-form="${isLogin ? "login" : "register"}">
              <div class="segmented">
                <label><input type="radio" name="role" value="student" data-auth-role ${this.state.authRole === "student" ? "checked" : ""}> ${this.t("student")}</label>
                <label><input type="radio" name="role" value="company" data-auth-role ${this.state.authRole === "company" ? "checked" : ""}> ${this.t("company")}</label>
              </div>
              ${!isLogin && this.state.authRole === "student" ? `
                <label>${this.state.settings.language === "ar" ? "الاسم الكامل" : "Full name"}
                  <input name="fullName" data-mode="register" data-auth-field="fullName" data-error-key="register.fullName" value="${draft.fullName || ""}" required>
                  ${this.errorText("register.fullName")}
                </label>
              ` : ""}
              ${!isLogin && this.state.authRole === "company" ? `
                <label>${this.state.settings.language === "ar" ? "اسم الشركة" : "Company name"}
                  <input name="companyName" data-mode="register" data-auth-field="companyName" data-error-key="register.companyName" value="${draft.companyName || ""}" required>
                  ${this.errorText("register.companyName")}
                </label>
                <label>${this.state.settings.language === "ar" ? "اسم مسؤول التوظيف" : "HR name"}
                  <input name="hrName" data-mode="register" data-auth-field="hrName" data-error-key="register.hrName" value="${draft.hrName || ""}" required>
                  ${this.errorText("register.hrName")}
                </label>
              ` : ""}
              <label>Email
                <input name="email" type="email" data-mode="${mode}" data-auth-field="email" data-error-key="${mode}.email" value="${draft.email || ""}" required>
                ${this.errorText(`${mode}.email`)}
              </label>
              <label>${this.state.settings.language === "ar" ? "كلمة المرور" : "Password"}
                <input name="password" type="password" data-mode="${mode}" data-auth-field="password" data-error-key="${mode}.password" value="${draft.password || ""}" required>
                ${this.errorText(`${mode}.password`)}
              </label>
              ${!isLogin ? `
                <label>${this.state.settings.language === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}
                  <input name="confirmPassword" type="password" data-mode="register" data-auth-field="confirmPassword" data-error-key="register.confirmPassword" value="${draft.confirmPassword || ""}" required>
                  ${this.errorText("register.confirmPassword")}
                </label>
              ` : ""}
              <button class="btn btn-primary" type="submit">${isLogin ? this.t("login") : this.t("register")}</button>
            </form>
            ${isLogin ? `
              <article class="auth-helper-card">
                <strong>${this.state.settings.language === "ar" ? "الحسابات الجاهزة" : "Demo account"}</strong>
                <p>${this.state.settings.language === "ar" ? `الاسم: ${demo.name} | البريد: ${demo.email} | كلمة المرور: ${demo.password}` : `Name: ${demo.nameEn || demo.name} | Email: ${demo.email} | Password: ${demo.password}`}</p>
                <button class="btn btn-ghost btn-small" data-action="use-demo-account">${this.state.settings.language === "ar" ? "استخدم هذا الحساب" : "Use this account"}</button>
              </article>
              <div class="auth-links auth-links-stack">
                <button type="button" data-nav="/forgot">${this.t("forgot")}</button>
                <button type="button" class="auth-inline-link" data-action="go-register">${this.state.settings.language === "ar" ? "ما عندك حساب؟ تسجيل جديد" : "No account? Register"}</button>
              </div>
            ` : `
              <div class="auth-links auth-links-stack">
                <button type="button" class="auth-inline-link" data-action="go-login">${this.state.settings.language === "ar" ? "عندك حساب؟ تسجيل دخول" : "Already have an account? Login"}</button>
              </div>
            `}
          </div>
        </section>
      `;
    }

    forgotPage() {
      return `
        <section class="auth-shell compact">
          <form class="auth-card">
            <h1>${this.t("forgot")}</h1>
            <p>${this.state.settings.language === "ar" ? "استعادة كلمة المرور محاكاة فقط. استخدم الحسابات التجريبية الجاهزة." : "Password recovery is simulated. Use the built-in demo credentials."}</p>
            <label>Email<input type="email"></label>
            <button class="btn btn-primary" type="button">${this.state.settings.language === "ar" ? "إرسال رابط (محاكاة)" : "Send link (simulated)"}</button>
          </form>
        </section>
      `;
    }

    studentDashboard() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const readiness = this.getReadiness(user.id);
      const matches = this.getMatchesForUser(user).slice(0, 5);
      const gaps = this.getSkillGaps(user);
      const analysis = progress.cvAnalysis;
      const cvSkills = user.cv && user.cv.parsed && user.cv.parsed.skills && user.cv.parsed.skills.length
        ? user.cv.parsed.skills
        : (analysis ? analysis.skills : []);
      return `
        <section class="page-head tight">
          <h1>${this.state.settings.language === "ar" ? `مرحباً ${this.displayName(user)}` : `Welcome ${this.displayName(user)}`}</h1>
          <p>${this.state.settings.language === "ar" ? "ملخص رحلتك الحالية نحو الجاهزية المهنية." : "A snapshot of your current career-readiness journey."}</p>
        </section>
        <section class="dashboard-grid">
          <article class="hero-panel">
            <div class="ring large" style="--value:${readiness}">
              <span>${readiness}</span>
            </div>
            <div class="hero-panel-copy">
              <h3>${this.t("score")}</h3>
              <p>${this.state.settings.language === "ar" ? "المعادلة: مطابقة السيرة + المختبر + السلوك + التقدم في الخطة" : "Formula: CV match + lab + behavioral + plan progress"}</p>
              <div class="badge-row">
                ${(progress.badges || []).map((badge) => `<span class="badge-soft">${badge}</span>`).join("") || `<span class="muted">${this.t("empty")}</span>`}
              </div>
            </div>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "مهارات مستخرجة من السيرة" : "Skills extracted from CV"}</h3>
            <div class="chip-row">
              ${cvSkills.length ? cvSkills.map((skill) => `<span class="chip">${skill}</span>`).join("") : `<span class="muted">${this.state.settings.language === "ar" ? "ارفع سيرتك عشان نحللها" : "Upload your CV so we can analyze it."}</span>`}
            </div>
            <button class="btn btn-ghost" data-nav="/upload">${this.t("uploadCv")}</button>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "أفضل الوظائف المطابقة" : "Top matched jobs"}</h3>
            ${matches.map((item) => `
              <div class="list-row">
                <div><strong>${this.jobTitle(item.job)}</strong><small>${item.job.company} · ${item.job.city}</small></div>
                <span class="score-pill">${item.match}%</span>
              </div>
            `).join("")}
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "فجوات المهارات" : "Skill gaps"}</h3>
            ${gaps.length ? gaps.map((gap) => `<div class="list-row"><div><strong>${gap.skill}</strong><small>${gap.priority}</small></div><span class="muted">${gap.impact}</span></div>`).join("") : `<p class="muted">${this.t("empty")}</p>`}
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "خطة تطوير 4 أسابيع" : "4-week development plan"}</h3>
            ${DATA.plans.map((week, index) => `
              <div class="timeline-item">
                <strong>${this.state.settings.language === "ar" ? `الأسبوع ${week.week}` : `Week ${week.week}`}</strong>
                <small>${this.state.settings.language === "ar" ? week.taskAr : week.taskEn}</small>
                <span>${progress.planChecks[index] ? "✓" : "○"}</span>
              </div>
            `).join("")}
          </article>
        </section>
      `;
    }

    uploadCvPage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const analysis = progress ? progress.cvAnalysis : null;
      const cvData = user && user.cv ? user.cv : null;
      return `
        <section class="page-head">
          <h1>${this.t("uploadCv")}</h1>
          <p>${this.state.settings.language === "ar" ? "ارفع ملف PDF لتحليل السيرة محلياً داخل المتصفح." : "Upload a PDF to analyze the CV locally in the browser."}</p>
        </section>
        <section class="cards two-up">
          <article class="dropzone ${this.state.cvUploadPending ? "loading" : ""}">
            <div class="dropzone-inner">
              <strong>${this.state.settings.language === "ar" ? "اختر ملف PDF من جهازك" : "Choose a PDF from your device"}</strong>
              <p>PDF</p>
              <input type="file" accept="application/pdf" id="cvInput">
              <button class="btn btn-primary" id="analyzeCvBtn" type="button" data-action="analyze-cv">${this.state.cvUploadPending ? "جاري التحليل..." : "حلّل السيرة"}</button>
              <p id="cvStatus" class="muted">${this.state.cvStatusMessage || (this.state.settings.language === "ar" ? "لن يتم رفع الملف إلى أي خادم." : "The file stays in your browser.")}</p>
            </div>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "نتائج التحليل" : "Analysis results"}</h3>
            ${this.state.cvUploadPending ? `<div class="ai-loader"><span></span><span></span><span></span></div>` : cvData ? `
              ${this.buildCvSummaryMarkup(cvData)}
            ` : analysis ? `
              <div class="stack">
                <p><strong>${this.state.settings.language === "ar" ? "المهارات" : "Skills"}:</strong> ${analysis.skills.join(" , ")}</p>
                <p><strong>${this.state.settings.language === "ar" ? "الخبرة المتوقعة" : "Seniority"}:</strong> ${analysis.seniority}</p>
                <p><strong>${this.state.settings.language === "ar" ? "أدوار مقترحة" : "Recommended roles"}:</strong> ${analysis.recommendedRoles.join(" / ")}</p>
                <div id="cvPreview" class="code-block">${this.state.settings.language === "ar" ? "التحليل المحلي سيعرض هنا بعد قراءة ملف PDF." : "Local PDF analysis will appear here."}</div>
              </div>
            ` : `<div id="cvPreview"><p class="muted">${this.t("empty")}</p></div>`}
          </article>
        </section>
      `;
    }

    jobsPage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const matches = this.getFilteredMatches(user);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "المطابقة الذكية للوظائف" : "Smart Job Matching"}</h1>
          <p>${this.state.settings.language === "ar" ? "فلتر النتائج حسب المدينة، نوع الدور، المهارة، ونسبة المطابقة." : "Filter by city, role type, skill, and match percentage."}</p>
        </section>
        <section class="filter-bar glass">
          <select data-filter="city">
            <option value="all">${this.state.settings.language === "ar" ? "كل المدن" : "All cities"}</option>
            ${["Riyadh", "Jeddah", "Dhahran", "Tabuk"].map((city) => `<option value="${city}" ${this.state.filters.city === city ? "selected" : ""}>${city}</option>`).join("")}
          </select>
          <select data-filter="type">
            <option value="all">${this.state.settings.language === "ar" ? "كل الأنواع" : "All types"}</option>
            ${["Hybrid", "On-site", "Remote"].map((type) => `<option value="${type}" ${this.state.filters.type === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
          <select data-filter="skill">
            <option value="all">${this.state.settings.language === "ar" ? "كل المهارات" : "All skills"}</option>
            ${DATA.skills.map((skill) => `<option value="${skill}" ${this.state.filters.skill === skill ? "selected" : ""}>${skill}</option>`).join("")}
          </select>
          <label class="range-wrap">
            <span>${this.state.settings.language === "ar" ? "الحد الأدنى" : "Min match"}: ${this.state.filters.minMatch}%</span>
            <input type="range" min="0" max="100" value="${this.state.filters.minMatch}" data-filter="minMatch">
          </label>
          <label class="checkbox-wrap">
            <input type="checkbox" data-filter="remote" ${this.state.filters.remote ? "checked" : ""}>
            <span>${this.state.settings.language === "ar" ? "عن بعد فقط" : "Remote only"}</span>
          </label>
        </section>
        <section class="cards">
          ${matches.length ? matches.map((item) => `
            <article class="job-card">
              <div class="job-card-head">
                <div>
                  <h3>${this.jobTitle(item.job)}</h3>
                  <p>${item.job.company} · ${item.job.city}</p>
                </div>
                <span class="score-pill">${item.match}%</span>
              </div>
              <p>${this.state.settings.language === "ar" ? item.job.descriptionAr : item.job.descriptionEn}</p>
              <div class="chip-row">${item.job.skills.map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
              <div class="job-meta">
                <span>${item.job.salary}</span>
                <span>${item.job.type}</span>
              </div>
              <div class="actions-row">
                <button class="btn btn-ghost" data-nav="/job/${item.job.id}">${this.state.settings.language === "ar" ? "التفاصيل" : "Details"}</button>
                <button class="btn btn-primary" data-action="apply-job" data-job-id="${item.job.id}">${progress.appliedJobs.includes(item.job.id) ? (this.state.settings.language === "ar" ? "تم التقديم" : "Applied") : this.t("apply")}</button>
              </div>
            </article>
          `).join("") : `<article class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "لا توجد نتائج مطابقة للفلترة الحالية." : "No jobs match the current filters."}</p></article>`}
        </section>
      `;
    }

    jobDetailsPage(jobId) {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const item = this.getMatchesForUser(user).find((entry) => entry.job.id === jobId);
      if (!item) {
        return `<section class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "الوظيفة غير موجودة." : "Job not found."}</p></section>`;
      }
      return `
        <section class="page-head">
          <h1>${this.jobTitle(item.job)}</h1>
          <p>${item.job.company} · ${item.job.city} · ${item.job.salary}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "تفاصيل المطابقة" : "Match breakdown"}</h3>
            <div class="stack">
              <p><strong>${this.state.settings.language === "ar" ? "المطابقة" : "Match"}:</strong> ${item.match}%</p>
              <p><strong>${this.state.settings.language === "ar" ? "المهارات المتطابقة" : "Matched skills"}:</strong> ${item.matchedSkills.join(", ") || "-"}</p>
              <p><strong>${this.state.settings.language === "ar" ? "المهارات الناقصة" : "Missing skills"}:</strong> ${item.missingSkills.join(", ") || "-"}</p>
            </div>
            <div class="actions-row">
              <button class="btn btn-primary" data-action="apply-job" data-job-id="${item.job.id}">${progress.appliedJobs.includes(item.job.id) ? (this.state.settings.language === "ar" ? "تم التقديم" : "Applied") : this.t("apply")}</button>
              <button class="btn btn-ghost" data-nav="/plan">${this.state.settings.language === "ar" ? "مسار تعلّم مقترح" : "Recommended learning path"}</button>
            </div>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "الوصف" : "Description"}</h3>
            <p>${this.state.settings.language === "ar" ? item.job.descriptionAr : item.job.descriptionEn}</p>
            <div class="chip-row">${item.job.skills.map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
          </article>
        </section>
      `;
    }

    planPage() {
      const user = this.currentUser();
      const gaps = this.getSkillGaps(user);
      const progress = this.currentProgress();
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "فجوات المهارات وخطة التطوير" : "Skill Gaps & Development Plan"}</h1>
          <p>${this.state.settings.language === "ar" ? "كل مهمة مكتملة تزيد الجاهزية حتى 10 نقاط." : "Each completed task contributes up to 10 readiness points."}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "تحليل الفجوات" : "Gap analysis"}</h3>
            <div class="table-like">
              <div class="table-row table-head"><span>${this.state.settings.language === "ar" ? "المهارة" : "Skill"}</span><span>${this.state.settings.language === "ar" ? "المستوى" : "Current"}</span><span>${this.state.settings.language === "ar" ? "الهدف" : "Target"}</span><span>${this.state.settings.language === "ar" ? "الأولوية" : "Priority"}</span><span>${this.state.settings.language === "ar" ? "الأثر" : "Impact"}</span></div>
              ${gaps.length ? gaps.map((gap) => `<div class="table-row"><span>${gap.skill}</span><span>${gap.current}</span><span>${gap.target}</span><span>${gap.priority}</span><span>${gap.impact}</span></div>`).join("") : `<div class="table-row"><span>${this.t("empty")}</span></div>`}
            </div>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "باني الخطة" : "Plan builder"}</h3>
            ${DATA.plans.map((week, index) => `
              <label class="week-card">
                <input type="checkbox" data-plan-check data-index="${index}" ${progress.planChecks[index] ? "checked" : ""}>
                <div>
                  <strong>${this.state.settings.language === "ar" ? `الأسبوع ${week.week}: ${week.titleAr}` : `Week ${week.week}: ${week.titleEn}`}</strong>
                  <small>${this.state.settings.language === "ar" ? week.resourceAr : week.resourceEn}</small>
                  <small>${this.state.settings.language === "ar" ? week.taskAr : week.taskEn}</small>
                  <small>${this.state.settings.language === "ar" ? week.projectAr : week.projectEn}</small>
                </div>
              </label>
            `).join("")}
          </article>
        </section>
      `;
    }

    labsPage() {
      const progress = this.currentProgress();
      const lab = DATA.labs[0];
      const time = `${String(Math.floor(this.state.labTimer / 60)).padStart(2, "0")}:${String(this.state.labTimer % 60).padStart(2, "0")}`;
      const result = progress.lab.attempted
        ? (progress.lab.passed
            ? (this.state.settings.language === "ar" ? "نجحت وتمت إضافة شارة موثقة وزيادة 25 نقطة." : "Passed. Verified badge awarded and +25 points added.")
            : (this.state.settings.language === "ar" ? "لم يتم الاجتياز. تمت إضافة نقاط جزئية فقط." : "Not passed. Partial points only."))
        : "";
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "المختبرات المصغرة" : "Micro Labs"}</h1>
          <p>${this.state.settings.language === "ar" ? "إثبات عملي للمهارات الصلبة عبر محاولة واحدة موقّتة." : "Practical proof of hard skills via a timed single attempt."}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? lab.titleAr : lab.titleEn}</h3>
            <p>${this.state.settings.language === "ar" ? lab.promptAr : lab.promptEn}</p>
            <pre class="code-block">${lab.snippet}</pre>
            <div class="timer-row">
              <span>${this.state.settings.language === "ar" ? "الوقت" : "Timer"}: ${time}</span>
              <button class="btn btn-ghost" data-action="start-lab" ${progress.lab.attempted ? "disabled" : ""}>${this.state.settings.language === "ar" ? "بدء" : "Start"}</button>
            </div>
            <div class="option-list">
              ${lab.options.map((option) => `
                <label class="option-card ${progress.lab.answerId === option.id ? "selected" : ""}">
                  <input type="radio" name="lab-answer" value="${option.id}" ${progress.lab.attempted ? "disabled" : ""} ${this.state.labDraftAnswer === option.id ? "checked" : ""}>
                  <span>${this.state.settings.language === "ar" ? option.textAr : option.textEn}</span>
                </label>
              `).join("")}
            </div>
            <button class="btn btn-primary" data-action="submit-lab-answer" ${progress.lab.attempted ? "disabled" : ""}>${this.state.settings.language === "ar" ? "إرسال الإجابة" : "Submit answer"}</button>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "النتيجة" : "Outcome"}</h3>
            ${progress.lab.attempted ? `<p>${result}</p>` : `<p class="muted">${this.state.settings.language === "ar" ? "لم تبدأ المحاولة بعد." : "Attempt has not started yet."}</p>`}
            <div class="badge-row">${progress.badges.map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
          </article>
        </section>
      `;
    }

    behaviorPage() {
      const progress = this.currentProgress();
      const scenario = DATA.behaviorScenario;
      const scores = progress.behavior.scores;
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "محاكاة سلوكية" : "Behavioral Simulation"}</h1>
          <p>${this.state.settings.language === "ar" ? "يتم تقييم التواصل والتعاطف وحل المشكلات." : "Communication, empathy, and problem solving are scored."}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? scenario.titleAr : scenario.titleEn}</h3>
            <p>${this.state.settings.language === "ar" ? scenario.descriptionAr : scenario.descriptionEn}</p>
            <div class="option-list">
              ${scenario.options.map((option) => `
                <label class="option-card">
                  <input type="radio" name="behavior-answer" value="${option.id}" ${progress.behavior.completed ? "disabled" : ""} ${this.state.behaviorDraftAnswer === option.id ? "checked" : ""}>
                  <span>${this.state.settings.language === "ar" ? option.textAr : option.textEn}</span>
                </label>
              `).join("")}
            </div>
            <button class="btn btn-primary" data-action="submit-behavior" ${progress.behavior.completed ? "disabled" : ""}>${this.state.settings.language === "ar" ? "تحليل الرد" : "Analyze response"}</button>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "تغذية راجعة AI" : "AI feedback"}</h3>
            ${scores ? `
              <div class="score-stack">
                <div class="list-row"><span>${this.state.settings.language === "ar" ? "التواصل" : "Communication"}</span><strong>${scores.communication}/5</strong></div>
                <div class="list-row"><span>${this.state.settings.language === "ar" ? "التعاطف" : "Empathy"}</span><strong>${scores.empathy}/5</strong></div>
                <div class="list-row"><span>${this.state.settings.language === "ar" ? "حل المشكلات" : "Problem solving"}</span><strong>${scores.problem}/5</strong></div>
              </div>
            ` : `<p class="muted">${this.state.settings.language === "ar" ? "اختر رداً لعرض التحليل." : "Choose a response to see the analysis."}</p>`}
          </article>
        </section>
      `;
    }

    interviewPage() {
      const progress = this.currentProgress();
      const disabledToggles = `
        <div class="disabled-future">
          <label><input type="checkbox" disabled> ${this.state.settings.language === "ar" ? "الصوت" : "Voice"}</label>
          <label><input type="checkbox" disabled> ${this.state.settings.language === "ar" ? "الكاميرا" : "Camera"}</label>
          <small>${this.t("futureWork")}: ${this.state.settings.language === "ar" ? "تفعيل صوتي وبصري لاحقاً" : "voice and camera support later"}</small>
        </div>
      `;
      if (this.state.aiInterviewDone) {
        return `
          <section class="page-head">
            <h1>${this.state.settings.language === "ar" ? "نتيجة المقابلة الذكية" : "Mock Interview Result"}</h1>
          </section>
          <section class="cards two-up">
            <article class="info-card">
              <h3>${this.state.settings.language === "ar" ? "النتيجة النهائية" : "Final score"}</h3>
              <div class="ring" style="--value:${progress.interview.score}">
                <span>${progress.interview.score}</span>
              </div>
            </article>
            <article class="info-card">
              <h3>${this.state.settings.language === "ar" ? "نصائح التحسين" : "Improvement tips"}</h3>
              <ul class="simple-list">
                <li>${this.state.settings.language === "ar" ? "ابدأ بإجابات أكثر تحديداً وقابلة للقياس." : "Lead with more measurable, specific examples."}</li>
                <li>${this.state.settings.language === "ar" ? "اربط خبرتك بأثر واضح على الفريق أو العميل." : "Tie your experience to a clear team or customer outcome."}</li>
                <li>${this.state.settings.language === "ar" ? "اختم كل إجابة بخطوة أو نتيجة." : "Close each answer with an action or result."}</li>
              </ul>
              <button class="btn btn-ghost" data-action="reset-interview">${this.state.settings.language === "ar" ? "إعادة التجربة" : "Restart"}</button>
            </article>
          </section>
        `;
      }
      const current = DATA.interviewQuestions[this.state.aiInterviewIndex];
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "مقابلة AI تجريبية" : "AI Mock Interview"}</h1>
          <p>${this.state.settings.language === "ar" ? "خمس أسئلة، دردشة بسيطة، ثم تقييم نهائي." : "Five questions, a lightweight chat flow, then a final score."}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <div class="chat-thread">
              ${DATA.interviewQuestions.slice(0, this.state.aiInterviewIndex + 1).map((question, index) => `
                <div class="chat-bubble bot">${this.state.settings.language === "ar" ? question.qAr : question.qEn}</div>
                ${this.state.aiInterviewDrafts[index] ? `<div class="chat-bubble user">${this.state.aiInterviewDrafts[index]}</div>` : ""}
              `).join("")}
            </div>
            <label>${this.state.settings.language === "ar" ? "إجابتك" : "Your answer"}
              <textarea rows="4" data-chat-input placeholder="${this.state.settings.language === "ar" ? "اكتب إجابة مختصرة" : "Write a short answer"}">${this.state.aiInterviewDrafts[this.state.aiInterviewIndex] || ""}</textarea>
            </label>
            <button class="btn btn-primary" data-action="next-interview">${this.state.aiInterviewIndex === DATA.interviewQuestions.length - 1 ? (this.state.settings.language === "ar" ? "إنهاء وتقييم" : "Finish & score") : (this.state.settings.language === "ar" ? "السؤال التالي" : "Next question")}</button>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "حالة الجلسة" : "Session state"}</h3>
            <p>${this.state.settings.language === "ar" ? `السؤال ${this.state.aiInterviewIndex + 1} من ${DATA.interviewQuestions.length}` : `Question ${this.state.aiInterviewIndex + 1} of ${DATA.interviewQuestions.length}`}</p>
            ${disabledToggles}
          </article>
        </section>
      `;
    }

    profilePage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const readiness = this.getReadiness(user.id);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "QR Smart Profile" : "QR Smart Profile"}</h1>
          <p>${this.state.settings.language === "ar" ? "بطاقة مشاركة سريعة للجاهزية والمهارات الموثقة." : "A compact shareable card for readiness and verified proof."}</p>
        </section>
        <section class="cards two-up">
          <article class="profile-card-premium">
            <div class="profile-head">
              <div>
                <h3>${this.displayName(user)}</h3>
                <p>${this.candidateRole(user)}</p>
              </div>
              <span class="score-pill">${readiness}%</span>
            </div>
            <div class="qr-grid" aria-label="QR placeholder">
              ${Array.from({ length: 64 }).map((_, index) => `<span class="${index % 3 === 0 || index % 5 === 0 ? "fill" : ""}"></span>`).join("")}
            </div>
            <div class="chip-row">${(user.topSkills || []).slice(0, 4).map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
            <div class="badge-row">${progress.badges.map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
            <button class="btn btn-primary" data-action="download-profile">${this.state.settings.language === "ar" ? "تنزيل PNG" : "Download PNG"}</button>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "تفاصيل الملف" : "Profile details"}</h3>
            <p><strong>${this.state.settings.language === "ar" ? "المدينة" : "City"}:</strong> ${user.city}</p>
            <p><strong>${this.state.settings.language === "ar" ? "المهارات" : "Skills"}:</strong> ${(user.topSkills || []).join(", ")}</p>
            <p><strong>${this.state.settings.language === "ar" ? "الإنجازات" : "Verified badges"}:</strong> ${progress.badges.join(", ") || "-"}</p>
            <div class="actions-row">
              <button class="btn btn-ghost" data-nav="/behavior">${this.state.settings.language === "ar" ? "عرض السلوك" : "Behavioral summary"}</button>
              <button class="btn btn-ghost" data-nav="/interview">${this.state.settings.language === "ar" ? "عرض المقابلة" : "Interview summary"}</button>
            </div>
          </article>
        </section>
      `;
    }

    companyDashboard() {
      const activeRole = this.state.companyRoles[0] || DATA.defaultRoleRequirement;
      const ranked = this.rankCandidates(activeRole).slice(0, 5);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "لوحة الشركة" : "Company Dashboard"}</h1>
          <p>${this.state.settings.language === "ar" ? "أنشئ متطلبات خاصة للدور ثم راجع ترتيب المرشحين." : "Create private role requirements, then review ranked candidates."}</p>
        </section>
        <section class="cards two-up">
          <form class="info-card" data-form="role-requirement">
            <h3>${this.state.settings.language === "ar" ? "متطلبات الدور" : "Role requirement"}</h3>
            <label>${this.state.settings.language === "ar" ? "المسمى" : "Role title"}<input name="title" value="${activeRole.title}" required></label>
            <label>${this.state.settings.language === "ar" ? "المهارات المطلوبة" : "Required skills"}<input name="requiredSkills" value="${activeRole.requiredSkills.join(", ")}" required></label>
            <label>${this.state.settings.language === "ar" ? "سنوات الخبرة" : "Years of experience"}<input type="number" name="years" value="${activeRole.years}" min="0"></label>
            <label>${this.state.settings.language === "ar" ? "الراتب" : "Salary range"}<input name="salary" value="${activeRole.salary}" required></label>
            <label>${this.state.settings.language === "ar" ? "الموقع" : "Location"}<input name="location" value="${activeRole.location}" required></label>
            <button class="btn btn-primary" type="submit">${this.state.settings.language === "ar" ? "تحديث الترتيب" : "Update ranking"}</button>
          </form>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "أفضل المرشحين" : "Ranked candidates"}</h3>
            ${ranked.map((entry) => `
              <div class="candidate-card">
                <div class="list-row">
                  <div>
                    <strong>${this.displayName(entry.student)}</strong>
                    <small>${this.candidateRole(entry.student)}</small>
                  </div>
                  <span class="score-pill">${entry.overall}%</span>
                </div>
                <div class="meta-grid">
                  <span>${this.state.settings.language === "ar" ? "جاهزية" : "Readiness"}: ${entry.readiness}%</span>
                  <span>${this.state.settings.language === "ar" ? "مطابقة" : "Skill match"}: ${entry.skillMatch}%</span>
                </div>
                <div class="badge-row">${(this.state.progress[entry.student.id].badges || []).slice(0, 3).map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
                <div class="actions-row">
                  <button class="btn btn-ghost" data-nav="/candidate/${entry.student.id}">${this.t("viewProfile")}</button>
                </div>
              </div>
            `).join("")}
          </article>
        </section>
      `;
    }

    candidatesPage() {
      const activeRole = this.state.companyRoles[0] || DATA.defaultRoleRequirement;
      const ranked = this.rankCandidates(activeRole);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "المرشحون" : "Candidates"}</h1>
        </section>
        <section class="cards">
          ${ranked.map((entry) => `
            <article class="candidate-card">
              <div class="job-card-head">
                <div>
                  <h3>${this.displayName(entry.student)}</h3>
                  <p>${this.candidateRole(entry.student)} · ${entry.student.city}</p>
                </div>
                <span class="score-pill">${entry.overall}%</span>
              </div>
              <p>${this.state.settings.language === "ar" ? `متطابق: ${entry.matchedSkills.join(", ") || "-"} | ناقص: ${entry.missingSkills.join(", ") || "-"}` : `Matched: ${entry.matchedSkills.join(", ") || "-"} | Missing: ${entry.missingSkills.join(", ") || "-"}`}</p>
              <div class="badge-row">${(this.state.progress[entry.student.id].badges || []).map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
              <div class="actions-row">
                <button class="btn btn-ghost" data-nav="/candidate/${entry.student.id}">${this.t("viewProfile")}</button>
                <button class="btn btn-primary" data-action="invite-candidate">${this.t("invite")}</button>
              </div>
            </article>
          `).join("")}
        </section>
      `;
    }

    candidateProfilePage(studentId) {
      const student = this.state.accounts.students.find((item) => item.id === studentId);
      if (!student) {
        return `<section class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "المرشح غير موجود." : "Candidate not found."}</p></section>`;
      }
      const progress = this.state.progress[student.id];
      const technical = progress.readinessParts.cv + progress.readinessParts.micro;
      const behavioral = progress.readinessParts.behavior;
      return `
        <section class="page-head">
          <h1>${this.displayName(student)}</h1>
          <p>${this.candidateRole(student)} · ${student.city}</p>
        </section>
        <section class="cards two-up">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "تفكيك الجاهزية" : "Readiness breakdown"}</h3>
            <div class="list-row"><span>${this.state.settings.language === "ar" ? "تقني" : "Technical"}</span><strong>${technical}%</strong></div>
            <div class="list-row"><span>${this.state.settings.language === "ar" ? "سلوكي" : "Behavioral"}</span><strong>${behavioral}%</strong></div>
            <div class="chip-row">${(student.topSkills || []).map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
            <div class="badge-row">${(progress.badges || []).map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "الروابط والأدلة" : "Portfolio & proof"}</h3>
            <div class="stack">${(student.portfolio || []).map((link) => `<p>${link}</p>`).join("")}</div>
            <p>${this.state.settings.language === "ar" ? `المختبر المكتمل: ${progress.lab.passed ? "نعم" : "لا"}` : `Micro-lab completed: ${progress.lab.passed ? "Yes" : "No"}`}</p>
            <button class="btn btn-primary" data-action="invite-candidate">${this.t("invite")}</button>
          </article>
        </section>
      `;
    }

    assessmentsPage() {
      const questions = this.state.generatedAssessment;
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "باني الاختبارات" : "Assessments Builder"}</h1>
          <p>${this.state.settings.language === "ar" ? "توليد أسئلة فريدة لكل متقدم بشكل تجريبي." : "Prototype generation of unique questions per applicant."}</p>
        </section>
        <section class="cards two-up">
          <form class="info-card" data-form="assessment-builder">
            <h3>${this.state.settings.language === "ar" ? "إعدادات التوليد" : "Generation settings"}</h3>
            <label>${this.state.settings.language === "ar" ? "التقنية" : "Tech stack"}
              <select name="stack">
                <option>JavaScript</option>
                <option>SQL</option>
                <option>Python</option>
                <option>Cybersecurity</option>
              </select>
            </label>
            <label>${this.state.settings.language === "ar" ? "الصعوبة" : "Difficulty"}
              <select name="difficulty">
                <option>Entry</option>
                <option>Mid</option>
                <option>Advanced</option>
              </select>
            </label>
            <button class="btn btn-primary" type="submit">${this.t("generate")}</button>
          </form>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "الأسئلة المولدة" : "Generated questions"}</h3>
            ${questions.length ? `<ul class="simple-list">${questions.map((question) => `<li>${question}</li>`).join("")}</ul>` : `<p class="muted">${this.state.settings.language === "ar" ? "اضغط توليد لعرض أسئلة مخصصة." : "Generate to preview custom questions."}</p>`}
            <div class="note-card">
              <strong>${this.state.settings.language === "ar" ? "منع الغش" : "Anti-cheating"}</strong>
              <p>${this.state.settings.language === "ar" ? "يتم تخصيص سيناريو فريد لكل متقدم مع سؤال متابعة منطقي للتحقق من الفهم الحقيقي." : "Each applicant receives a unique scenario plus a logic follow-up to verify genuine understanding."}</p>
              <small>${this.t("futureWork")}: ${this.state.settings.language === "ar" ? "مراقبة بالكاميرا وتتبع العين" : "camera and eye-tracking proctoring"}</small>
            </div>
          </article>
        </section>
      `;
    }

    routeContent() {
      const route = this.state.route;
      const user = this.currentUser();
      const protectedStudent = new Set(["student-dashboard", "upload", "jobs", "job", "plan", "labs", "behavior", "interview", "profile"]);
      const protectedCompany = new Set(["company-dashboard", "candidate", "candidates", "assessments"]);
      const needsAuth = protectedStudent.has(route.name) || protectedCompany.has(route.name);

      if (needsAuth && !this.state.authResolved) {
        return `<section class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "جاري التحقق من الجلسة..." : "Checking your session..."}</p></section>`;
      }

      if (protectedStudent.has(route.name) && (!user || user.role !== "student")) {
        this.go("/login");
        return "";
      }
      if (protectedCompany.has(route.name) && (!user || user.role !== "company")) {
        this.go("/login");
        return "";
      }

      switch (route.name) {
        case "landing":
          return this.landingPage();
        case "plans":
          return this.plansPage();
        case "about":
          return this.aboutPage();
        case "contact":
          return this.contactPage();
        case "login":
          return this.authPage("login");
        case "register":
          return this.authPage("register");
        case "forgot":
          return this.forgotPage();
        case "student-dashboard":
          return this.studentDashboard();
        case "upload":
          return this.uploadCvPage();
        case "jobs":
          return this.jobsPage();
        case "job":
          return this.jobDetailsPage(route.params[0]);
        case "plan":
          return this.planPage();
        case "labs":
          return this.labsPage();
        case "behavior":
          return this.behaviorPage();
        case "interview":
          return this.interviewPage();
        case "profile":
          return this.profilePage();
        case "company-dashboard":
          return this.companyDashboard();
        case "candidate":
          return this.candidateProfilePage(route.params[0]);
        case "candidates":
          return this.candidatesPage();
        case "assessments":
          return this.assessmentsPage();
        default:
          return this.landingPage();
      }
    }

    render() {
      this.applySettings();
      this.root.innerHTML = `
        <div class="app-shell">
          ${this.topBar()}
          <main class="main-shell">
            ${this.routeContent()}
          </main>
          ${this.bottomTabs()}
          ${this.state.toast ? `<div class="toast-snackbar">${this.state.toast}</div>` : ""}
        </div>
      `;
    }
  }

  window.addEventListener("DOMContentLoaded", function () {
    const root = document.getElementById("app");
    if (root) {
      window.tamheedApp = new TamheedApp(root);
    }
  });
})();
