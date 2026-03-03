(function () {
  const FIREBASE_BRIDGE = window.TAMHEED_FIREBASE || {
    auth: { currentUser: null },
    db: null,
    createUserWithEmailAndPassword() {
      return Promise.reject({ code: "auth/unavailable", message: "Firebase is unavailable right now" });
    },
    signInWithEmailAndPassword() {
      return Promise.reject({ code: "auth/unavailable", message: "Firebase is unavailable right now" });
    },
    signOut() {
      return Promise.resolve();
    },
    onAuthStateChanged(authInstance, callback) {
      if (typeof callback === "function") {
        callback(authInstance && authInstance.currentUser ? authInstance.currentUser : null);
      }
      return function () {
        return;
      };
    },
    doc() {
      return null;
    },
    setDoc() {
      return Promise.resolve();
    },
    async getDoc() {
      return {
        exists() {
          return false;
        },
        data() {
          return null;
        }
      };
    },
    serverTimestamp() {
      return new Date().toISOString();
    }
  };

  const FALLBACK_DATA = {
    users: {
      students: [],
      companies: []
    },
    translations: {
      ar: {},
      en: {}
    },
    labs: [{
      question: "Starter lab question",
      options: [
        { id: "a", text: "Option A", correct: true },
        { id: "b", text: "Option B", correct: false }
      ]
    }],
    behaviorScenario: {
      prompt: "Behavior scenario",
      options: [
        { id: "a", text: "Option A", scores: { communication: 3, empathy: 3, problem: 3 } }
      ]
    },
    interviewQuestions: ["Tell us about yourself"],
    jobs: [],
    plans: [],
    skills: [],
    defaultRoleRequirement: {
      role: "Generalist",
      requiredSkills: []
    }
  };

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
  } = FIREBASE_BRIDGE;

  const STORAGE_KEYS = {
    accounts: "tamheed_accounts",
    session: "tamheed_session",
    settings: "tamheed_settings",
    progress: "tamheed_progress",
    companyRoles: "tamheed_company_roles"
  };

  const DATA = window.TAMHEED_DATA || FALLBACK_DATA;
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
      experience: 2,
      topSkills: ["SQL", "Power BI", "Excel", "Data Analysis", "Communication"],
      portfolio: ["github.com/sara-analytics", "linkedin.com/in/sara-analytics", "behance.net/sarahdata"],
      badges: ["CV Verified", "Interview Ready", "Behavioral Ready", "SQL Debug Verified"]
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
  const SKILL_LIBRARY = {
    Frontend: [
      { name: "HTML", aliases: ["html", "html5"] },
      { name: "CSS", aliases: ["css", "css3"] },
      { name: "Sass", aliases: ["sass", "scss"] },
      { name: "Less", aliases: ["less"] },
      { name: "JavaScript", aliases: ["javascript", "js", "ecmascript"] },
      { name: "TypeScript", aliases: ["typescript", "ts"] },
      { name: "React", aliases: ["react", "react.js", "reactjs"] },
      { name: "Next.js", aliases: ["next.js", "nextjs"] },
      { name: "Vue.js", aliases: ["vue", "vue.js", "vuejs"] },
      { name: "Nuxt.js", aliases: ["nuxt", "nuxt.js", "nuxtjs"] },
      { name: "Angular", aliases: ["angular", "angularjs"] },
      { name: "Svelte", aliases: ["svelte"] },
      { name: "Redux", aliases: ["redux"] },
      { name: "Zustand", aliases: ["zustand"] },
      { name: "Tailwind CSS", aliases: ["tailwind", "tailwind css"] },
      { name: "Bootstrap", aliases: ["bootstrap"] },
      { name: "Material UI", aliases: ["material ui", "mui"] },
      { name: "jQuery", aliases: ["jquery"] },
      { name: "Responsive Design", aliases: ["responsive design", "responsive", "mobile-first"] },
      { name: "Web Accessibility", aliases: ["accessibility", "a11y", "web accessibility"] },
      { name: "Webpack", aliases: ["webpack"] },
      { name: "Vite", aliases: ["vite"] },
      { name: "Git", aliases: ["git", "github", "gitlab"] }
    ],
    Backend: [
      { name: "Node.js", aliases: ["node.js", "nodejs", "node"] },
      { name: "Express.js", aliases: ["express", "express.js"] },
      { name: "NestJS", aliases: ["nestjs", "nest.js"] },
      { name: "Python", aliases: ["python"] },
      { name: "Django", aliases: ["django"] },
      { name: "Flask", aliases: ["flask"] },
      { name: "FastAPI", aliases: ["fastapi"] },
      { name: "Java", aliases: ["java"] },
      { name: "Spring Boot", aliases: ["spring boot", "springboot"] },
      { name: "C#", aliases: ["c#", "csharp"] },
      { name: ".NET", aliases: [".net", "dotnet", "asp.net"] },
      { name: "PHP", aliases: ["php"] },
      { name: "Laravel", aliases: ["laravel"] },
      { name: "Ruby", aliases: ["ruby"] },
      { name: "Ruby on Rails", aliases: ["rails", "ruby on rails"] },
      { name: "Go", aliases: ["golang", "go language", "go "] },
      { name: "REST APIs", aliases: ["rest api", "restful", "api development"] },
      { name: "GraphQL", aliases: ["graphql"] },
      { name: "Microservices", aliases: ["microservices", "microservice"] },
      { name: "Docker", aliases: ["docker"] },
      { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
      { name: "Redis", aliases: ["redis"] }
    ],
    Data: [
      { name: "SQL", aliases: ["sql"] },
      { name: "MySQL", aliases: ["mysql"] },
      { name: "PostgreSQL", aliases: ["postgresql", "postgres", "postgre"] },
      { name: "SQL Server", aliases: ["sql server", "mssql"] },
      { name: "Oracle", aliases: ["oracle db", "oracle"] },
      { name: "MongoDB", aliases: ["mongodb", "mongo"] },
      { name: "SQLite", aliases: ["sqlite"] },
      { name: "Power BI", aliases: ["power bi", "powerbi"] },
      { name: "Tableau", aliases: ["tableau"] },
      { name: "Excel", aliases: ["excel", "microsoft excel"] },
      { name: "Google Sheets", aliases: ["google sheets", "sheets"] },
      { name: "Python Pandas", aliases: ["pandas"] },
      { name: "NumPy", aliases: ["numpy"] },
      { name: "Matplotlib", aliases: ["matplotlib"] },
      { name: "Seaborn", aliases: ["seaborn"] },
      { name: "Jupyter", aliases: ["jupyter", "jupyter notebook"] },
      { name: "Data Visualization", aliases: ["data visualization", "dashboarding"] },
      { name: "ETL", aliases: ["etl", "data pipeline"] },
      { name: "Data Warehousing", aliases: ["data warehouse", "data warehousing"] },
      { name: "Machine Learning", aliases: ["machine learning", "ml"] },
      { name: "Statistics", aliases: ["statistics", "statistical analysis"] },
      { name: "A/B Testing", aliases: ["a/b testing", "ab testing"] }
    ],
    Cybersecurity: [
      { name: "Cybersecurity", aliases: ["cybersecurity", "cyber security", "information security"] },
      { name: "Network Security", aliases: ["network security"] },
      { name: "Application Security", aliases: ["application security", "appsec"] },
      { name: "Cloud Security", aliases: ["cloud security"] },
      { name: "SOC Analysis", aliases: ["soc", "soc analyst", "security operations center"] },
      { name: "SIEM", aliases: ["siem", "splunk", "qradar"] },
      { name: "Incident Response", aliases: ["incident response", "ir"] },
      { name: "Threat Hunting", aliases: ["threat hunting", "threat hunt"] },
      { name: "Threat Intelligence", aliases: ["threat intelligence"] },
      { name: "Vulnerability Assessment", aliases: ["vulnerability assessment", "vulnerability scanning"] },
      { name: "Penetration Testing", aliases: ["penetration testing", "pentest", "pen testing"] },
      { name: "OWASP", aliases: ["owasp"] },
      { name: "IAM", aliases: ["iam", "identity and access management"] },
      { name: "Firewalls", aliases: ["firewall", "firewalls"] },
      { name: "EDR", aliases: ["edr", "endpoint detection and response"] },
      { name: "Zero Trust", aliases: ["zero trust"] },
      { name: "NIST", aliases: ["nist"] },
      { name: "ISO 27001", aliases: ["iso 27001", "iso27001"] },
      { name: "Risk Assessment", aliases: ["risk assessment"] },
      { name: "Security Awareness", aliases: ["security awareness"] },
      { name: "Malware Analysis", aliases: ["malware analysis"] },
      { name: "Digital Forensics", aliases: ["digital forensics", "forensics"] }
    ],
    "UI/UX": [
      { name: "UI Design", aliases: ["ui design", "user interface design"] },
      { name: "UX Design", aliases: ["ux design", "user experience design"] },
      { name: "Figma", aliases: ["figma"] },
      { name: "Adobe XD", aliases: ["adobe xd", "xd"] },
      { name: "Sketch", aliases: ["sketch"] },
      { name: "Wireframing", aliases: ["wireframing", "wireframes"] },
      { name: "Prototyping", aliases: ["prototyping", "prototype"] },
      { name: "User Research", aliases: ["user research"] },
      { name: "Usability Testing", aliases: ["usability testing", "usability test"] },
      { name: "Design Systems", aliases: ["design systems", "design system"] },
      { name: "Interaction Design", aliases: ["interaction design", "ixd"] },
      { name: "Information Architecture", aliases: ["information architecture", "ia"] },
      { name: "Visual Design", aliases: ["visual design"] },
      { name: "Typography", aliases: ["typography"] },
      { name: "Color Theory", aliases: ["color theory", "colour theory"] },
      { name: "Responsive UI", aliases: ["responsive ui", "responsive layouts"] },
      { name: "Accessibility Design", aliases: ["accessible design", "accessibility design"] },
      { name: "User Flows", aliases: ["user flows", "flow mapping"] },
      { name: "Journey Mapping", aliases: ["journey mapping", "customer journey"] },
      { name: "Heuristic Evaluation", aliases: ["heuristic evaluation"] },
      { name: "A/B Testing Design", aliases: ["design experiments", "a/b testing design"] },
      { name: "Content Design", aliases: ["content design", "ux writing"] }
    ],
    "Soft Skills": [
      { name: "Communication", aliases: ["communication", "communicator", "التواصل"] },
      { name: "Presentation", aliases: ["presentation", "presenting"] },
      { name: "Leadership", aliases: ["leadership", "team lead"] },
      { name: "Teamwork", aliases: ["teamwork", "team player", "collaboration"] },
      { name: "Problem Solving", aliases: ["problem solving", "problem-solving"] },
      { name: "Critical Thinking", aliases: ["critical thinking"] },
      { name: "Adaptability", aliases: ["adaptability", "adaptable"] },
      { name: "Time Management", aliases: ["time management"] },
      { name: "Project Management", aliases: ["project management"] },
      { name: "Stakeholder Management", aliases: ["stakeholder management"] },
      { name: "Agile", aliases: ["agile"] },
      { name: "Scrum", aliases: ["scrum"] },
      { name: "Kanban", aliases: ["kanban"] },
      { name: "Mentoring", aliases: ["mentoring", "mentor"] },
      { name: "Negotiation", aliases: ["negotiation"] },
      { name: "Customer Service", aliases: ["customer service", "customer support"] },
      { name: "Documentation", aliases: ["documentation", "technical writing"] },
      { name: "Attention to Detail", aliases: ["attention to detail", "detail-oriented"] },
      { name: "Decision Making", aliases: ["decision making"] },
      { name: "Conflict Resolution", aliases: ["conflict resolution"] },
      { name: "Business Analysis", aliases: ["business analysis", "requirements gathering"] },
      { name: "Product Thinking", aliases: ["product thinking", "product mindset"] }
    ]
  };
  const ROLE_SKILL_PROFILES = {
    "Frontend Developer": {
      required: [
        ["HTML", 1.2], ["CSS", 1.2], ["JavaScript", 1.3], ["React", 1.4], ["TypeScript", 1.1], ["Responsive Design", 1.0], ["Web Accessibility", 0.9], ["Git", 0.7]
      ]
    },
    "Backend Developer": {
      required: [
        ["Node.js", 1.2], ["Express.js", 1.1], ["SQL", 1.0], ["PostgreSQL", 1.0], ["REST APIs", 1.3], ["Docker", 0.9], ["Redis", 0.8], ["Microservices", 0.9]
      ]
    },
    "Data Analyst": {
      required: [
        ["SQL", 1.3], ["Excel", 1.0], ["Power BI", 1.2], ["Tableau", 0.9], ["Statistics", 1.0], ["Data Visualization", 1.0], ["Python", 0.8], ["A/B Testing", 0.8]
      ]
    },
    "UI/UX Designer": {
      required: [
        ["UI Design", 1.2], ["UX Design", 1.2], ["Figma", 1.3], ["Wireframing", 1.0], ["Prototyping", 1.1], ["User Research", 0.9], ["Design Systems", 0.9], ["Usability Testing", 0.9]
      ]
    },
    "Cybersecurity Analyst": {
      required: [
        ["Cybersecurity", 1.2], ["Network Security", 1.1], ["SIEM", 1.1], ["Incident Response", 1.0], ["Vulnerability Assessment", 1.0], ["Risk Assessment", 0.9], ["NIST", 0.8], ["Firewalls", 0.8]
      ]
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
        contactMenuOpen: false,
        servicesMenuOpen: false,
        assessmentInfoOpen: false,
        aiInterviewDrafts: {},
        aiInterviewIndex: 0,
        aiInterviewDone: false,
        generatedAssessment: null,
        labTimer: 180,
        labDraftAnswer: "",
        behaviorDraftAnswer: "",
        behaviorScenarioIndex: 0,
        cvStatusMessage: "",
        selectedTargetRole: "Frontend Developer",
        railOpen: false,
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

      const demoStudent = this.state.accounts.students.find((item) => item.email.toLowerCase() === DEMO_ACCOUNTS.student.email.toLowerCase()) || this.state.accounts.students[0];
      const studentProgressId = demoStudent.id;
      const enrichedCv = this.mockCvAnalysis(demoStudent);
      demoStudent.cvAnalysis = enrichedCv;
      demoStudent.topSkills = ["SQL", "Power BI", "Excel", "Data Analysis", "Communication"];
      demoStudent.badges = ["CV Verified", "Interview Ready", "Behavioral Ready", "SQL Debug Verified"];
      demoStudent.portfolio = ["github.com/sara-analytics", "linkedin.com/in/sara-analytics", "behance.net/sarahdata"];

      this.state.progress[studentProgressId] = {
        cvUploaded: true,
        cvAnalysis: {
          skills: ["SQL", "Power BI", "Excel", "Data Analysis", "Communication"],
          seniority: "Early Career",
          recommendedRoles: ["Junior Data Analyst", "BI Analyst", "Reporting Analyst"],
          baseScore: 52
        },
        readinessParts: { cv: 52, micro: 20, behavior: 13, plan: 9 },
        badges: ["CV Verified", "Interview Ready", "Behavioral Ready", "SQL Debug Verified"],
        planChecks: [true, true, true, false],
        appliedJobs: ["job-1", "job-3"],
        lab: { attempted: true, passed: true, answerId: "a" },
        behavior: { completed: true, scores: { communication: 5, empathy: 4, problem: 4 } },
        interview: { completed: true, score: 88 }
      };

      this.persistAccounts();
      this.persistProgress();
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
            cvAnalysis: profile.cvAnalysis || (existing ? existing.cvAnalysis : null),
            city: "Riyadh"
          }
        : {
            id: uid,
            role,
            name: profile.name,
            nameEn: profile.name,
            email: profile.email,
            password: "",
            cvAnalysis: profile.cvAnalysis || (existing ? existing.cvAnalysis : null),
            city: "Riyadh",
            targetRoleAr: "محترف رقمي",
            targetRoleEn: "Digital Professional",
            experience: 0,
            topSkills: profile.cvAnalysis && profile.cvAnalysis.skills && profile.cvAnalysis.skills.length
              ? profile.cvAnalysis.skills.map((item) => item.name)
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

    async extractTextFromPdf(file) {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== "function") {
        throw new Error(this.state.settings.language === "ar" ? "مكتبة قراءة PDF لم تُحمّل بعد. حدّث الصفحة وحاول مرة أخرى." : "The PDF reader is not loaded yet. Refresh the page and try again.");
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        pages.push(textContent.items.map((item) => item.str).join(" "));
      }
      return pages.join("\n\n").replace(/\s+/g, " ").trim();
    }

    extractSection(text, headings) {
      const source = String(text || "");
      const allHeadings = [
        "education", "academic", "qualification", "qualifications", "experience", "work experience", "employment",
        "projects", "project", "portfolio", "skills", "technical skills", "certifications", "summary", "profile",
        "التعليم", "المؤهلات", "الخبرة", "الخبرات", "المشاريع", "المهارات", "الملخص"
      ];
      const headingPattern = headings.join("|");
      const stopPattern = allHeadings.filter((item) => !headings.includes(item)).join("|");
      const regex = new RegExp(`(?:^|\\n)\\s*(?:${headingPattern})\\s*[:\\-]?\\s*([\\s\\S]{0,1200}?)(?=\\n\\s*(?:${stopPattern})\\s*[:\\-]?|$)`, "i");
      const match = source.match(regex);
      return match ? match[1].trim() : "";
    }

    extractYearsOfExperience(text) {
      const regex = /(\d+)\+?\s*(?:years|year|yrs|yr|سنة|سنوات)/gi;
      let maxYears = 0;
      let match = regex.exec(text);
      while (match) {
        maxYears = Math.max(maxYears, Number(match[1] || 0));
        match = regex.exec(text);
      }
      if (/سنتين|عامين/i.test(text)) {
        maxYears = Math.max(maxYears, 2);
      }
      if (/ثلاث سنوات|3 سنوات/i.test(text)) {
        maxYears = Math.max(maxYears, 3);
      }
      return maxYears;
    }

    parseCvText(text) {
      const normalized = String(text || "");
      const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const phoneMatch = normalized.match(/(?:\+9665\d{8}|05\d{8})/);
      const linkedinMatch = normalized.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i);
      const education = this.extractSection(normalized, ["education", "academic", "qualification", "qualifications", "التعليم", "المؤهلات"]);
      const experience = this.extractSection(normalized, ["experience", "work experience", "employment", "الخبرة", "الخبرات"]);
      const projects = this.extractSection(normalized, ["projects", "project", "portfolio", "المشاريع"]);
      const years = this.extractYearsOfExperience(normalized);
      let seniority = "Beginner";
      if (/intern|internship|trainee|متدرب/i.test(normalized)) {
        seniority = "Intern";
      } else if (years >= 4) {
        seniority = "Mid";
      } else if (years >= 1) {
        seniority = "Junior";
      }
      return {
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        linkedin: linkedinMatch ? linkedinMatch[0] : "",
        education,
        experience,
        projects,
        yearsOfExperience: years,
        seniority
      };
    }

    countAliasOccurrences(text, alias) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^A-Za-z0-9+.#-])${escaped}(?=$|[^A-Za-z0-9+.#-])`, "gi");
      const matches = String(text || "").match(regex);
      return matches ? matches.length : 0;
    }

    detectSkills(text) {
      const source = String(text || "");
      const lower = source.toLowerCase();
      const emphasizedTerms = /(advanced|expert|proficient|strong|certified|professional|متقدم|خبير|محترف|معتمد)/i;
      const detected = [];

      Object.entries(SKILL_LIBRARY).forEach(([category, entries]) => {
        entries.forEach((entry) => {
          let frequency = 0;
          entry.aliases.forEach((alias) => {
            frequency += this.countAliasOccurrences(lower, alias.toLowerCase());
          });
          if (!frequency) {
            return;
          }

          const joinedAliases = entry.aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
          const emphasisRegex = new RegExp(`(?:${joinedAliases}).{0,20}(advanced|expert|proficient|strong|certified|professional|متقدم|خبير|محترف|معتمد)|(advanced|expert|proficient|strong|certified|professional|متقدم|خبير|محترف|معتمد).{0,20}(?:${joinedAliases})`, "i");
          const yearsRegex = new RegExp(`(?:${joinedAliases}).{0,25}(\\d+)\\+?\\s*(?:years|year|yrs|سنة|سنوات)|(\\d+)\\+?\\s*(?:years|year|yrs|سنة|سنوات).{0,25}(?:${joinedAliases})`, "i");
          const emphasis = emphasisRegex.test(source) || emphasizedTerms.test(source);
          const yearsMatch = source.match(yearsRegex);
          const years = yearsMatch ? Number(yearsMatch[1] || yearsMatch[2] || 0) : 0;
          const confidence = clamp(Number((0.35 + Math.min(frequency, 4) * 0.12 + (emphasis ? 0.18 : 0) + Math.min(years, 5) * 0.06).toFixed(2)), 0, 1);

          let level = "Beginner";
          if (years >= 4 || emphasis || frequency >= 4) {
            level = "Advanced";
          } else if (years >= 2 || frequency >= 2) {
            level = "Intermediate";
          }

          detected.push({
            name: entry.name,
            category,
            confidence,
            level,
            frequency
          });
        });
      });

      return detected.sort((a, b) => b.confidence - a.confidence || b.frequency - a.frequency);
    }

    scoreCvAnalysis(parsedProfile, skills) {
      const completenessRaw = [
        parsedProfile.email ? 25 : 0,
        parsedProfile.phone ? 20 : 0,
        parsedProfile.linkedin ? 20 : 0,
        parsedProfile.education ? 35 : 0
      ].reduce((sum, part) => sum + part, 0);
      const categoryCount = new Set(skills.map((skill) => skill.category)).size;
      const breadthRaw = Math.min(60, skills.length * 3) + Math.min(20, categoryCount * 4);
      const advancedCount = skills.filter((skill) => skill.level === "Advanced").length;
      const technicalScore = clamp(Math.round(breadthRaw + Math.min(20, advancedCount * 4)), 0, 100);
      const projectsScore = parsedProfile.projects
        ? clamp(Math.min(100, 35 + parsedProfile.projects.split(/\n|•|-/).filter(Boolean).length * 15), 0, 100)
        : 0;
      const experienceScore = parsedProfile.seniority === "Mid"
        ? 90
        : parsedProfile.seniority === "Junior"
          ? 65
          : parsedProfile.seniority === "Intern"
            ? 40
            : clamp(parsedProfile.yearsOfExperience * 15, 0, 55);
      const total = clamp(Math.round(technicalScore * 0.4 + completenessRaw * 0.25 + projectsScore * 0.2 + experienceScore * 0.15), 0, 100);
      return {
        TechnicalScore: technicalScore,
        ProfileCompleteness: completenessRaw,
        ProjectsScore: projectsScore,
        ExperienceScore: experienceScore,
        TotalScore: total
      };
    }

    computeRoleMatches(skills) {
      const skillMap = new Map(skills.map((skill) => [skill.name.toLowerCase(), skill]));
      return Object.entries(ROLE_SKILL_PROFILES).map(([role, config]) => {
        const totalWeight = config.required.reduce((sum, [, weight]) => sum + weight, 0);
        let achievedWeight = 0;
        const missingSkills = [];
        config.required.forEach(([skillName, weight]) => {
          const found = skillMap.get(skillName.toLowerCase());
          if (found) {
            const levelBoost = found.level === "Advanced" ? 1 : found.level === "Intermediate" ? 0.8 : 0.6;
            achievedWeight += weight * levelBoost;
          } else {
            missingSkills.push(skillName);
          }
        });
        return {
          role,
          match: clamp(Math.round((achievedWeight / totalWeight) * 100), 0, 100),
          missingSkills
        };
      }).sort((a, b) => b.match - a.match);
    }

    buildDevelopmentPlan(targetRole, matches) {
      const match = matches.find((item) => item.role === targetRole) || matches[0] || { role: targetRole, missingSkills: [] };
      const gaps = match.missingSkills.slice(0, 4);
      const defaults = ["أساسيات المجال", "ممارسة عملية", "تحسين جودة التنفيذ", "تجهيز ملف أعمال"];
      const weeks = [1, 2, 3, 4].map((week, index) => {
        const gap = gaps[index] || defaults[index];
        return {
          week,
          focus: gap,
          task: this.state.settings.language === "ar"
            ? `خصص 45-60 دقيقة يومياً لتعلّم ${gap} وتطبيقه عملياً.`
            : `Spend 45-60 minutes daily learning and practicing ${gap}.`,
          resource: this.state.settings.language === "ar"
            ? `ابحث عن دورة تمهيدية ومقال توثيقي عن ${gap}.`
            : `Use one beginner course and one official reference for ${gap}.`
        };
      });
      const projectIdea = this.state.settings.language === "ar"
        ? `نفّذ مشروعاً مصغراً بعنوان: ${targetRole} Starter Case يبرز ${gaps[0] || "المهارات الأساسية"} و${gaps[1] || "التنفيذ العملي"}.`
        : `Build a mini "${targetRole} Starter Case" portfolio piece highlighting ${gaps[0] || "core skills"} and ${gaps[1] || "practical execution"}.`;
      return {
        targetRole: match.role,
        weeks,
        projectIdea
      };
    }

    buildCvAnalysis(text, targetRole) {
      const parsedProfile = this.parseCvText(text);
      const skills = this.detectSkills(text);
      const scores = this.scoreCvAnalysis(parsedProfile, skills);
      const matches = this.computeRoleMatches(skills);
      const plan = this.buildDevelopmentPlan(targetRole, matches);
      return {
        rawTextPreview: text.slice(0, 1500),
        parsedProfile,
        skills,
        scores,
        matches,
        plan
      };
    }

    buildCvSummaryMarkup(cvAnalysis) {
      if (!cvAnalysis) {
        return `<div id="cvPreview"><p class="muted">${this.state.settings.language === "ar" ? "ارفع سيرتك عشان نحللها" : "Upload your CV to analyze it."}</p></div>`;
      }
      const parsedProfile = cvAnalysis.parsedProfile || {};
      const scores = cvAnalysis.scores || { TechnicalScore: 0, ProfileCompleteness: 0, ProjectsScore: 0, TotalScore: 0 };
      const plan = cvAnalysis.plan || { targetRole: this.state.selectedTargetRole, weeks: [], projectIdea: "" };
      const simpleSkills = Array.isArray(cvAnalysis.skills) ? cvAnalysis.skills.filter((skill) => typeof skill === "string") : [];
      const hasDetailedAnalysis = Boolean(cvAnalysis.parsedProfile || cvAnalysis.scores || cvAnalysis.plan || (cvAnalysis.matches && cvAnalysis.matches.length));
      if (!hasDetailedAnalysis) {
        return `
          <div class="stack">
            ${simpleSkills.length ? `
              <div class="stack">
                <p><strong>${this.state.settings.language === "ar" ? "المهارات" : "Skills"}</strong></p>
                <div class="chip-row">${simpleSkills.map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
              </div>
            ` : ""}
            ${cvAnalysis.seniority ? `<p><strong>${this.state.settings.language === "ar" ? "الخبرة المتوقعة" : "Seniority"}:</strong> ${cvAnalysis.seniority}</p>` : ""}
            ${cvAnalysis.recommendedRoles && cvAnalysis.recommendedRoles.length ? `<p><strong>${this.state.settings.language === "ar" ? "أدوار مقترحة" : "Recommended roles"}:</strong> ${cvAnalysis.recommendedRoles.join(" / ")}</p>` : ""}
          </div>
        `;
      }
      const grouped = Object.keys(SKILL_LIBRARY).map((category) => {
        const items = (cvAnalysis.skills || []).filter((skill) => skill.category === category);
        if (!items.length) {
          return "";
        }
        return `
          <div class="stack">
            <p><strong>${category}</strong></p>
            <div class="chip-row">
              ${items.map((skill) => `<span class="chip">${skill.name} · ${skill.level} · ${Math.round(skill.confidence * 100)}%</span>`).join("")}
            </div>
          </div>
        `;
      }).join("");
      const topMatches = (cvAnalysis.matches || []).slice(0, 3);
      const targetMatch = (cvAnalysis.matches || []).find((item) => item.role === plan.targetRole) || topMatches[0] || { missingSkills: [] };
      const infoRows = [
        parsedProfile.email ? `<p><strong>Email:</strong> ${parsedProfile.email}</p>` : "",
        parsedProfile.phone ? `<p><strong>${this.state.settings.language === "ar" ? "الجوال" : "Phone"}:</strong> ${parsedProfile.phone}</p>` : "",
        parsedProfile.linkedin ? `<p><strong>LinkedIn:</strong> ${parsedProfile.linkedin}</p>` : "",
        parsedProfile.education ? `<p><strong>${this.state.settings.language === "ar" ? "التعليم" : "Education"}:</strong> ${parsedProfile.education}</p>` : "",
        parsedProfile.experience ? `<p><strong>${this.state.settings.language === "ar" ? "الخبرة" : "Experience"}:</strong> ${parsedProfile.experience}</p>` : "",
        parsedProfile.projects ? `<p><strong>${this.state.settings.language === "ar" ? "المشاريع" : "Projects"}:</strong> ${parsedProfile.projects}</p>` : ""
      ].filter(Boolean).join("");
      const hasScores = scores.TechnicalScore || scores.ProfileCompleteness || scores.ProjectsScore || scores.TotalScore;
      return `
        <div class="stack">
          ${infoRows}
          ${grouped}
          ${hasScores ? `<div class="stack">
            <p><strong>${this.state.settings.language === "ar" ? "تفصيل الدرجات" : "Score breakdown"}</strong></p>
            <p>Technical: ${scores.TechnicalScore} | Profile: ${scores.ProfileCompleteness} | Projects: ${scores.ProjectsScore} | Total: ${scores.TotalScore}</p>
          </div>` : ""}
          ${topMatches.length ? `<div class="stack">
            <p><strong>${this.state.settings.language === "ar" ? "أفضل الأدوار المطابقة" : "Top role matches"}</strong></p>
            ${topMatches.map((match) => `<p>${match.role}: ${match.match}%</p>`).join("")}
          </div>` : ""}
          ${targetMatch.missingSkills.length ? `<div class="stack">
            <p><strong>${this.state.settings.language === "ar" ? "فجوات المهارات للدور المختار" : "Missing skills for selected role"}</strong></p>
            <p>${targetMatch.missingSkills.join(" , ")}</p>
          </div>` : ""}
          ${plan.weeks.length || plan.projectIdea ? `<div class="stack">
            <p><strong>${this.state.settings.language === "ar" ? "خطة 4 أسابيع" : "4-week plan"}</strong></p>
            ${plan.weeks.map((week) => `<p>${this.state.settings.language === "ar" ? `الأسبوع ${week.week}` : `Week ${week.week}`}: ${week.focus} - ${week.task} - ${week.resource}</p>`).join("")}
            ${plan.projectIdea ? `<p><strong>${this.state.settings.language === "ar" ? "فكرة مشروع" : "Portfolio idea"}:</strong> ${plan.projectIdea}</p>` : ""}
          </div>` : ""}
          ${cvAnalysis.rawTextPreview ? `<div id="cvPreview" class="code-block">${cvAnalysis.rawTextPreview}</div>` : ""}
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
          cvAnalysis: {
            rawTextPreview: cvPayload.rawTextPreview || "",
            parsedProfile: cvPayload.parsedProfile || null,
            skills: cvPayload.skills || [],
            scores: cvPayload.scores || null,
            matches: cvPayload.matches || [],
            plan: cvPayload.plan || null,
            updatedAt: serverTimestamp()
          }
        },
        { merge: true }
      );
    }

    bindFirebaseSession() {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          this.state.session = null;
          this.state.authResolved = true;
          this.persistSession();
          const protectedRoute = new Set(["student-dashboard", "upload", "jobs", "job", "plan", "behavior", "interview", "profile", "company-dashboard", "candidate", "candidates", "assessments"]);
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
        this.state.contactMenuOpen = false;
        this.state.servicesMenuOpen = false;
        this.render();
      });

      document.addEventListener("click", (event) => {
        if ((this.state.contactMenuOpen && !event.target.closest("[data-contact-menu]"))
          || (this.state.servicesMenuOpen && !event.target.closest("[data-services-menu]"))) {
          this.state.contactMenuOpen = false;
          this.state.servicesMenuOpen = false;
          this.render();
          return;
        }

        const navTarget = event.target.closest("[data-nav]");
        if (navTarget) {
          event.preventDefault();
          this.state.contactMenuOpen = false;
          this.state.servicesMenuOpen = false;
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
        if (event.target.matches("#cvTargetRole")) {
          this.state.selectedTargetRole = event.target.value;
          this.render();
          return;
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
        this.state.contactMenuOpen = false;
        this.state.servicesMenuOpen = false;
        this.logoutUser().catch(() => {
          this.state.formErrors = {
            "login.password": this.state.settings.language === "ar" ? "تعذر تسجيل الخروج" : "Unable to sign out"
          };
          this.render();
        });
        return;
      }

      if (action === "toggle-contact-menu") {
        this.state.contactMenuOpen = !this.state.contactMenuOpen;
        this.state.servicesMenuOpen = false;
        this.render();
        return;
      }

      if (action === "toggle-services-menu") {
        this.state.servicesMenuOpen = !this.state.servicesMenuOpen;
        this.state.contactMenuOpen = false;
        this.render();
        return;
      }

      if (action === "toggle-rail") {
        this.state.railOpen = !this.state.railOpen;
        this.render();
        return;
      }

      if (action === "close-rail") {
        this.state.railOpen = false;
        this.render();
        return;
      }

      if (action === "show-demo") {
        if (user) {
          this.go(user.role === "student" ? "/student-dashboard" : "/company-dashboard");
          return;
        }
        this.state.authRole = "student";
        this.state.authDrafts.login.student = {
          email: DEMO_ACCOUNTS.student.email,
          password: DEMO_ACCOUNTS.student.password
        };
        this.state.formErrors = {};
        this.go("/login");
        return;
      }

      if (action === "analyze-cv") {
        if (this.state.cvUploadPending) {
          return;
        }
        if (!auth.currentUser) {
          this.state.cvStatusMessage = this.state.settings.language === "ar" ? "لازم تسجل دخول أول" : "You need to sign in first";
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
        this.state.cvStatusMessage = this.state.settings.language === "ar" ? "جاري قراءة السيرة وتحليلها..." : "Reading and analyzing your CV...";
        this.render();

        this.extractTextFromPdf(file)
          .then(async (rawText) => {
            if (rawText.length < 50) {
              this.state.cvStatusMessage = this.state.settings.language === "ar" ? "ما قدرت أطلع نص واضح من الـ PDF. ممكن يكون سكان/صورة." : "I could not extract clear text from the PDF. It may be a scan/image.";
              this.state.cvUploadPending = false;
              this.render();
              return;
            }
            const selectedRole = document.getElementById("cvTargetRole") ? document.getElementById("cvTargetRole").value : this.state.selectedTargetRole;
            const cvAnalysis = this.buildCvAnalysis(rawText, selectedRole);
            await this.saveCvToFirestore(cvAnalysis);

            const currentUser = this.currentUser();
            if (currentUser) {
              currentUser.cvAnalysis = cvAnalysis;
              if (currentUser.role === "student") {
                currentUser.topSkills = cvAnalysis.skills.slice(0, 8).map((skill) => skill.name);
                const progressSafe = this.currentProgress();
                if (progressSafe) {
                  progressSafe.cvUploaded = true;
                  progressSafe.cvAnalysis = {
                    skills: currentUser.topSkills,
                    seniority: cvAnalysis.parsedProfile.seniority || "Entry",
                    recommendedRoles: cvAnalysis.matches.slice(0, 2).map((match) => match.role),
                    baseScore: clamp(Math.round(cvAnalysis.scores.TotalScore * 0.6), 0, 60)
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

            this.state.cvStatusMessage = this.state.settings.language === "ar" ? "تم ✅ حفظ تحليل السيرة في حسابك" : "Saved. Your CV analysis is now in your account.";
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
        const scenarios = this.getBehaviorScenarios();
        const scenario = scenarios[this.state.behaviorScenarioIndex] || scenarios[0];
        if (!scenario) return;
        const choice = scenario.options.find((item) => item.id === this.state.behaviorDraftAnswer);
        if (!choice) return;
        const communication = choice.communication ?? (choice.scores ? choice.scores.communication : 0);
        const empathy = choice.empathy ?? (choice.scores ? choice.scores.empathy : 0);
        const problem = choice.problem ?? (choice.scores ? choice.scores.problem : 0);
        progress.behavior.completed = true;
        progress.behavior.scores = {
          communication,
          empathy,
          problem
        };
        progress.readinessParts.behavior = clamp(communication + empathy + problem, 0, 15);
        if (progress.readinessParts.behavior >= 13 && !progress.badges.includes("Behavioral Ready")) {
          progress.badges.push("Behavioral Ready");
        }
        this.persistProgress();
        this.render();
        return;
      }

      if (action === "reset-behavior") {
        if (!progress) return;
        this.state.behaviorDraftAnswer = "";
        progress.behavior.completed = false;
        progress.behavior.scores = null;
        progress.readinessParts.behavior = 0;
        progress.badges = progress.badges.filter((badge) => badge !== "Behavioral Ready");
        this.persistProgress();
        this.render();
        return;
      }

      if (action === "next-behavior-scenario") {
        const scenarios = this.getBehaviorScenarios();
        if (!progress || !scenarios.length) return;
        this.state.behaviorScenarioIndex = (this.state.behaviorScenarioIndex + 1) % scenarios.length;
        this.state.behaviorDraftAnswer = "";
        progress.behavior.completed = false;
        progress.behavior.scores = null;
        progress.readinessParts.behavior = 0;
        progress.badges = progress.badges.filter((badge) => badge !== "Behavioral Ready");
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

      if (action === "toggle-assessment-info") {
        this.state.assessmentInfoOpen = !this.state.assessmentInfoOpen;
        this.render();
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
        this.state.companyRoles = [roleReq];
        this.persistCompanyRoles();
        this.go("/company-dashboard");
        return;
      }

      if (formName === "assessment-builder") {
        const stack = String(data.get("stack") || "General");
        const policy = String(data.get("policy") || "Standard Hiring");
        const specialty = String(data.get("specialty") || "Generalist");
        const difficulty = String(data.get("difficulty") || "Mid");
        const generated = {
          stack,
          policy,
          specialty,
          difficulty,
          theory: [
            `${stack}: outline the core tradeoffs that matter for a ${specialty} role at ${difficulty} level.`,
            `${stack}: explain which failure modes are most likely under the ${policy} policy context.`
          ],
          scenarios: [
            `${specialty} scenario: a candidate proposes a fix that works, but violates one hiring policy. How should they respond?`,
            `${stack} logic-check: if the first answer is correct, ask them to explain why the decision still scales safely.`
          ],
          practical: [
            `${stack} task: build or debug a short implementation relevant to ${specialty}.`,
            `${stack} review task: identify one risky assumption, one missing edge case, and one safer alternative.`
          ]
        };
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

    getLearningSuggestions(skill) {
      const normalized = String(skill || "").toLowerCase();
      const maps = {
        "data analysis": [
          {
            sourceAr: "منصة سطر",
            sourceEn: "Satr Platform",
            noteAr: "ابدأ بمسار تحليل البيانات التأسيسي لفهم المفاهيم بشكل مرتب.",
            noteEn: "Start with a structured data-analysis foundation track."
          },
          {
            sourceAr: "YouTube",
            sourceEn: "YouTube",
            noteAr: "ابحث عن شروحات تطبيقية على مجموعات بيانات حقيقية وتمارين عملية.",
            noteEn: "Use practical walkthroughs on real datasets and exercises."
          },
          {
            sourceAr: "Kaggle",
            sourceEn: "Kaggle",
            noteAr: "تدرّب على ملفات جاهزة ومسابقات بسيطة لبناء فهم تطبيقي أسرع.",
            noteEn: "Practice on starter datasets and simple notebooks."
          }
        ],
        sql: [
          {
            sourceAr: "منصة سطر",
            sourceEn: "Satr Platform",
            noteAr: "خذ مسار SQL من البداية حتى الاستعلامات المتوسطة والمتقدمة.",
            noteEn: "Use a guided SQL path from basics to intermediate queries."
          },
          {
            sourceAr: "SQLBolt",
            sourceEn: "SQLBolt",
            noteAr: "تمارين قصيرة وسريعة لتثبيت المفاهيم الأساسية خطوة بخطوة.",
            noteEn: "Short guided drills to reinforce core concepts."
          },
          {
            sourceAr: "Mode SQL Tutorial",
            sourceEn: "Mode SQL Tutorial",
            noteAr: "أمثلة تحليلية أقرب لبيئة العمل والبيانات الواقعية.",
            noteEn: "Analytical examples closer to real work scenarios."
          }
        ]
      };

      if (maps[normalized]) {
        return maps[normalized];
      }

      return [
        {
          sourceAr: "منصة سطر",
          sourceEn: "Satr Platform",
          noteAr: `ابحث عن مسار تأسيسي في ${skill} لبناء القاعدة بشكل مرتب.`,
          noteEn: `Start with a structured foundation path for ${skill}.`
        },
        {
          sourceAr: "YouTube",
          sourceEn: "YouTube",
          noteAr: `ركّز على شروحات تطبيقية وتمارين قصيرة حول ${skill}.`,
          noteEn: `Focus on practical tutorials and short exercises for ${skill}.`
        },
        {
          sourceAr: "المراجع الرسمية",
          sourceEn: "Official docs",
          noteAr: `ارجع للمراجع الأصلية حتى تربط التعلم النظري بالتطبيق.`,
          noteEn: "Use official references to connect theory with implementation."
        }
      ];
    }

    getBehaviorScenarios() {
      if (Array.isArray(DATA.behaviorScenarios) && DATA.behaviorScenarios.length) {
        return DATA.behaviorScenarios;
      }
      if (DATA.behaviorScenario) {
        return [DATA.behaviorScenario];
      }
      return [];
    }

    getMarketShiftSignals() {
      return [
        {
          skill: "Data Analysis",
          demandLift: 40,
          timeframeAr: "خلال 12 شهراً",
          timeframeEn: "Within 12 months",
          reasonAr: "الوظائف التحليلية ترتفع مع توسع الاعتماد على التقارير والقرارات المبنية على البيانات.",
          reasonEn: "Analyst demand is rising as more teams depend on reporting and data-backed decisions.",
          actionAr: "تعلمها الآن لأنها من أسرع المهارات التي ترفع فرص الدخول لسوق التحليل.",
          actionEn: "Start now because it is one of the fastest skills that improves access to analyst roles."
        },
        {
          skill: "Power BI",
          demandLift: 32,
          timeframeAr: "خلال 9 أشهر",
          timeframeEn: "Within 9 months",
          reasonAr: "هناك طلب أعلى على تحويل البيانات إلى لوحات تنفيذية وتقارير قابلة للقراءة السريعة.",
          reasonEn: "Demand is growing for turning data into readable executive dashboards and reporting flows.",
          actionAr: "ابدأ بلوحات KPI وتقارير الإدارة لأنها مطلوبة مباشرة في الفرز الوظيفي.",
          actionEn: "Start with KPI dashboards and management reporting because they are a direct hiring signal."
        },
        {
          skill: "System Design",
          demandLift: 26,
          timeframeAr: "خلال 18 شهراً",
          timeframeEn: "Within 18 months",
          reasonAr: "الفرق التقنية الأعلى نضجًا تطلب فهماً أوضح للتوسع والاعتمادية حتى في الأدوار المتوسطة.",
          reasonEn: "More mature engineering teams increasingly expect clearer thinking around scalability and reliability.",
          actionAr: "إذا تجاوزت الأساسيات، ابدأ بها مبكرًا لرفع سقف الفرص القادمة.",
          actionEn: "If your fundamentals are stable, begin early to unlock stronger next-level opportunities."
        }
      ];
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
      const showLandingMixedNav = Boolean(user && this.state.route.name === "landing");
      const navClass = isPublic ? "topnav" : "topnav auth-nav";
      const serviceLinks = user
        ? (user.role === "student"
          ? [
              ["/upload", this.t("uploadCv")],
              ["/jobs", this.t("jobs")],
              ["/plan", this.t("plan")],
              ["/market-shift", this.state.settings.language === "ar" ? "توقعات السوق" : "Market Shift Predictor"],
              ["/micro-labs-test", this.state.settings.language === "ar" ? "مختبر المهارات" : "Micro Labs Test"],
              ["/behavior", this.state.settings.language === "ar" ? "محاكاة سلوكية" : "Behavioral Simulation"],
              ["/interview", this.t("interview")],
              ["/profile", this.t("profile")]
            ]
          : [
              ["/market-shift", this.state.settings.language === "ar" ? "توقعات السوق" : "Market Shift Predictor"],
              ["/candidates", this.t("candidates")],
              ["/assessments", this.t("assessments")],
              ["/contact", this.t("settings")]
            ])
        : [];
      return `
        <header class="topbar glass">
          <div class="topbar-main">
            <button class="brand" data-nav="/">
              <img class="brand-logo" src="./assets/logo.PNG" alt="${this.t("brand")}">
            </button>
            <nav class="${navClass}">
            ${isPublic || showLandingMixedNav ? `
              <button data-nav="/">${this.t("navHome")}</button>
              <button data-nav="/plans">${this.t("navPlans")}</button>
              <button data-nav="/about">${this.t("navAbout")}</button>
              <div class="contact-menu ${this.state.contactMenuOpen ? "open" : ""}" data-contact-menu>
                <button class="contact-trigger" data-action="toggle-contact-menu">
                  <span>${this.t("navContact")}</span>
                  <span class="contact-trigger-arrow" aria-hidden="true"></span>
                </button>
                <div class="contact-dropdown">
                  <div class="contact-dropdown-item">
                    <small>Email</small>
                    <strong>hello@tamheed.demo</strong>
                  </div>
                  <div class="contact-dropdown-item">
                    <small>${this.state.settings.language === "ar" ? "الموقع" : "Location"}</small>
                    <strong>Riyadh, Saudi Arabia</strong>
                  </div>
                </div>
              </div>
              ${showLandingMixedNav ? `<button data-nav="${user.role === "student" ? "/student-dashboard" : "/company-dashboard"}">${this.t("dashboard")}</button>` : ""}
              ${showLandingMixedNav ? `
                <div class="services-menu ${this.state.servicesMenuOpen ? "open" : ""}" data-services-menu>
                  <button class="services-trigger" data-action="toggle-services-menu">
                    <span>${this.state.settings.language === "ar" ? "الخدمات" : "Services"}</span>
                    <span class="services-trigger-arrow" aria-hidden="true"></span>
                  </button>
                  <div class="services-dropdown">
                    ${serviceLinks.map(([route, label]) => `<button class="services-dropdown-item" data-nav="${route}">${label}</button>`).join("")}
                  </div>
                </div>
              ` : ""}
            ` : `
              <button data-nav="${user.role === "student" ? "/student-dashboard" : "/company-dashboard"}">${this.t("dashboard")}</button>
              <div class="services-menu ${this.state.servicesMenuOpen ? "open" : ""}" data-services-menu>
                <button class="services-trigger" data-action="toggle-services-menu">
                  <span>${this.state.settings.language === "ar" ? "الخدمات" : "Services"}</span>
                  <span class="services-trigger-arrow" aria-hidden="true"></span>
                </button>
                <div class="services-dropdown">
                  ${serviceLinks.map(([route, label]) => `<button class="services-dropdown-item" data-nav="${route}">${label}</button>`).join("")}
                </div>
              </div>
            `}
            </nav>
          </div>
          <div class="toolbar">
            <label class="toggle-pill">
              <span class="toggle-label">${this.state.settings.language === "ar" ? "اللغة" : "Lang"}</span>
              <span class="toggle-segment">
                <input type="checkbox" data-setting="language" aria-label="${this.state.settings.language === "ar" ? "تبديل اللغة" : "Toggle language"}" ${this.state.settings.language === "en" ? "checked" : ""}>
                <span class="toggle-slider"></span>
                <span class="toggle-option">AR</span>
                <span class="toggle-option">EN</span>
              </span>
            </label>
            <label class="toggle-pill">
              <span class="toggle-label">${this.state.settings.language === "ar" ? "المظهر" : "Theme"}</span>
              <span class="toggle-segment">
                <input type="checkbox" data-setting="theme" aria-label="${this.state.settings.language === "ar" ? "تبديل المظهر" : "Toggle theme"}" ${this.state.settings.theme === "dark" ? "checked" : ""}>
                <span class="toggle-slider"></span>
                <span class="toggle-option">☀</span>
                <span class="toggle-option">☾</span>
              </span>
            </label>
            ${user ? `<button class="btn btn-ghost" data-action="logout">${this.t("navLogout")}</button>` : `<button class="btn btn-primary" data-nav="/login">${this.t("navLogin")}</button>`}
          </div>
        </header>
      `;
    }

    sideRail() {
      return "";
    }

    bottomTabs() {
      return "";
    }

    landingPage() {
      const user = this.currentUser();
      return `
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow">Saudi AI Career Readiness</span>
            <h1>${this.state.settings.language === "ar" ? "اعرف مستواك المهني بوضوح، وطوّر فرصك بخطوات عملية" : "Understand your career readiness clearly, then improve it with practical next steps"}</h1>
            <p>${this.state.settings.language === "ar" ? "تمهيد يقرأ السيرة الذاتية، يوضح نقاط القوة والفجوات، ثم يحولها إلى خطة تطوير وفرص أنسب لك." : "Tamheed reads the CV, clarifies strengths and gaps, then turns them into a development path and better-fit opportunities."}</p>
            <div class="hero-bullets">
              <span>${this.state.settings.language === "ar" ? "تحليل واضح للسيرة" : "Clear CV analysis"}</span>
              <span>${this.state.settings.language === "ar" ? "مطابقة أذكى للوظائف" : "Smarter job matching"}</span>
              <span>${this.state.settings.language === "ar" ? "خطة تطوير عملية" : "Practical growth plan"}</span>
            </div>
            <div class="hero-actions">
              <button class="btn btn-primary" data-nav="${user ? (user.role === "student" ? "/student-dashboard" : "/company-dashboard") : "/register"}">${this.t("ctaStart")}</button>
              <button class="btn btn-ghost" data-action="show-demo">${this.t("ctaDemo")}</button>
            </div>
            <p class="hero-trust">${this.state.settings.language === "ar" ? "بدون تعقيد • خلال دقائق • خصوصيتك أولاً" : "No complexity • Minutes to start • Privacy first"}</p>
          </div>
          <article class="hero-summary">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "ملخص سريع" : "Quick snapshot"}</span>
              <strong>${this.state.settings.language === "ar" ? "جاهزية حالية" : "Current readiness"}</strong>
            </div>
            <div class="hero-score-row">
              <div class="ring" style="--value:78">
                <span>78</span>
              </div>
              <div class="hero-score-copy">
                <h3>${this.state.settings.language === "ar" ? "درجة واضحة وسهلة القراءة" : "A clear score you can act on"}</h3>
                <p>${this.state.settings.language === "ar" ? "مؤشر مختصر يوضح وضعك الحالي وما الذي يحتاج إلى تطوير." : "A concise indicator of your current level and what still needs work."}</p>
              </div>
            </div>
            <div class="hero-summary-list">
              <div class="hero-summary-item">
                <span>${this.state.settings.language === "ar" ? "أفضل توافق" : "Top match"}</span>
                <strong>UI Designer</strong>
                <small>70%</small>
              </div>
              <div class="hero-summary-item">
                <span>${this.state.settings.language === "ar" ? "أولوية التطوير" : "Priority gap"}</span>
                <strong>Advanced SQL</strong>
                <small>${this.state.settings.language === "ar" ? "تأثير مرتفع" : "High impact"}</small>
              </div>
              <div class="hero-summary-item">
                <span>${this.state.settings.language === "ar" ? "إثبات المهارة" : "Skill proof"}</span>
                <strong>${this.state.settings.language === "ar" ? "مختبرات قصيرة" : "Short labs"}</strong>
                <small>${this.state.settings.language === "ar" ? "وشارات موثقة" : "Verified badges"}</small>
              </div>
            </div>
          </article>
        </section>
        <section class="landing-vision">
          <div class="landing-vision-copy">
            <span class="feature-kicker">${this.state.settings.language === "ar" ? "لماذا تمهيد" : "Why Tamheed"}</span>
            <h2>${this.state.settings.language === "ar" ? "تمهيد يربط بين السيرة الذاتية، الجاهزية المهنية، واحتياج السوق السعودي ضمن تجربة واحدة واضحة" : "Tamheed connects CV quality, career readiness, and Saudi market demand in one clear experience"}</h2>
            <p>${this.state.settings.language === "ar" ? "بدلاً من أن يبقى الطالب أو الخريج مع سيرة ذاتية فقط، تمهيد يحول البيانات إلى مؤشرات عملية: ماذا تتقن، ما الذي ينقصك، ما الوظائف الأقرب لك، وكيف ترفع فرصك بخطوات قابلة للتنفيذ. هذه المنهجية تدعم مستهدفات رؤية 2030 عبر رفع جاهزية الكفاءات الوطنية، تحسين المواءمة بين التعليم وسوق العمل، وتمكين المواهب الرقمية بقراءة أوضح وأكثر عدلاً." : "Instead of leaving candidates with only a static CV, Tamheed turns profile data into practical signals: what they do well, what they are missing, which jobs fit best, and how to improve with actionable next steps. This supports Vision 2030 by improving national talent readiness, strengthening education-to-market alignment, and enabling digital talent with a clearer and fairer signal."}</p>
          </div>
        </section>
        <section class="feature-grid services-grid">
          <article class="info-card feature-card">
            <span class="feature-kicker">01</span>
            <h3>${this.state.settings.language === "ar" ? "تحليل السيرة الذاتية" : "CV Analysis"}</h3>
            <p>${this.state.settings.language === "ar" ? "استخراج المهارات وبناء ملف رقمي واضح من نفس السيرة." : "Extract skills and build a clear digital profile from the CV."}</p>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">02</span>
            <h3>${this.state.settings.language === "ar" ? "Smart Job Matching" : "Smart Job Matching"}</h3>
            <p>${this.state.settings.language === "ar" ? "مطابقة فورية مع الوظائف وإظهار نسبة التوافق لكل مسار." : "Instant role matching with clear percentages for each path."}</p>
            <div class="simple-list tight-list">
              <span>UI Designer - 70%</span>
              <span>Front-End Developer - 45%</span>
            </div>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">03</span>
            <h3>${this.state.settings.language === "ar" ? "Skill Gap Analysis" : "Skill Gap Analysis"}</h3>
            <p>${this.state.settings.language === "ar" ? "معرفة النواقص التي ترفع فرص التوظيف بشكل مباشر." : "See the missing skills that most improve hiring potential."}</p>
            <div class="simple-list tight-list">
              <span>${this.state.settings.language === "ar" ? "جاهز 68% لوظيفة Software Engineer" : "68% ready for Software Engineer"}</span>
              <span>${this.state.settings.language === "ar" ? "تنقصك: Advanced SQL, System Design" : "Missing: Advanced SQL, System Design"}</span>
            </div>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">04</span>
            <h3>${this.state.settings.language === "ar" ? "Micro Labs" : "Micro Labs"}</h3>
            <p>${this.state.settings.language === "ar" ? "اختبارات عملية قصيرة لإثبات المهارات بدل الاكتفاء بالادعاء." : "Short practical labs to validate skills instead of relying on claims."}</p>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">05</span>
            <h3>${this.state.settings.language === "ar" ? "محاكاة سلوكية" : "Behavioral Simulation"}</h3>
            <p>${this.state.settings.language === "ar" ? "سيناريوهات واقعية تقيس التواصل والتعاطف وحل المشكلات." : "Real scenarios that evaluate communication, empathy, and problem solving."}</p>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">06</span>
            <h3>${this.state.settings.language === "ar" ? "الملف الذكي النهائي" : "Smart Final Profile"}</h3>
            <p>${this.state.settings.language === "ar" ? "ملف رقمي موثوق يتضمن المهارات الموثقة والجاهزية، ومناسب للفعاليات المهنية." : "A trusted digital profile with verified skills and readiness, ready for professional events."}</p>
          </article>
        </section>
        <section class="section-grid">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "للمستخدم" : "For candidates"}</h3>
            <p>${this.state.settings.language === "ar" ? "رحلة واضحة ومباشرة: افهم مستواك، طوّر الفجوات، ثم أثبت المهارة." : "A direct journey: understand your level, close gaps, then validate skills."}</p>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "لأقسام الموارد البشرية" : "For HR teams"}</h3>
            <p>${this.state.settings.language === "ar" ? "ترتيب أوضح للمرشحين بناءً على الجاهزية والمهارات الموثقة." : "A clearer ranking based on readiness and verified skills."}</p>
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
            <p>${this.state.settings.language === "ar" ? "مطابقة وظائف + مقابلة ذكية + ملف ذكي" : "Job matching + smart interview + smart profile"}</p>
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
        <section class="page-head about-head">
          <h1>${this.state.settings.language === "ar" ? "عن تمهيد" : "About Tamheed"}</h1>
          <p>${this.state.settings.language === "ar" ? "منصة عربية تترجم الجاهزية المهنية إلى مؤشرات قابلة للفهم والتنفيذ، وتحوّل بيانات السيرة الذاتية والمهارات والتجارب إلى صورة أوضح تساعد المرشح على معرفة مستواه الحالي، وتحديد أولويات التطوير، واتخاذ خطوات عملية ترفع فرصه في سوق العمل." : "An Arabic-first platform translating career readiness into measurable, actionable signals, turning CVs, skills, and candidate experience into a clearer picture that helps users understand where they stand, identify development priorities, and take practical steps toward stronger market readiness."}</p>
        </section>
        <section class="info-card large about-panel">
          <h3>${this.state.settings.language === "ar" ? "رؤية 2030" : "Vision 2030"}</h3>
          <p>${this.state.settings.language === "ar" ? "تمهيد يدعم تمكين المواهب الوطنية عبر مواءمة أفضل بين ما يتعلمه المرشح وما يتطلبه سوق العمل، مع تركيز على التحقق العملي من المهارات بدل الاكتفاء بالادعاء النظري. ومن خلال قراءة أوضح للجاهزية، وإبراز الفجوات القابلة للعلاج، وتقديم مسار تطوير أقرب لاحتياج السوق السعودي، تسهم المنصة في رفع قابلية التوظيف، وتحسين كفاءة الفرز والتقييم، ودعم توجهات التحول الرقمي وتنمية رأس المال البشري بما ينسجم مع مستهدفات رؤية 2030." : "Tamheed supports national talent development by creating stronger alignment between candidate growth and real hiring demand, with a clear emphasis on practical skill validation rather than self-claim alone. By making readiness easier to understand, surfacing fixable gaps, and guiding candidates toward market-relevant development paths, the platform helps improve employability, supports better screening and evaluation, and contributes to broader digital transformation and human capital goals aligned with Vision 2030."}</p>
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

    microLabsTestPage() {
      return `
        <section class="page-head">
          <h1>Micro Labs Test</h1>
        </section>
        <section class="blank-white-page"></section>
      `;
    }

    futureSoftSkillsCardMarkup() {
      return `
        <article class="info-card interview-panel future-softskills-card">
          <h3>${this.state.settings.language === "ar" ? "تطوير Soft Skills بالكاميرا والصوت" : "Soft Skills Development with Camera & Voice"}</h3>
          <p>${this.state.settings.language === "ar" ? "تحليل ذكي لسلوكك أثناء التحدث ليعطيك ملاحظات مباشرة وقابلة للتحسين." : "An intelligent speaking-behavior analysis flow with direct, actionable feedback."}</p>
          <div class="simple-list">
            <span>${this.state.settings.language === "ar" ? "تحليل نبرة الصوت أثناء الإجابة" : "Voice tone analysis during responses"}</span>
            <span>${this.state.settings.language === "ar" ? "قراءة لغة الجسد والثقة أثناء الكلام" : "Body language and confidence tracking while speaking"}</span>
            <span>${this.state.settings.language === "ar" ? "مراقبة حركة العين والانتباه أثناء العرض" : "Eye movement and attention tracking during delivery"}</span>
            <span>${this.state.settings.language === "ar" ? "تحسينات مباشرة بعد كل محاولة" : "Immediate improvement suggestions after each attempt"}</span>
          </div>
          <div class="actions-row compact-actions">
            <button class="btn btn-ghost" type="button" disabled>${this.state.settings.language === "ar" ? "قريباً" : "Coming soon"}</button>
          </div>
        </article>
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
      const cvSkills = user.cvAnalysis && user.cvAnalysis.skills && user.cvAnalysis.skills.length
        ? user.cvAnalysis.skills.slice(0, 10).map((skill) => skill.name)
        : (analysis ? analysis.skills : []);
      const topMatch = matches[0];
      const planProgress = Math.round((progress.planChecks.filter(Boolean).length / progress.planChecks.length) * 100);
      const priorityGap = gaps[0];
      const badges = (progress.badges || []).slice(0, 4);
      const marketSignal = this.getMarketShiftSignals()[0];
      return `
        <section class="page-head tight">
          <h1>${this.state.settings.language === "ar" ? `مرحباً ${this.displayName(user)}` : `Welcome ${this.displayName(user)}`}</h1>
          <p>${this.state.settings.language === "ar" ? "ملخص رحلتك الحالية نحو الجاهزية المهنية." : "A snapshot of your current career-readiness journey."}</p>
        </section>
        <section class="student-dashboard-shell student-dashboard-refresh">
          <article class="student-overview-card">
            <div class="student-overview-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "جاهزية حالية" : "Current readiness"}</span>
                <h3>${this.state.settings.language === "ar" ? "قراءة مركزة لوضعك الآن" : "A focused read of where you stand"}</h3>
                <p>${this.state.settings.language === "ar" ? "بدل توزيع المعلومة على كروت كثيرة، هذه نظرة أوضح على ما يرفع فرصك الآن." : "Instead of spreading the story across many cards, this gives you a clearer view of what moves you forward now."}</p>
              </div>
              <div class="student-overview-score">
                <div class="ring large" style="--value:${readiness}">
                  <span>${readiness}</span>
                </div>
                <small>${this.state.settings.language === "ar" ? "الجاهزية الحالية" : "Current readiness"}</small>
              </div>
            </div>
            <div class="student-overview-grid">
              <div class="student-overview-item">
                <small>${this.state.settings.language === "ar" ? "أفضل توافق" : "Top match"}</small>
                <strong>${topMatch ? this.jobTitle(topMatch.job) : "-"}</strong>
                <span>${topMatch ? `${topMatch.match}%` : this.t("empty")}</span>
              </div>
              <div class="student-overview-item">
                <small>${this.state.settings.language === "ar" ? "أولوية التطوير" : "Priority gap"}</small>
                <strong>${priorityGap ? priorityGap.skill : this.t("empty")}</strong>
                <span>${priorityGap ? priorityGap.impact : (this.state.settings.language === "ar" ? "لا توجد فجوة حرجة" : "No major gap")}</span>
              </div>
              <div class="student-overview-item">
                <small>${this.state.settings.language === "ar" ? "تقدّم الخطة" : "Plan progress"}</small>
                <strong>${planProgress}%</strong>
                <span>${this.state.settings.language === "ar" ? `${progress.planChecks.filter(Boolean).length} من ${progress.planChecks.length} مهام` : `${progress.planChecks.filter(Boolean).length} of ${progress.planChecks.length} tasks`}</span>
              </div>
            </div>
          </article>
          <section class="student-dashboard-grid">
            <div class="student-dashboard-main">
              <article class="student-surface-card">
                <div class="dashboard-section-head">
                  <div>
                    <h3>${this.state.settings.language === "ar" ? "أقرب الوظائف لك الآن" : "Closest roles right now"}</h3>
                    <p>${this.state.settings.language === "ar" ? "أوضح المسارات الأقرب لملفك الحالي." : "The clearest roles aligned with your current profile."}</p>
                  </div>
                  <button class="btn btn-ghost" data-nav="/jobs">${this.state.settings.language === "ar" ? "كل الوظائف" : "All jobs"}</button>
                </div>
                <div class="student-job-stack">
                  ${(matches.slice(0, 3)).map((item) => `
                    <div class="student-job-card">
                      <div>
                        <strong>${this.jobTitle(item.job)}</strong>
                        <small>${item.job.company} · ${item.job.city}</small>
                      </div>
                      <div class="dashboard-job-actions">
                        <span class="score-pill">${item.match}%</span>
                        <button
                          class="details-icon-btn"
                          data-nav="/job/${item.job.id}"
                          aria-label="${this.state.settings.language === "ar" ? "تفاصيل الوظيفة" : "Job details"}"
                          title="${this.state.settings.language === "ar" ? "تفاصيل" : "Details"}"
                        >↗</button>
                      </div>
                    </div>
                  `).join("")}
                </div>
              </article>
              <article class="student-surface-card">
                <div class="dashboard-section-head">
                  <div>
                    <h3>${this.state.settings.language === "ar" ? "خطة 4 أسابيع" : "4-week plan"}</h3>
                    <p>${this.state.settings.language === "ar" ? "خطوات قصيرة وواضحة بدل قائمة طويلة مشتتة." : "Short, clear steps instead of one long distracting list."}</p>
                  </div>
                  <button class="btn btn-ghost" data-nav="/plan">${this.t("plan")}</button>
                </div>
                <div class="student-plan-grid">
                  ${DATA.plans.map((week, index) => `
                    <div class="student-plan-card ${progress.planChecks[index] ? "done" : ""}">
                      <strong>${this.state.settings.language === "ar" ? `الأسبوع ${week.week}` : `Week ${week.week}`}</strong>
                      <small>${this.state.settings.language === "ar" ? week.taskAr : week.taskEn}</small>
                      <span>${progress.planChecks[index] ? "✓" : "○"}</span>
                    </div>
                  `).join("")}
                </div>
              </article>
            </div>
            <aside class="student-dashboard-side">
              <article class="student-side-card">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "إشارات موثقة" : "Verified signals"}</span>
                <div class="badge-row">
                  ${badges.length ? badges.map((badge) => `<span class="badge-soft">${badge}</span>`).join("") : `<span class="muted">${this.t("empty")}</span>`}
                </div>
                <button class="btn btn-primary" data-nav="/micro-labs-test">${this.state.settings.language === "ar" ? "مختبر المهارات" : "Micro Labs Test"}</button>
              </article>
              <article class="student-side-card emphasis">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "الخطوة التالية" : "Next step"}</span>
                <strong>${priorityGap ? priorityGap.skill : (this.state.settings.language === "ar" ? "استمرار" : "Keep momentum")}</strong>
                <p>${priorityGap ? (this.state.settings.language === "ar" ? "ابدأ بهذه المهارة أولاً لأنها الأقرب لرفع النتيجة بشكل ملحوظ." : "Start here first because it has the clearest impact on your score.") : (this.state.settings.language === "ar" ? "وضعك متماسك حاليًا، ويمكنك التركيز على تحسين التفاصيل أو التقديم." : "Your profile is stable for now, so focus on refinement or applications.")}</p>
                <button class="btn btn-ghost" data-nav="/plan">${this.state.settings.language === "ar" ? "فتح الخطة" : "Open plan"}</button>
              </article>
              <article class="student-side-card">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "توقعات السوق" : "Market shift predictor"}</span>
                <strong>${this.state.settings.language === "ar" ? `تعلم ${marketSignal.skill} الآن` : `Learn ${marketSignal.skill} now`}</strong>
                <p>${this.state.settings.language === "ar" ? `متوقع ارتفاع الطلب عليها بنسبة ${marketSignal.demandLift}% ${marketSignal.timeframeAr}.` : `Projected demand may rise by ${marketSignal.demandLift}% ${marketSignal.timeframeEn}.`}</p>
                <button class="btn btn-ghost" data-nav="/market-shift">${this.state.settings.language === "ar" ? "عرض التوقعات" : "View forecast"}</button>
              </article>
              <article class="student-side-card">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "المهارات المستخرجة" : "Extracted skills"}</span>
                <div class="chip-row">
                  ${cvSkills.length ? cvSkills.map((skill) => `<span class="chip">${skill}</span>`).join("") : `<span class="muted">${this.state.settings.language === "ar" ? "ارفع سيرتك عشان نحللها" : "Upload your CV so we can analyze it."}</span>`}
                </div>
              </article>
            </aside>
          </section>
        </section>
      `;
    }

    marketShiftPage() {
      const signals = this.getMarketShiftSignals();
      const topSignal = signals[0];
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "توقعات السوق" : "Market Shift Predictor"}</h1>
          <p>${this.state.settings.language === "ar" ? "قراءة استباقية تساعدك على البدء بالمهارات قبل أن يرتفع الطلب عليها أكثر." : "A forward-looking view that helps you start skill-building before demand rises further."}</p>
        </section>
        <section class="market-shift-shell">
          <article class="market-hero-card">
            <div class="market-hero-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "أقوى إشارة حالية" : "Strongest current signal"}</span>
                <h3>${this.state.settings.language === "ar" ? `تعلم ${topSignal.skill} الآن` : `Learn ${topSignal.skill} now`}</h3>
                <p>${this.state.settings.language === "ar" ? topSignal.actionAr : topSignal.actionEn}</p>
              </div>
              <div class="market-hero-score">
                <strong>+${topSignal.demandLift}%</strong>
                <small>${this.state.settings.language === "ar" ? topSignal.timeframeAr : topSignal.timeframeEn}</small>
              </div>
            </div>
          </article>
          <section class="cards market-shift-grid">
            ${signals.map((signal) => `
              <article class="market-shift-card">
                <div class="market-shift-head">
                  <div>
                    <span class="hero-summary-label">${this.state.settings.language === "ar" ? "إشارة طلب" : "Demand signal"}</span>
                    <h3>${signal.skill}</h3>
                  </div>
                  <span class="score-pill">+${signal.demandLift}%</span>
                </div>
                <p>${this.state.settings.language === "ar" ? signal.reasonAr : signal.reasonEn}</p>
                <div class="market-shift-note">
                  <strong>${this.state.settings.language === "ar" ? "التوصية" : "Recommendation"}</strong>
                  <p>${this.state.settings.language === "ar" ? signal.actionAr : signal.actionEn}</p>
                </div>
              </article>
            `).join("")}
          </section>
        </section>
      `;
    }

    uploadCvPage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const analysis = progress ? progress.cvAnalysis : null;
      const cvData = user && user.cvAnalysis ? user.cvAnalysis : null;
      return `
        <section class="page-head">
          <h1>${this.t("uploadCv")}</h1>
          <p>${this.state.settings.language === "ar" ? "ارفع ملف PDF لتحليل السيرة محلياً داخل المتصفح." : "Upload a PDF to analyze the CV locally in the browser."}</p>
        </section>
        <section class="cards upload-layout">
          <article class="dropzone upload-dropzone-card ${this.state.cvUploadPending ? "loading" : ""}">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "رفع وتحليل" : "Upload & analyze"}</span>
              <h3>${this.state.settings.language === "ar" ? "ابدأ من ملفك الحالي" : "Start from your current CV"}</h3>
              <p>${this.state.settings.language === "ar" ? "اختيار ملف واحد يكفي لبدء التحليل المحلي مباشرة." : "A single file is enough to start local analysis immediately."}</p>
            </div>
            <div class="dropzone-inner upload-dropzone-inner">
              <div class="upload-file-pill">
                <strong>${this.state.settings.language === "ar" ? "اختر ملف PDF من جهازك" : "Choose a PDF from your device"}</strong>
                <small>PDF</small>
              </div>
              <input type="file" accept="application/pdf" id="cvInput">
              <button class="btn btn-primary" id="analyzeCvBtn" type="button" data-action="analyze-cv">${this.state.cvUploadPending ? (this.state.settings.language === "ar" ? "جاري التحليل..." : "Analyzing...") : (this.state.settings.language === "ar" ? "حلّل السيرة" : "Analyze CV")}</button>
              <p id="cvStatus" class="muted">${this.state.cvStatusMessage || (this.state.settings.language === "ar" ? "لن يتم رفع الملف إلى أي خادم." : "The file stays in your browser.")}</p>
            </div>
          </article>
          <article class="info-card upload-results-card">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "نتائج سريعة" : "Quick results"}</span>
              <h3>${this.state.settings.language === "ar" ? "مخرجات التحليل" : "Analysis output"}</h3>
              <p>${this.state.settings.language === "ar" ? "هنا يظهر ما استخرجه النظام مباشرة من السيرة بعد القراءة." : "The extracted insights appear here immediately after parsing."}</p>
            </div>
            ${this.state.cvUploadPending ? `<div class="ai-loader upload-ai-loader"><span></span><span></span><span></span></div>` : cvData ? `
              ${this.buildCvSummaryMarkup(cvData)}
            ` : analysis ? `
              <div class="stack upload-results-stack">
                <p><strong>${this.state.settings.language === "ar" ? "المهارات" : "Skills"}:</strong> ${analysis.skills.join(" , ")}</p>
                <p><strong>${this.state.settings.language === "ar" ? "الخبرة المتوقعة" : "Seniority"}:</strong> ${analysis.seniority}</p>
                <p><strong>${this.state.settings.language === "ar" ? "أدوار مقترحة" : "Recommended roles"}:</strong> ${analysis.recommendedRoles.join(" / ")}</p>
                <div id="cvPreview" class="code-block">${this.state.settings.language === "ar" ? "التحليل المحلي سيعرض هنا بعد قراءة ملف PDF." : "Local PDF analysis will appear here."}</div>
              </div>
            ` : `<div id="cvPreview" class="upload-empty-state"><p class="muted">${this.state.settings.language === "ar" ? "ارفع سيرتك عشان نحللها" : "Upload your CV to analyze it."}</p></div>`}
          </article>
        </section>
      `;
    }

    jobsPage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const matches = this.getFilteredMatches(user);
      const topMatch = matches[0] || null;
      const strongMatches = matches.filter((item) => item.match >= 70).length;
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "المطابقة الذكية للوظائف" : "Smart Job Matching"}</h1>
          <p>${this.state.settings.language === "ar" ? "فلتر النتائج حسب المدينة، نوع الدور، المهارة، ونسبة المطابقة." : "Filter by city, role type, skill, and match percentage."}</p>
        </section>
        <div class="jobs-page-stack">
          <section class="cards jobs-section">
            <article class="info-card jobs-filter-card">
              <div class="hero-summary-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "فلترة ذكية" : "Smart filters"}</span>
                <h3>${this.state.settings.language === "ar" ? "خصص النتائج بسرعة" : "Refine results quickly"}</h3>
              </div>
              <section class="filter-bar jobs-filter-grid">
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
                <label class="range-wrap jobs-range-wrap">
                  <span>${this.state.settings.language === "ar" ? "الحد الأدنى" : "Min match"}: ${this.state.filters.minMatch}%</span>
                  <input type="range" min="0" max="100" value="${this.state.filters.minMatch}" data-filter="minMatch">
                </label>
                <label class="checkbox-wrap jobs-checkbox-wrap">
                  <input type="checkbox" data-filter="remote" ${this.state.filters.remote ? "checked" : ""}>
                  <span>${this.state.settings.language === "ar" ? "عن بعد فقط" : "Remote only"}</span>
                </label>
              </section>
            </article>
          </section>
          <section class="cards jobs-section">
            <article class="info-card jobs-summary-card">
              <div class="hero-summary-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "ملخص سريع" : "Quick summary"}</span>
                <h3>${this.state.settings.language === "ar" ? "وظائف أقرب لملفك الحالي" : "Closest roles for your current profile"}</h3>
                <p>${this.state.settings.language === "ar" ? "قراءة مختصرة قبل ما تبدأ التصفح، حتى تعرف أين تركّزين الآن." : "A compact view before browsing, so you know where to focus first."}</p>
              </div>
              <div class="jobs-summary-grid">
                <div class="dashboard-stat">
                  <small>${this.state.settings.language === "ar" ? "أعلى توافق" : "Top match"}</small>
                  <strong>${topMatch ? `${this.jobTitle(topMatch.job)} ${topMatch.match}%` : (this.state.settings.language === "ar" ? "لا توجد نتائج" : "No matches")}</strong>
                </div>
                <div class="dashboard-stat">
                  <small>${this.state.settings.language === "ar" ? "مطابقات قوية" : "Strong matches"}</small>
                  <strong>${strongMatches}</strong>
                </div>
                <div class="dashboard-stat">
                  <small>${this.state.settings.language === "ar" ? "تم التقديم" : "Applied"}</small>
                  <strong>${progress.appliedJobs.length}</strong>
                </div>
              </div>
            </article>
          </section>
          <section class="cards jobs-match-grid jobs-section">
            ${matches.length ? matches.map((item) => `
              <article class="job-card jobs-match-card">
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
        </div>
      `;
    }

    jobDetailsPage(jobId) {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const item = this.getMatchesForUser(user).find((entry) => entry.job.id === jobId);
      if (!item) {
        return `<section class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "الوظيفة غير موجودة." : "Job not found."}</p></section>`;
      }
      const userSkills = (user.topSkills || []).map((skill) => skill.toLowerCase());
      const matchedCount = item.matchedSkills.length;
      const missingCount = item.missingSkills.length;
      const totalRequired = Math.max(item.job.skills.length, 1);
      const readinessLift = Math.min(18, missingCount * 4);
      const fitStatus = item.match >= 75
        ? (this.state.settings.language === "ar" ? "مطابقة قوية" : "Strong fit")
        : item.match >= 55
          ? (this.state.settings.language === "ar" ? "مطابقة جيدة" : "Good fit")
          : (this.state.settings.language === "ar" ? "تحتاج تطوير" : "Needs work");
      return `
        <section class="page-head">
          <h1>${this.jobTitle(item.job)}</h1>
          <p>${item.job.company} · ${item.job.city} · ${item.job.salary}</p>
        </section>
        <section class="job-analysis-layout">
          <article class="job-analysis-hero">
            <div class="job-analysis-copy">
              <span class="feature-kicker">${this.state.settings.language === "ar" ? "تحليل المطابقة" : "Fit analysis"}</span>
              <h2>${fitStatus}</h2>
              <p>${this.state.settings.language === "ar"
                ? "هذا العرض يوضح أين تتقاطع مهاراتك الحالية مع متطلبات الوظيفة، وما الذي ينقصك للوصول إلى توافق أعلى."
                : "This view shows where your current skills intersect with the job requirements and what is still missing for a stronger fit."}</p>
              <div class="actions-row compact-actions">
                <button class="btn btn-primary" data-action="apply-job" data-job-id="${item.job.id}">${progress.appliedJobs.includes(item.job.id) ? (this.state.settings.language === "ar" ? "تم التقديم" : "Applied") : this.t("apply")}</button>
                <button class="btn btn-ghost" data-nav="/plan">${this.state.settings.language === "ar" ? "مسار تعلّم مقترح" : "Recommended learning path"}</button>
              </div>
            </div>
            <div class="job-fit-score">
              <div class="ring large" style="--value:${item.match}">
                <span>${item.match}</span>
              </div>
              <small>${this.state.settings.language === "ar" ? "نسبة التوافق" : "Match score"}</small>
            </div>
          </article>
          <section class="job-analysis-grid">
            <article class="info-card job-analysis-card">
              <div class="dashboard-section-head">
                <div>
                  <h3>${this.state.settings.language === "ar" ? "ملخص سريع" : "Quick snapshot"}</h3>
                  <p>${this.state.settings.language === "ar" ? "قراءة سريعة قبل الدخول في التفاصيل." : "A fast read before diving into the detailed comparison."}</p>
                </div>
              </div>
              <div class="job-snapshot-grid">
                <div class="job-snapshot-item">
                  <small>${this.state.settings.language === "ar" ? "مهارات مطابقة" : "Matched skills"}</small>
                  <strong>${matchedCount}/${totalRequired}</strong>
                </div>
                <div class="job-snapshot-item">
                  <small>${this.state.settings.language === "ar" ? "مهارات ناقصة" : "Missing skills"}</small>
                  <strong>${missingCount}</strong>
                </div>
                <div class="job-snapshot-item">
                  <small>${this.state.settings.language === "ar" ? "تحسين متوقع" : "Potential lift"}</small>
                  <strong>+${readinessLift}</strong>
                </div>
              </div>
            </article>
            <article class="info-card job-analysis-card">
              <div class="dashboard-section-head">
                <div>
                  <h3>${this.state.settings.language === "ar" ? "مقارنة المهارات" : "Skill comparison"}</h3>
                  <p>${this.state.settings.language === "ar" ? "كل مهارة مطلوبة موضحة مقابل وضعك الحالي." : "Each required skill mapped against your current profile."}</p>
                </div>
              </div>
              <div class="job-skill-compare">
                ${item.job.skills.map((skill) => {
                  const hasSkill = userSkills.includes(skill.toLowerCase());
                  return `
                    <div class="job-skill-row ${hasSkill ? "matched" : "missing"}">
                      <div class="job-skill-meta">
                        <strong>${skill}</strong>
                        <small>${hasSkill
                          ? (this.state.settings.language === "ar" ? "موجود في ملفك" : "Present in your profile")
                          : (this.state.settings.language === "ar" ? "غير ظاهر في ملفك" : "Not visible in your profile")}</small>
                      </div>
                      <div class="job-skill-bar">
                        <span style="width:${hasSkill ? "100%" : "28%"}"></span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </article>
            <article class="info-card job-analysis-card">
              <div class="dashboard-section-head">
                <div>
                  <h3>${this.state.settings.language === "ar" ? "الفجوات الحالية" : "Current gaps"}</h3>
                  <p>${this.state.settings.language === "ar" ? "ابدأ بهذه النقاط لرفع فرصك في هذه الوظيفة." : "Start here to improve your odds for this role."}</p>
                </div>
              </div>
              <div class="job-gap-list">
                ${item.missingSkills.length
                  ? item.missingSkills.map((skill) => `
                    <div class="job-gap-item">
                      <strong>${skill}</strong>
                      <small>${this.state.settings.language === "ar" ? `إغلاق هذه الفجوة قد يرفع التوافق تقريبًا ${Math.max(4, Math.round(100 / totalRequired))}%` : `Closing this gap may improve fit by about ${Math.max(4, Math.round(100 / totalRequired))}%`}</small>
                    </div>
                  `).join("")
                  : `<p class="muted">${this.state.settings.language === "ar" ? "لا توجد فجوات رئيسية لهذه الوظيفة." : "No major gaps for this role."}</p>`}
              </div>
            </article>
            <article class="info-card job-analysis-card">
              <div class="dashboard-section-head">
                <div>
                  <h3>${this.state.settings.language === "ar" ? "وصف الوظيفة والمتطلبات" : "Role brief & requirements"}</h3>
                  <p>${this.state.settings.language === "ar" ? "ملخص سريع لما تتوقعه الجهة من هذا الدور." : "A concise view of what the employer expects from this role."}</p>
                </div>
              </div>
              <p>${this.state.settings.language === "ar" ? item.job.descriptionAr : item.job.descriptionEn}</p>
              <div class="chip-row">${item.job.skills.map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
            </article>
          </section>
        </section>
      `;
    }

    planPage() {
      const user = this.currentUser();
      const gaps = this.getSkillGaps(user);
      const progress = this.currentProgress();
      const focusGap = gaps[0];
      const learningSuggestions = this.getLearningSuggestions(focusGap ? focusGap.skill : "");
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "خطة التطوير" : "Development Plan"}</h1>
          <p>${this.state.settings.language === "ar" ? "كل مهمة مكتملة تزيد الجاهزية حتى 10 نقاط." : "Each completed task contributes up to 10 readiness points."}</p>
        </section>
        <section class="cards two-up plan-layout">
          <article class="info-card gap-analysis-card">
            <h3>${this.state.settings.language === "ar" ? "تحليل الفجوات" : "Gap analysis"}</h3>
            <div class="table-like">
              <div class="table-row table-head"><span>${this.state.settings.language === "ar" ? "المهارة" : "Skill"}</span><span>${this.state.settings.language === "ar" ? "المستوى" : "Current"}</span><span>${this.state.settings.language === "ar" ? "الهدف" : "Target"}</span><span>${this.state.settings.language === "ar" ? "الأولوية" : "Priority"}</span><span>${this.state.settings.language === "ar" ? "الأثر" : "Impact"}</span></div>
              ${gaps.length ? gaps.map((gap) => `<div class="table-row"><span>${gap.skill}</span><span>${gap.current}</span><span>${gap.target}</span><span>${gap.priority}</span><span>${gap.impact}</span></div>`).join("") : `<div class="table-row"><span>${this.t("empty")}</span></div>`}
            </div>
            <div class="gap-learning-card">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "أماكن تتعلم منها" : "Where to learn"}</span>
              <div class="gap-learning-list">
                ${learningSuggestions.map((entry) => `
                  <div class="gap-learning-item">
                    <strong>${this.state.settings.language === "ar" ? entry.sourceAr : entry.sourceEn}</strong>
                    <small>${this.state.settings.language === "ar" ? entry.noteAr : entry.noteEn}</small>
                  </div>
                `).join("")}
              </div>
            </div>
            <div class="gap-practice-cta">
              <strong>${this.state.settings.language === "ar" ? "اختبر نفسك بتمارين عملية" : "Test yourself with practical exercises"}</strong>
              <p>${this.state.settings.language === "ar" ? "بعد ما تبدأ التعلّم، افتح مختبر المهارات وشوف هل أتقنت المهارة فعلاً أو تحتاج تدريب أكثر." : "After learning, open Micro Labs Test and check whether you actually mastered the skill or still need more practice."}</p>
              <button class="btn btn-primary" data-nav="/micro-labs-test">${this.state.settings.language === "ar" ? "مختبر المهارات" : "Micro Labs Test"}</button>
            </div>
          </article>
          <article class="info-card plan-builder-card">
            <h3>${this.state.settings.language === "ar" ? "باني الخطة" : "Plan builder"}</h3>
            <div class="plan-builder-grid">
            ${DATA.plans.map((week, index) => `
              <label class="week-card">
                <input type="checkbox" data-plan-check data-index="${index}" ${progress.planChecks[index] ? "checked" : ""}>
                <div class="week-card-copy">
                  <strong class="week-card-title">${this.state.settings.language === "ar" ? `الأسبوع ${week.week}` : `Week ${week.week}`}</strong>
                  <div class="week-card-line">
                    <span class="week-card-label">${this.state.settings.language === "ar" ? "العنوان :" : "Title:"}</span>
                    <span class="week-card-value">${this.state.settings.language === "ar" ? week.titleAr : week.titleEn}</span>
                  </div>
                  <div class="week-card-line">
                    <span class="week-card-label">${this.state.settings.language === "ar" ? "المسار :" : "Learning path:"}</span>
                    <span class="week-card-value">${this.state.settings.language === "ar" ? week.resourceAr : week.resourceEn}</span>
                  </div>
                  <div class="week-card-line">
                    <span class="week-card-label">${this.state.settings.language === "ar" ? "المهمة :" : "Task:"}</span>
                    <span class="week-card-value">${this.state.settings.language === "ar" ? week.taskAr : week.taskEn}</span>
                  </div>
                  <div class="week-card-line">
                    <span class="week-card-label">${this.state.settings.language === "ar" ? "المخرج :" : "Output:"}</span>
                    <span class="week-card-value">${this.state.settings.language === "ar" ? week.projectAr : week.projectEn}</span>
                  </div>
                </div>
              </label>
            `).join("")}
            </div>
          </article>
        </section>
      `;
    }

    behaviorPage() {
      const progress = this.currentProgress();
      const scenarios = this.getBehaviorScenarios();
      const scenario = scenarios[this.state.behaviorScenarioIndex] || scenarios[0];
      if (!scenario) {
        return `<section class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "لا توجد سيناريوهات متاحة الآن." : "No behavior scenarios available right now."}</p></section>`;
      }
      const scores = progress.behavior.scores;
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "محاكاة سلوكية" : "Behavioral Simulation"}</h1>
          <p>${this.state.settings.language === "ar" ? "يتم تقييم التواصل والتعاطف وحل المشكلات." : "Communication, empathy, and problem solving are scored."}</p>
        </section>
        <section class="cards behavior-layout">
          <article class="info-card behavior-scenario-card">
            <div class="hero-summary-head behavior-head-row">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? `السيناريو ${this.state.behaviorScenarioIndex + 1} من ${scenarios.length}` : `Scenario ${this.state.behaviorScenarioIndex + 1} of ${scenarios.length}`}</span>
                <h3>${this.state.settings.language === "ar" ? scenario.titleAr : scenario.titleEn}</h3>
                <p>${this.state.settings.language === "ar" ? scenario.descriptionAr : scenario.descriptionEn}</p>
              </div>
              <div class="behavior-head-actions">
                <button class="behavior-icon-btn" type="button" data-action="reset-behavior" aria-label="${this.state.settings.language === "ar" ? "إعادة السؤال" : "Repeat question"}" title="${this.state.settings.language === "ar" ? "إعادة السؤال" : "Repeat question"}">↺</button>
                <button class="behavior-icon-btn" type="button" data-action="next-behavior-scenario" aria-label="${this.state.settings.language === "ar" ? "تغيير السؤال" : "Change scenario"}" title="${this.state.settings.language === "ar" ? "تغيير السؤال" : "Change scenario"}">⇆</button>
              </div>
            </div>
            <div class="option-list behavior-option-list">
              ${scenario.options.map((option) => `
                <label class="option-card behavior-option-card">
                  <input type="radio" name="behavior-answer" value="${option.id}" ${progress.behavior.completed ? "disabled" : ""} ${this.state.behaviorDraftAnswer === option.id ? "checked" : ""}>
                  <span>${this.state.settings.language === "ar" ? option.textAr : option.textEn}</span>
                </label>
              `).join("")}
            </div>
            <button class="btn btn-primary" data-action="submit-behavior" ${progress.behavior.completed ? "disabled" : ""}>${this.state.settings.language === "ar" ? "تحليل الرد" : "Analyze response"}</button>
          </article>
          <article class="info-card behavior-feedback-card">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "قراءة سريعة" : "Quick read"}</span>
              <h3>${this.state.settings.language === "ar" ? "تغذية راجعة AI" : "AI feedback"}</h3>
              <p>${this.state.settings.language === "ar" ? "قراءة مرتبة لمدى توازنك في الرد الأول." : "A cleaner view of how balanced your first response is."}</p>
            </div>
            ${scores ? `
              <div class="score-stack behavior-score-stack">
                <div class="list-row behavior-score-row"><span>${this.state.settings.language === "ar" ? "التواصل" : "Communication"}</span><strong>${scores.communication}/5</strong></div>
                <div class="list-row behavior-score-row"><span>${this.state.settings.language === "ar" ? "التعاطف" : "Empathy"}</span><strong>${scores.empathy}/5</strong></div>
                <div class="list-row behavior-score-row"><span>${this.state.settings.language === "ar" ? "حل المشكلات" : "Problem solving"}</span><strong>${scores.problem}/5</strong></div>
              </div>
            ` : `<p class="muted">${this.state.settings.language === "ar" ? "اختر رداً لعرض التحليل." : "Choose a response to see the analysis."}</p>`}
          </article>
        </section>
      `;
    }

    interviewPage() {
      const progress = this.currentProgress();
      if (this.state.aiInterviewDone) {
        return `
          <section class="page-head">
            <h1>${this.state.settings.language === "ar" ? "نتيجة المقابلة الذكية" : "Smart Interview Result"}</h1>
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
          <section class="cards">
            ${this.futureSoftSkillsCardMarkup()}
          </section>
        `;
      }
      const current = DATA.interviewQuestions[this.state.aiInterviewIndex];
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "المقابلة الذكية" : "Smart Interview"}</h1>
        </section>
        <section class="cards interview-layout">
          ${this.futureSoftSkillsCardMarkup()}
          <article class="info-card interview-panel interview-main-card">
            <div class="session-inline-card">
              <h3>${this.state.settings.language === "ar" ? "حالة الجلسة" : "Session state"}</h3>
              <p class="session-count">${this.state.settings.language === "ar" ? `السؤال ${this.state.aiInterviewIndex + 1} من ${DATA.interviewQuestions.length}` : `Question ${this.state.aiInterviewIndex + 1} of ${DATA.interviewQuestions.length}`}</p>
            </div>
            <p class="interview-card-lead">${this.state.settings.language === "ar" ? "خمس أسئلة، دردشة بسيطة، ثم تقييم نهائي." : "Five questions, a lightweight chat flow, then a final score."}</p>
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
        </section>
      `;
    }

    profilePage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const readiness = this.getReadiness(user.id);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "الملف الذكي" : "Smart Profile"}</h1>
          <p>${this.state.settings.language === "ar" ? "بطاقة مشاركة سريعة للجاهزية والمهارات الموثقة." : "A compact shareable card for readiness and verified proof."}</p>
        </section>
        <section class="cards smart-profile-layout">
          <article class="profile-card-premium smart-profile-hero">
            <div class="smart-profile-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "بطاقة جاهزة للمشاركة" : "Share-ready card"}</span>
                <h3>${this.displayName(user)}</h3>
                <p>${this.candidateRole(user)}</p>
              </div>
              <div class="smart-profile-score">
                <div class="ring" style="--value:${readiness}">
                  <span>${readiness}</span>
                </div>
                <small>${this.state.settings.language === "ar" ? "الجاهزية الحالية" : "Current readiness"}</small>
              </div>
            </div>
            <div class="smart-profile-body">
              <div class="smart-profile-qr-wrap">
                <div class="qr-grid" aria-label="QR placeholder">
                  ${Array.from({ length: 64 }).map((_, index) => `<span class="${index % 3 === 0 || index % 5 === 0 ? "fill" : ""}"></span>`).join("")}
                </div>
                <small>${this.state.settings.language === "ar" ? "رمز مشاركة سريع للملف والجاهزية." : "A compact share code for profile and readiness."}</small>
              </div>
              <div class="smart-profile-summary">
                <div class="smart-profile-stat">
                  <small>${this.state.settings.language === "ar" ? "المدينة" : "City"}</small>
                  <strong>${user.city}</strong>
                </div>
                <div class="smart-profile-stat">
                  <small>${this.state.settings.language === "ar" ? "مهارات ظاهرة" : "Visible skills"}</small>
                  <strong>${(user.topSkills || []).length}</strong>
                </div>
                <div class="smart-profile-stat">
                  <small>${this.state.settings.language === "ar" ? "إشارات موثقة" : "Verified signals"}</small>
                  <strong>${progress.badges.length}</strong>
                </div>
              </div>
            </div>
            <div class="chip-row">${(user.topSkills || []).slice(0, 4).map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
            <div class="badge-row">${progress.badges.length ? progress.badges.map((badge) => `<span class="badge-soft">${badge}</span>`).join("") : `<span class="badge-soft">${this.t("empty")}</span>`}</div>
            <button class="btn btn-primary" data-action="download-profile">${this.state.settings.language === "ar" ? "تنزيل PNG" : "Download PNG"}</button>
          </article>
          <div class="smart-profile-side">
            <article class="info-card smart-profile-card">
              <div class="hero-summary-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "تفاصيل الملف" : "Profile details"}</span>
                <h3>${this.state.settings.language === "ar" ? "ملخص واضح وسريع" : "Clear, compact summary"}</h3>
              </div>
              <div class="smart-profile-list">
                <div class="smart-profile-list-row">
                  <small>${this.state.settings.language === "ar" ? "المسمى الحالي" : "Current role"}</small>
                  <strong>${this.candidateRole(user)}</strong>
                </div>
                <div class="smart-profile-list-row">
                  <small>${this.state.settings.language === "ar" ? "المهارات" : "Skills"}</small>
                  <strong>${(user.topSkills || []).join(", ") || "-"}</strong>
                </div>
                <div class="smart-profile-list-row">
                  <small>${this.state.settings.language === "ar" ? "الإنجازات" : "Verified badges"}</small>
                  <strong>${progress.badges.join(", ") || "-"}</strong>
                </div>
              </div>
            </article>
            <article class="info-card smart-profile-card">
              <div class="hero-summary-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "اختصارات" : "Shortcuts"}</span>
                <h3>${this.state.settings.language === "ar" ? "افتح الملخصات المرتبطة" : "Open related summaries"}</h3>
              </div>
              <div class="actions-row smart-profile-actions">
                <button class="btn btn-ghost" data-nav="/behavior">${this.state.settings.language === "ar" ? "عرض السلوك" : "Behavioral summary"}</button>
                <button class="btn btn-ghost" data-nav="/interview">${this.state.settings.language === "ar" ? "عرض المقابلة" : "Interview summary"}</button>
              </div>
            </article>
          </div>
        </section>
      `;
    }

    companyDashboard() {
      const activeRole = this.state.companyRoles[0] || DATA.defaultRoleRequirement;
      const ranked = this.rankCandidates(activeRole).slice(0, 5);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "لوحة الشركة" : "Company Dashboard"}</h1>
          <p>${this.state.settings.language === "ar" ? "حدّد احتياج الوظيفة بوضوح، وبعدها يرتّب النظام المرشحين حسب الجاهزية والمواءمة." : "Define the hiring need clearly, then let the system rank candidates by readiness and fit."}</p>
        </section>
        <section class="company-shell">
          <article class="company-overview-card">
            <div class="company-overview-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "احتياج التوظيف الحالي" : "Current hiring need"}</span>
                <h3>${activeRole.title}</h3>
                <p>${this.state.settings.language === "ar" ? "أدخل المسمى، المهارات المطلوبة، الخبرة، والراتب المتوقع. بعدها يفرز لك النظام المرشحين حسب جاهزيتهم الفعلية." : "Set the role title, required skills, years of experience, and expected compensation. The system then ranks candidates by actual readiness."}</p>
              </div>
              <div class="company-overview-metrics">
                <div class="company-metric">
                  <small>${this.state.settings.language === "ar" ? "أفضل نتيجة" : "Top score"}</small>
                  <strong>${ranked[0] ? `${ranked[0].overall}%` : "-"}</strong>
                </div>
                <div class="company-metric">
                  <small>${this.state.settings.language === "ar" ? "مرشحون مناسبون" : "Qualified candidates"}</small>
                  <strong>${ranked.length}</strong>
                </div>
              </div>
            </div>
            <div class="company-overview-grid">
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "المهارات المطلوبة" : "Required skills"}</small>
                <strong>${activeRole.requiredSkills.join(" / ")}</strong>
              </div>
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "سنوات الخبرة" : "Years"}</small>
                <strong>${activeRole.years}</strong>
              </div>
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "الراتب المتوقع" : "Expected salary"}</small>
                <strong>${activeRole.salary}</strong>
              </div>
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "الموقع" : "Location"}</small>
                <strong>${activeRole.location}</strong>
              </div>
            </div>
          </article>
          <section class="company-grid">
            <form class="company-panel-card company-role-form" data-form="role-requirement">
              <div class="hero-summary-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "بحث ذكي" : "Smart search"}</span>
                <h3>${this.state.settings.language === "ar" ? "حدّد مواصفات المرشح المطلوب" : "Define the ideal candidate"}</h3>
                <p>${this.state.settings.language === "ar" ? "كل تعديل هنا يعيد ترتيب المرشحين حسب الجاهزية والملاءمة للدور." : "Every update here refreshes the ranking by readiness and role fit."}</p>
              </div>
              <label>${this.state.settings.language === "ar" ? "المسمى" : "Role title"}<input name="title" value="${activeRole.title}" required></label>
              <label>${this.state.settings.language === "ar" ? "المهارات المطلوبة" : "Required skills"}<input name="requiredSkills" value="${activeRole.requiredSkills.join(", ")}" required></label>
              <label>${this.state.settings.language === "ar" ? "سنوات الخبرة" : "Years of experience"}<input type="number" name="years" value="${activeRole.years}" min="0"></label>
              <label>${this.state.settings.language === "ar" ? "الراتب المتوقع" : "Expected salary"}<input name="salary" value="${activeRole.salary}" required></label>
              <label>${this.state.settings.language === "ar" ? "الموقع" : "Location"}<input name="location" value="${activeRole.location}" required></label>
              <button class="btn btn-primary" type="submit">${this.state.settings.language === "ar" ? "ابحث ورتّب المرشحين" : "Search & rank candidates"}</button>
            </form>
            <article class="company-panel-card company-ranked-card">
              <div class="dashboard-section-head">
                <div>
                  <h3>${this.state.settings.language === "ar" ? "المرشحون حسب الجاهزية" : "Candidates by readiness"}</h3>
                  <p>${this.state.settings.language === "ar" ? "عرض سريع يوضح من الأقرب لهذا الدور الآن." : "A quick view of who is closest to this role right now."}</p>
                </div>
                <button class="btn btn-ghost" data-nav="/candidates">${this.state.settings.language === "ar" ? "عرض الكل" : "View all"}</button>
              </div>
              <div class="company-ranked-stack">
                ${ranked.map((entry) => `
                  <div class="company-candidate-card">
                    <div class="company-candidate-head">
                      <div>
                        <strong>${this.displayName(entry.student)}</strong>
                        <small>${this.candidateRole(entry.student)} · ${entry.student.city}</small>
                      </div>
                      <span class="score-pill">${entry.overall}%</span>
                    </div>
                    <div class="meta-grid">
                      <span>${this.state.settings.language === "ar" ? "جاهزية" : "Readiness"}: ${entry.readiness}%</span>
                      <span>${this.state.settings.language === "ar" ? "مطابقة" : "Skill match"}: ${entry.skillMatch}%</span>
                    </div>
                    <div class="badge-row">${(this.state.progress[entry.student.id].badges || []).slice(0, 3).map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
                    <p class="muted compact-copy">${this.state.settings.language === "ar" ? `مطابق: ${entry.matchedSkills.join(", ") || "-"}` : `Matched: ${entry.matchedSkills.join(", ") || "-"}`}</p>
                    <button class="btn btn-ghost" data-nav="/candidate/${entry.student.id}">${this.t("viewProfile")}</button>
                  </div>
                `).join("")}
              </div>
            </article>
          </section>
        </section>
      `;
    }

    candidatesPage() {
      const activeRole = this.state.companyRoles[0] || DATA.defaultRoleRequirement;
      const ranked = this.rankCandidates(activeRole);
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "المرشحون" : "Candidates"}</h1>
          <p>${this.state.settings.language === "ar" ? "عرض كامل للمرشحين المرتبطين باحتياجك الحالي، مع ترتيب أوضح حسب الجاهزية والمواءمة." : "A full view of candidates tied to your current hiring need, ranked clearly by readiness and fit."}</p>
        </section>
        <section class="company-shell">
          <article class="company-overview-card">
            <div class="company-overview-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "الدور النشط" : "Active role"}</span>
                <h3>${activeRole.title}</h3>
                <p>${this.state.settings.language === "ar" ? "هذا هو الدور الذي يُقاس عليه الترتيب الحالي للمرشحين." : "This is the role currently driving candidate ranking."}</p>
              </div>
              <div class="company-overview-metrics">
                <div class="company-metric">
                  <small>${this.state.settings.language === "ar" ? "عدد المرشحين" : "Candidates"}</small>
                  <strong>${ranked.length}</strong>
                </div>
                <div class="company-metric">
                  <small>${this.state.settings.language === "ar" ? "أفضل نتيجة" : "Top score"}</small>
                  <strong>${ranked[0] ? `${ranked[0].overall}%` : "-"}</strong>
                </div>
              </div>
            </div>
            <div class="company-overview-grid">
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "المهارات المطلوبة" : "Required skills"}</small>
                <strong>${activeRole.requiredSkills.join(" / ")}</strong>
              </div>
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "الخبرة" : "Experience"}</small>
                <strong>${activeRole.years}</strong>
              </div>
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "الراتب" : "Salary"}</small>
                <strong>${activeRole.salary}</strong>
              </div>
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "الموقع" : "Location"}</small>
                <strong>${activeRole.location}</strong>
              </div>
            </div>
          </article>
          <section class="cards company-candidates-grid">
            ${ranked.map((entry) => `
              <article class="company-candidate-card company-candidate-page-card">
                <div class="company-candidate-head">
                  <div>
                    <strong>${this.displayName(entry.student)}</strong>
                    <small>${this.candidateRole(entry.student)} · ${entry.student.city}</small>
                  </div>
                  <span class="score-pill">${entry.overall}%</span>
                </div>
                <div class="meta-grid">
                  <span>${this.state.settings.language === "ar" ? "جاهزية" : "Readiness"}: ${entry.readiness}%</span>
                  <span>${this.state.settings.language === "ar" ? "مطابقة" : "Skill match"}: ${entry.skillMatch}%</span>
                </div>
                <p class="muted compact-copy">${this.state.settings.language === "ar" ? `متطابق: ${entry.matchedSkills.join(", ") || "-"}` : `Matched: ${entry.matchedSkills.join(", ") || "-"}`}</p>
                <p class="muted compact-copy">${this.state.settings.language === "ar" ? `ناقص: ${entry.missingSkills.join(", ") || "-"}` : `Missing: ${entry.missingSkills.join(", ") || "-"}`}</p>
                <div class="badge-row">${(this.state.progress[entry.student.id].badges || []).map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
                <div class="actions-row">
                  <button class="btn btn-ghost" data-nav="/candidate/${entry.student.id}">${this.t("viewProfile")}</button>
                  <button class="btn btn-primary" data-action="invite-candidate">${this.t("invite")}</button>
                </div>
              </article>
            `).join("")}
          </section>
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
      const assessment = this.state.generatedAssessment;
      const hasAssessment = Boolean(assessment && assessment.theory && assessment.theory.length);
      return `
        <section class="page-head">
          <div class="assessment-title-row">
            <h1>${this.state.settings.language === "ar" ? "باني الاختبارات" : "Assessments Builder"}</h1>
            <button
              class="assessment-info-toggle ${this.state.assessmentInfoOpen ? "open" : ""}"
              type="button"
              data-action="toggle-assessment-info"
              aria-label="${this.state.settings.language === "ar" ? "إظهار تفاصيل مكافحة الغش" : "Show anti-cheating details"}"
              title="${this.state.settings.language === "ar" ? "إظهار تفاصيل مكافحة الغش" : "Show anti-cheating details"}"
            >!</button>
          </div>
          ${this.state.assessmentInfoOpen ? `
            <div class="assessment-inline-note">
              <strong>${this.state.settings.language === "ar" ? "مكافحة غش مفعلة" : "Anti-cheating enabled"}</strong>
              <small>${this.state.settings.language === "ar" ? "كل متقدم يحصل على سيناريو مختلف، توليد ديناميكي للأسئلة، وسؤال تبرير منطقي بعد الإجابة الصحيحة." : "Each applicant gets a different scenario, dynamic question generation, and a logic-check after correct answers."}</small>
            </div>
          ` : ""}
          <p>${this.state.settings.language === "ar" ? "اختر التقنية، سياسة الجهة، والتخصص الدقيق، ثم دع النظام يبني اختبارًا متكاملًا." : "Choose the stack, hiring policy, and exact specialty, then let the system build a full assessment."}</p>
        </section>
        <section class="cards company-assessment-layout">
          <form class="company-panel-card assessment-builder-card" data-form="assessment-builder">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "إعدادات التوليد" : "Generation settings"}</span>
              <h3>${this.state.settings.language === "ar" ? "ابنِ الاختبار حسب الاحتياج" : "Build the assessment for the role"}</h3>
            </div>
            <label>${this.state.settings.language === "ar" ? "التقنية" : "Tech stack"}
              <select name="stack">
                <option>JavaScript</option>
                <option>SQL</option>
                <option>Python</option>
                <option>Cybersecurity</option>
              </select>
            </label>
            <label>${this.state.settings.language === "ar" ? "سياسة الجهة" : "Hiring policy"}
              <select name="policy">
                <option>${this.state.settings.language === "ar" ? "تركيز على الجودة" : "Quality first"}</option>
                <option>${this.state.settings.language === "ar" ? "سرعة التنفيذ" : "Speed of execution"}</option>
                <option>${this.state.settings.language === "ar" ? "بيئة شديدة الامتثال" : "High compliance"}</option>
              </select>
            </label>
            <label>${this.state.settings.language === "ar" ? "تخصص دقيق" : "Specialty"}
              <select name="specialty">
                <option>${this.state.settings.language === "ar" ? "واجهات أمامية" : "Front-End"}</option>
                <option>${this.state.settings.language === "ar" ? "تحليل بيانات" : "Data Analysis"}</option>
                <option>${this.state.settings.language === "ar" ? "أمن تطبيقي" : "Application Security"}</option>
                <option>${this.state.settings.language === "ar" ? "جودة برمجيات" : "Quality Engineering"}</option>
              </select>
            </label>
            <label>${this.state.settings.language === "ar" ? "الصعوبة" : "Difficulty"}
              <select name="difficulty">
                <option>Entry</option>
                <option>Mid</option>
                <option>Advanced</option>
              </select>
            </label>
            <button class="btn btn-primary" type="submit">${this.state.settings.language === "ar" ? "ولّد الاختبار" : "Generate assessment"}</button>
          </form>
          <article class="company-panel-card assessment-output-card">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "الناتج الذكي" : "Generated output"}</span>
              <h3>${this.state.settings.language === "ar" ? "الاختبار المقترح" : "Suggested assessment"}</h3>
              <p>${this.state.settings.language === "ar" ? "يولد أسئلة نظرية، سيناريوهات، ومهام عملية مع طبقات تحقق إضافية." : "It generates theory questions, scenarios, and practical tasks with extra verification layers."}</p>
            </div>
            ${hasAssessment ? `
              <div class="assessment-section">
                <strong>${this.state.settings.language === "ar" ? "أسئلة نظرية" : "Theory questions"}</strong>
                <div class="assessment-list">${assessment.theory.map((question) => `<p>${question}</p>`).join("")}</div>
              </div>
              <div class="assessment-section">
                <strong>${this.state.settings.language === "ar" ? "سيناريوهات" : "Scenarios"}</strong>
                <div class="assessment-list">${assessment.scenarios.map((question) => `<p>${question}</p>`).join("")}</div>
              </div>
              <div class="assessment-section">
                <strong>${this.state.settings.language === "ar" ? "مهام عملية" : "Practical tasks"}</strong>
                <div class="assessment-list">${assessment.practical.map((question) => `<p>${question}</p>`).join("")}</div>
              </div>
            ` : `<p class="muted">${this.state.settings.language === "ar" ? "اضغط توليد لعرض اختبار كامل ومخصص." : "Generate to preview a full custom assessment."}</p>`}
          </article>
        </section>
      `;
    }

    routeContent() {
      const route = this.state.route;
      const user = this.currentUser();
      const sharedProtected = new Set(["market-shift"]);
      const protectedStudent = new Set(["student-dashboard", "upload", "jobs", "job", "plan", "behavior", "interview", "profile", "micro-labs-test"]);
      const protectedCompany = new Set(["company-dashboard", "candidate", "candidates", "assessments"]);
      const needsAuth = sharedProtected.has(route.name) || protectedStudent.has(route.name) || protectedCompany.has(route.name);

      if (needsAuth && !this.state.authResolved) {
        return `<section class="info-card"><p class="muted">${this.state.settings.language === "ar" ? "جاري التحقق من الجلسة..." : "Checking your session..."}</p></section>`;
      }

      if (sharedProtected.has(route.name) && !user) {
        this.go("/login");
        return "";
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
        case "market-shift":
          return this.marketShiftPage();
        case "behavior":
          return this.behaviorPage();
        case "interview":
          return this.interviewPage();
        case "profile":
          return this.profilePage();
        case "micro-labs-test":
          return this.microLabsTestPage();
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
      const rail = this.sideRail();
      const stageClass = this.state.route.name === "landing" ? "stage-surface landing-stage" : "stage-surface";
      this.root.innerHTML = `
        <div class="app-shell">
          ${this.topBar()}
          <div class="shell-grid no-rail">
            <main class="main-shell">
              <div class="${stageClass}">
                ${this.routeContent()}
              </div>
            </main>
          </div>
          ${rail}
          ${this.bottomTabs()}
          ${this.state.toast ? `<div class="toast-snackbar">${this.state.toast}</div>` : ""}
        </div>
      `;
    }
  }

  window.addEventListener("DOMContentLoaded", function () {
    const root = document.getElementById("app");
    if (root) {
      try {
        window.tamheedApp = new TamheedApp(root);
      } catch (error) {
        console.error(error);
        root.innerHTML = `
          <div class="app-shell">
            <main class="main-shell">
              <div class="stage-surface">
                <article class="info-card">
                  <h3>Application recovery mode</h3>
                  <p>حدث خطأ أثناء التشغيل. حدّث الصفحة. وإذا تكرر، فالواجهة ما زالت بحاجة لتصحيح إضافي.</p>
                </article>
              </div>
            </main>
          </div>
        `;
      }
    }
  });
})();
