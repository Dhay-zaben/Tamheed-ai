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
    companyRoles: "tamheed_company_roles",
    invitedCandidates: "tamheed_invited_candidates"
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
      desiredRole: "Data Analyst", // Used for behavioral questions
      desiredRoleAr: "محللة بيانات",
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
        settings: Object.assign({ language: "ar", theme: "dark" }, readStore(STORAGE_KEYS.settings, {})),
        progress: readStore(STORAGE_KEYS.progress, {}),
        companyRoles: readStore(STORAGE_KEYS.companyRoles, []),
        invitedCandidates: readStore(STORAGE_KEYS.invitedCandidates, {}),
        route: this.parseRoute(),
        authResolved: false,
        cvUploadPending: false,
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
        behavioralQuestions: null, // AI-generated behavioral questions
        behavioralAnswers: {}, // Store answers for each question
        behavioralCurrentQuestion: 0,
        behavioralTimer: 120,
        behavioralTestActive: false,
        behavioralLoading: false,
        behavioralResultReady: false,
        behavioralLatestScores: null,
        cvStatusMessage: "",
        jobCvStatusMessage: "",
        selectedTargetRole: "Frontend Developer",
        realJobs: null, // Will store real jobs from API
        jobsLoading: false,
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
        },
        companyCandidateFilters: {
          city: "all",
          minReadiness: 0,
          minYears: 0,
          skill: "all"
        }
      };
      this.labInterval = null;
      this.behavioralInterval = null;
      this.toastTimer = null;
      this.bindGlobalEvents();
      // Force default theme to dark on initial load if none stored
      if (!this.state.settings.theme) {
        this.state.settings.theme = "dark";
      }
      this.applySettings();
      this.configurePdfJs();
      this.ensureSeedData();
      this.ensureDemoAccounts();
      this.render();
      this.bindFirebaseSession();
    }

    scoreInterviewAnswers(drafts) {
      const answers = Object.values(drafts || {});
      const totalQuestions = DATA.interviewQuestions.length;
      const KEYWORDS = ["team", "project", "deliver", "result", "impact", "customer", "client", "stakeholder", "improve", "reduce", "increase", "design", "build", "ship", "launch", "data", "metrics", "analyze", "fix", "solve", "challenge", "risk", "timeline", "priority"];
      const STRUCTURE = ["first", "then", "after", "because", "so", "therefore", "finally", "as a result"];

      let sum = 0;
      let answered = 0;
      const feedback = [];

      answers.forEach((raw, idx) => {
        const text = (raw || "").trim();
        if (!text) {
          feedback.push(this.state.settings.language === "ar"
            ? `السؤال ${idx + 1}: لم تتم الإجابة عليه.`
            : `Question ${idx + 1}: No answer provided.`);
          return;
        }
        answered += 1;
        const words = text.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const uniqueRatio = words.length ? new Set(words.map((w) => w.toLowerCase())).size / words.length : 0;
        const keywordHits = KEYWORDS.reduce((acc, kw) => acc + (text.toLowerCase().includes(kw) ? 1 : 0), 0);
        const structureHits = STRUCTURE.reduce((acc, kw) => acc + (text.toLowerCase().includes(kw) ? 1 : 0), 0);
        const hasResult = /(result|impact|improv|increase|reduce|saved|growth|achiev|deliver)/i.test(text);

        const lengthScore = clamp((wordCount - 18) / 45 * 35, 0, 35);
        const keywordScore = clamp(keywordHits * 6, 0, 30);
        const structureScore = clamp(structureHits * 4, 0, 20);
        const resultBonus = hasResult ? 10 : 0;

        let penalty = 0;
        if (wordCount < 20) penalty += 12;
        if (wordCount < 12) penalty += 10;
        if (uniqueRatio < 0.45) penalty += 8;
        if (keywordHits === 0 && structureHits === 0 && wordCount >= 5) {
          penalty += 25; // likely gibberish / irrelevant
        }

        const questionScore = clamp(Math.round(lengthScore + keywordScore + structureScore + resultBonus - penalty), 0, 95);
        sum += questionScore;

        if (wordCount < 30) {
          feedback.push(this.state.settings.language === "ar"
            ? `السؤال ${idx + 1}: زد التفاصيل والنتائج (الإجابة قصيرة).`
            : `Q${idx + 1}: Add more detail and outcomes (answer is short).`);
        }
        if (!hasResult) {
          feedback.push(this.state.settings.language === "ar"
            ? `السؤال ${idx + 1}: اذكر نتيجة أو أثر رقمي.`
            : `Q${idx + 1}: Mention a result or measurable impact.`);
        }
        if (keywordHits < 2) {
          feedback.push(this.state.settings.language === "ar"
            ? `السؤال ${idx + 1}: أضف كلمات عن المشروع/الأثر/الفريق.`
            : `Q${idx + 1}: Add project/impact/team specifics.`);
        }
        if (keywordHits === 0 && structureHits === 0) {
          feedback.push(this.state.settings.language === "ar"
            ? `السؤال ${idx + 1}: الإجابة غير واضحة للدور—أضف مثالاً حقيقياً وخطوات.`
            : `Q${idx + 1}: Answer lacks role context—add a concrete example and steps.`);
        }
      });

      const answeredRatio = totalQuestions ? answered / totalQuestions : 0;
      const missingPenalty = (totalQuestions - answered) * 8;
      let overall = clamp(Math.round((sum / Math.max(answered, 1)) * answeredRatio) - missingPenalty, 5, 95);
      if (overall < 5) overall = 5;
      if (overall < 20) {
        feedback.push(this.state.settings.language === "ar"
          ? "النتيجة منخفضة: أعد الإجابات بذكر المشكلة، الإجراء، والنتيجة الرقمية."
          : "Low score: rewrite with problem, action, and measurable result.");
      }

      if (answered < totalQuestions) {
        feedback.unshift(this.state.settings.language === "ar"
          ? "أكمل كل الأسئلة لتحصل على درجة أدق."
          : "Answer all questions to get an accurate score.");
      }

      if (!feedback.length) {
        feedback.push(this.state.settings.language === "ar"
          ? "أضف مثالاً محدداً، ما قمت به، والنتيجة بالأرقام."
          : "Add a specific example: what you did and the measurable result.");
      }

      return { overall, feedback: feedback.slice(0, 8) };
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
            jobApplications: {},
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
        jobApplications: {
          "job-1": { status: "review", updatedAt: new Date().toISOString() },
          "job-3": { status: "submitted", updatedAt: new Date().toISOString() }
        },
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
          jobApplications: {},
          lab: { attempted: false, passed: false, answerId: null },
          behavior: { completed: false, scores: null },
          interview: { completed: false, score: 0 }
        };
        this.persistProgress();
      }
      this.normalizeProgressRecord(this.state.progress[user.id]);
      return this.state.progress[user.id];
    }

    normalizeProgressRecord(progress) {
      if (!progress) return;
      if (!Array.isArray(progress.appliedJobs)) {
        progress.appliedJobs = [];
      }
      if (!progress.jobApplications || typeof progress.jobApplications !== "object") {
        progress.jobApplications = {};
      }
      progress.appliedJobs.forEach((jobId) => {
        if (!progress.jobApplications[jobId]) {
          progress.jobApplications[jobId] = {
            status: "submitted",
            updatedAt: new Date().toISOString()
          };
        }
      });
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

    persistInvitedCandidates() {
      writeStore(STORAGE_KEYS.invitedCandidates, this.state.invitedCandidates);
    }

    getProfileTargetRole(user) {
      return (user && (user.targetRoleEn || user.desiredRole)) || this.state.selectedTargetRole || "Frontend Developer";
    }

    isSaraDemoUser(user) {
      if (!user) return false;
      const demoEmail = String(DEMO_ACCOUNTS.student.email || "").toLowerCase();
      return user.id === DEMO_ACCOUNTS.student.id || String(user.email || "").toLowerCase() === demoEmail;
    }

    isCandidateInvited(candidateId) {
      return Boolean(this.state.invitedCandidates && this.state.invitedCandidates[candidateId]);
    }

    markCandidateInvited(candidateId) {
      if (!candidateId) return;
      if (!this.state.invitedCandidates) {
        this.state.invitedCandidates = {};
      }
      this.state.invitedCandidates[candidateId] = true;
      this.persistInvitedCandidates();
    }

    getAuthDraft(mode) {
      return this.state.authDrafts[mode][this.state.authRole];
    }

    updateAuthDraft(mode, field, value) {
      this.state.authDrafts[mode][this.state.authRole][field] = value;
    }

    setToast(message) {
      this.state.toast = message;
      this.render();
      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        this.state.toast = "";
        this.render();
      }, 2400);
    }

    showToast(message) {
      this.setToast(message);
    }

    downloadSmartProfilePng() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      if (!user || !progress) return false;

      const readiness = this.getReadiness(user.id);
      const skills = (user.topSkills || []).slice(0, 6);
      const badges = (progress.badges || []).slice(0, 6);
      const isAr = this.state.settings.language === "ar";
      const width = 1400;
      const height = 900;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      // Background
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#0d3c61");
      bg.addColorStop(1, "#0f5f70");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Card surface
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(55, 55, width - 110, height - 110);

      // Header
      ctx.fillStyle = "#10416A";
      ctx.font = "700 48px 'Plus Jakarta Sans', Arial";
      ctx.fillText(isAr ? "الملف الذكي" : "Smart Profile", 100, 140);
      ctx.font = "600 34px 'Plus Jakarta Sans', Arial";
      ctx.fillText(this.displayName(user), 100, 195);
      ctx.font = "500 24px 'Plus Jakarta Sans', Arial";
      ctx.fillStyle = "#475569";
      ctx.fillText(this.candidateRole(user), 100, 235);

      // Readiness ring
      const cx = width - 220;
      const cy = 185;
      const radius = 72;
      ctx.lineWidth = 16;
      ctx.strokeStyle = "rgba(16,65,106,0.15)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#13B4B7";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * readiness) / 100);
      ctx.stroke();
      ctx.fillStyle = "#10416A";
      ctx.font = "700 38px 'Plus Jakarta Sans', Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(readiness), cx, cy + 14);
      ctx.textAlign = "start";

      ctx.font = "600 20px 'Plus Jakarta Sans', Arial";
      ctx.fillStyle = "#475569";
      const readinessLabel = isAr ? "الجاهزية الحالية" : "Current readiness";
      ctx.fillText(readinessLabel, width - 335, 285);

      // Skills block
      ctx.fillStyle = "#10416A";
      ctx.font = "700 28px 'Plus Jakarta Sans', Arial";
      ctx.fillText(isAr ? "المهارات" : "Skills", 100, 330);
      let y = 370;
      ctx.font = "600 22px 'Plus Jakarta Sans', Arial";
      skills.forEach((skill) => {
        ctx.fillStyle = "rgba(16,65,106,0.08)";
        ctx.fillRect(100, y - 26, 360, 40);
        ctx.fillStyle = "#10416A";
        ctx.fillText(skill, 116, y);
        y += 56;
      });

      // Badges block
      ctx.fillStyle = "#10416A";
      ctx.font = "700 28px 'Plus Jakarta Sans', Arial";
      ctx.fillText(isAr ? "الإشارات الموثقة" : "Verified Badges", 520, 330);
      y = 370;
      ctx.font = "600 22px 'Plus Jakarta Sans', Arial";
      badges.forEach((badge) => {
        ctx.fillStyle = "rgba(19,180,183,0.14)";
        ctx.fillRect(520, y - 26, 760, 40);
        ctx.fillStyle = "#10416A";
        ctx.fillText(badge, 536, y);
        y += 56;
      });

      // Footer line
      ctx.fillStyle = "#64748B";
      ctx.font = "500 18px 'Plus Jakarta Sans', Arial";
      const dateLabel = new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US");
      ctx.fillText(`${isAr ? "تاريخ التصدير" : "Exported"}: ${dateLabel}`, 100, height - 90);

      const link = document.createElement("a");
      const safeName = String((user.nameEn || user.name || "profile")).replace(/\s+/g, "-").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.download = `tamheed-smart-profile-${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    }

    errorText(key) {
      return this.state.formErrors[key] ? `<small class="field-error">${this.state.formErrors[key]}</small>` : "";
    }

    validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    configurePdfJs() {
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
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
      const normalizedTarget = String(targetRole || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = matches.find((item) => {
        const normalizedRole = String(item.role || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedRole === normalizedTarget || normalizedRole.includes(normalizedTarget) || normalizedTarget.includes(normalizedRole);
      }) || matches[0] || { role: targetRole, missingSkills: [] };
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
      const effectiveTargetRole = targetRole || this.getProfileTargetRole(this.currentUser());
      const parsedProfile = this.parseCvText(text);
      const skills = this.detectSkills(text);
      const scores = this.scoreCvAnalysis(parsedProfile, skills);
      const matches = this.computeRoleMatches(skills);
      const plan = this.buildDevelopmentPlan(effectiveTargetRole, matches);
      return {
        rawTextPreview: text.slice(0, 1500),
        parsedProfile,
        skills,
        scores,
        matches,
        plan
      };
    }

    async fetchCvAiInsights(text, targetRole) {
      try {
        const response = await fetch("/.netlify/functions/analyze-cv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: text.slice(0, 16000),
            target_role: targetRole || this.state.selectedTargetRole || ""
          })
        });
        if (!response.ok) {
          throw new Error("ai-analysis-failed");
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("[upload-cv] AI CV analysis failed", error);
        return null;
      }
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
        const items = (cvAnalysis.skills || [])
          .filter((skill) => skill.category === category)
          .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
          .slice(0, 5);
        if (!items.length) {
          return "";
        }
        return `
          <article class="cv-section-card cv-skill-card">
            <p class="cv-section-title"><strong>${category}</strong></p>
            <div class="cv-skill-list">
              ${items.map((skill) => {
                const pct = Math.round((skill.confidence || 0) * 100);
                return `
                  <div class="cv-skill-item">
                    <span class="cv-skill-name">${skill.name} · ${skill.level}</span>
                    <span class="cv-skill-score-wrap">
                      <span class="cv-skill-score">${pct}%</span>
                      <span class="cv-skill-trend ${pct >= 70 ? "up" : "down"}">${pct >= 70 ? "▲" : "▼"}</span>
                    </span>
                  </div>
                `;
              }).join("")}
            </div>
          </article>
        `;
      }).join("");
      const sortedRoleMatches = [...(cvAnalysis.matches || [])]
        .filter((item) => item && item.role && Number.isFinite(item.match))
        .sort((a, b) => b.match - a.match);
      const topMatches = sortedRoleMatches.slice(0, 6);
      const targetMatch = sortedRoleMatches.find((item) => item.role === plan.targetRole) || topMatches[0] || { missingSkills: [] };
      const infoRows = [
        parsedProfile.phone ? `<p><strong>${this.state.settings.language === "ar" ? "الجوال" : "Phone"}:</strong> ${parsedProfile.phone}</p>` : "",
        parsedProfile.linkedin ? `<p><strong>LinkedIn:</strong> ${parsedProfile.linkedin}</p>` : "",
        parsedProfile.education ? `<p><strong>${this.state.settings.language === "ar" ? "التعليم" : "Education"}:</strong> ${parsedProfile.education}</p>` : "",
        parsedProfile.experience ? `<p><strong>${this.state.settings.language === "ar" ? "الخبرة" : "Experience"}:</strong> ${parsedProfile.experience}</p>` : "",
        parsedProfile.projects ? `<p><strong>${this.state.settings.language === "ar" ? "المشاريع" : "Projects"}:</strong> ${parsedProfile.projects}</p>` : ""
      ].filter(Boolean).join("");
      const hasScores = scores.TechnicalScore || scores.ProfileCompleteness || scores.ProjectsScore || scores.TotalScore;
      const ai = cvAnalysis.aiInsights || null;
      const aiTargetRole = ai && (ai.target_role || ai.suggested_role || plan.targetRole || this.state.selectedTargetRole);
      // Keep one unified readiness number across the UI to avoid conflicting values.
      const readinessScore = ai && Number.isFinite(ai.job_fit_score)
        ? ai.job_fit_score
        : (scores.TotalScore || 0);
      const aiStrengths = ai && Array.isArray(ai.strengths) ? ai.strengths.slice(0, 3) : [];
      const aiWeaknesses = ai && Array.isArray(ai.weaknesses) ? ai.weaknesses.slice(0, 3) : [];
      const aiMissing = ai && Array.isArray(ai.missing_skills) ? ai.missing_skills.slice(0, 4) : [];
      const aiSuggestions = ai && Array.isArray(ai.suggestions) ? ai.suggestions.slice(0, 4) : [];
      const overallScore = Number.isFinite(scores.TotalScore) ? scores.TotalScore : 0;
      const readinessTone = readinessScore >= 70 ? "good" : (readinessScore >= 50 ? "warn" : "risk");
      const overallTone = overallScore >= 70 ? "good" : (overallScore >= 50 ? "warn" : "risk");
      return `
        <div class="cv-compact">
          <div class="cv-score-cards">
            <article class="cv-score-card ${readinessTone}">
              <small>${this.state.settings.language === "ar" ? "جاهزية الدور" : "Role readiness"}</small>
              <strong>${readinessScore}% ${plan.targetRole ? `<span>(${plan.targetRole})</span>` : ""}</strong>
              <div class="cv-score-bar"><span style="width:${readinessScore}%"></span></div>
            </article>
            ${hasScores ? `
              <article class="cv-score-card ${overallTone}">
                <small>${this.state.settings.language === "ar" ? "الدرجة الإجمالية" : "Overall score"}</small>
                <strong>${overallScore}<span>/100</span></strong>
                <div class="cv-score-bar"><span style="width:${overallScore}%"></span></div>
              </article>
            ` : ""}
          </div>
          ${infoRows ? `<article class="cv-section-card cv-info-card">${infoRows}</article>` : ""}
          ${grouped ? `<div class="cv-skills-grid">${grouped}</div>` : ""}
          ${topMatches.length ? `<article class="cv-section-card cv-top-role">
            <p class="cv-section-title"><strong>${this.state.settings.language === "ar" ? "أفضل الوظائف المطابقة" : "Top matching roles"}</strong></p>
            <div class="cv-role-list">
              ${topMatches.map((match) => `
                <div class="cv-role-item">
                  <span class="cv-role-name">${match.role}</span>
                  <span class="cv-role-score-wrap">
                    <span class="cv-role-score">${match.match}%</span>
                    <span class="cv-role-trend ${match.match >= 70 ? "up" : "down"}">${match.match >= 70 ? "▲" : "▼"}</span>
                  </span>
                </div>
              `).join("")}
            </div>
          </article>` : ""}
          ${targetMatch.missingSkills.length ? `<article class="cv-section-card cv-missing">
            <p class="cv-section-title"><strong>${this.state.settings.language === "ar" ? "فجوات المهارات" : "Missing skills"}</strong></p>
            <div class="cv-missing-list">
              ${targetMatch.missingSkills.map((skill) => `<div class="cv-missing-item">${skill}</div>`).join("")}
            </div>
          </article>` : ""}
          ${ai ? `
            <article class="cv-section-card cv-ai-card">
              <div class="cv-ai-grid">
              <div class="cv-ai-head">
                <p><strong>${this.state.settings.language === "ar" ? "تحليل الذكاء الاصطناعي حسب الوظيفة" : "AI role-focused analysis"}</strong></p>
                ${aiTargetRole ? `<p class="cv-tag">${this.state.settings.language === "ar" ? "الوظيفة المستهدفة" : "Target role"}: ${aiTargetRole}</p>` : ""}
              </div>
              ${ai.job_fit_score !== null && ai.job_fit_score !== undefined ? `
                <div class="cv-ai-capability" style="margin: 12px 0; padding: 12px; background: ${ai.job_fit_score >= 70 ? "rgba(76, 175, 80, 0.1)" : ai.job_fit_score >= 50 ? "rgba(255, 193, 7, 0.1)" : "rgba(244, 67, 54, 0.1)"}; border-left: 4px solid ${ai.job_fit_score >= 70 ? "#4caf50" : ai.job_fit_score >= 50 ? "#ffc107" : "#f44336"}; border-radius: 4px;">
                  <p><strong>${this.state.settings.language === "ar" ? "نسبة الملاءمة للدور" : "Job fit score"}</strong>: ${ai.job_fit_score}%</p>
                  ${ai.capability_assessment ? `<p style="font-size: 0.9em; margin-top: 6px; color: var(--text-soft);">${ai.capability_assessment}</p>` : ""}
                </div>
              ` : ""}
              ${ai.summary ? `<p class="cv-ai-summary">${ai.summary}</p>` : ""}
              <div class="cv-ai-row">
                ${aiStrengths.length ? `<div class="cv-ai-column">
                  <p><strong>${this.state.settings.language === "ar" ? "نِقَاط القوة" : "Strengths"}</strong></p>
                  <ul>${aiStrengths.map((item) => `<li>${item}</li>`).join("")}</ul>
                </div>` : ""}
                ${aiWeaknesses.length ? `<div class="cv-ai-column">
                  <p><strong>${this.state.settings.language === "ar" ? "نِقَاط الضعف" : "Weaknesses"}</strong></p>
                  <ul>${aiWeaknesses.map((item) => `<li>${item}</li>`).join("")}</ul>
                </div>` : ""}
              </div>
              <div class="cv-ai-row">
                ${aiMissing.length ? `<div class="cv-ai-column">
                  <p><strong>${this.state.settings.language === "ar" ? "مهارات ناقصة" : "Missing skills"}</strong></p>
                  <ul>${aiMissing.map((item) => `<li>${item}</li>`).join("")}</ul>
                </div>` : ""}
                ${aiSuggestions.length ? `<div class="cv-ai-column">
                  <p><strong>${this.state.settings.language === "ar" ? "اقتراحات عملية" : "Practical suggestions"}</strong></p>
                  <ul>${aiSuggestions.map((item) => `<li>${item}</li>`).join("")}</ul>
                </div>` : ""}
              </div>
              </div>
            </article>
          ` : ""}
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
            aiInsights: cvPayload.aiInsights || null,
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
          const protectedRoute = new Set(["student-dashboard", "upload", "jobs", "job", "plan", "interview", "profile", "company-dashboard", "candidate", "candidates", "assessments"]);
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

          // Auto-load real jobs for students
          if (profile.role === "student") {
            this.loadRealJobsAsync();
          }

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
        this.state.servicesMenuOpen = false;
        
        // Reset CV analysis display when navigating away from upload page (page refresh behavior)
        // Keep it saved in Firestore, but clear transient state for fresh analysis view
        if (this.state.route.name !== "upload") {
          this.state.cvStatusMessage = "";
        }
        
        this.render();
      });

      document.addEventListener("click", (event) => {
        if (this.state.servicesMenuOpen && !event.target.closest("[data-services-menu]")) {
          this.state.servicesMenuOpen = false;
          this.render();
          return;
        }

        const navTarget = event.target.closest("[data-nav]");
        if (navTarget) {
          event.preventDefault();
          this.state.servicesMenuOpen = false;
          const route = navTarget.dataset.nav || navTarget.getAttribute("href") || "/";
          this.go(route);
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
        if (event.target.matches("[data-company-filter]")) {
          this.handleCompanyFilterChange(event.target);
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
          if (this.state.behavioralTestActive && this.state.behavioralQuestions && this.state.behavioralQuestions.length > 0) {
            const currentQuestion = this.state.behavioralQuestions[this.state.behavioralCurrentQuestion];
            if (currentQuestion && currentQuestion.id) {
              this.recordBehavioralAnswer(currentQuestion.id, event.target.value);
              const isLastQuestion = this.state.behavioralCurrentQuestion >= this.state.behavioralQuestions.length - 1;
              if (isLastQuestion) {
                window.setTimeout(() => {
                  this.completeBehavioralTest({ allowUnanswered: true });
                }, 50);
                return;
              }
              this.render();
            }
          }
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

    handleCompanyFilterChange(input) {
      const key = input.dataset.companyFilter;
      if (key === "minReadiness" || key === "minYears") {
        this.state.companyCandidateFilters[key] = Number(input.value);
      } else {
        this.state.companyCandidateFilters[key] = input.value;
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
        this.state.servicesMenuOpen = false;
        this.logoutUser().catch(() => {
          this.state.formErrors = {
            "login.password": this.state.settings.language === "ar" ? "تعذر تسجيل الخروج" : "Unable to sign out"
          };
          this.render();
        });
        return;
      }

      if (action === "toggle-services-menu") {
        this.state.servicesMenuOpen = !this.state.servicesMenuOpen;
        this.render();
        return;
      }

      if (action.startsWith("choose-plan|")) {
        const planKey = action.split("|")[1];
        if (!user) {
          this.go("/register");
          return;
        }
        const labelMap = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
        const planLabel = labelMap[planKey] || planKey;
        user.selectedPlan = planKey;
        user.selectedPlanAt = new Date().toISOString();
        this.persistAccounts();
        this.showToast(this.state.settings.language === "ar" ? `تم اختيار خطة ${planLabel}` : `${planLabel} plan selected`);
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
        
        // Clear the file input for fresh upload
        if (input) {
          input.value = "";
        }
        
        this.render();

        this.extractTextFromPdf(file)
          .then(async (rawText) => {
            if (rawText.length < 50) {
              this.state.cvStatusMessage = this.state.settings.language === "ar" ? "ما قدرت أطلع نص واضح من الـ PDF. ممكن يكون سكان/صورة." : "I could not extract clear text from the PDF. It may be a scan/image.";
              this.state.cvUploadPending = false;
              this.render();
              return;
            }
            const selectedRole = this.getProfileTargetRole(this.currentUser());
            const cvAnalysis = this.buildCvAnalysis(rawText, selectedRole);
            const aiInsights = await this.fetchCvAiInsights(rawText, selectedRole);
            if (aiInsights) {
              cvAnalysis.aiInsights = aiInsights;
            }
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
        
        // Require at least one CV upload before applying
        if (!progress.cvUploaded) {
          this.state.jobCvStatusMessage = this.state.settings.language === "ar"
            ? "حمّل سيرتك أولاً لتستخدمها في التقديم."
            : "Upload your CV once to apply.";
          this.render();
          return;
        }

        const currentStatus = this.getApplicationStatus(progress, jobId);
        if (currentStatus === "none") {
          this.setApplicationStatus(progress, jobId, "submitted");
        } else if (currentStatus === "submitted") {
          this.setApplicationStatus(progress, jobId, "review");
        }
        this.persistProgress();
        this.state.jobCvStatusMessage = "";
        this.showToast(this.state.settings.language === "ar" ? "تم تسجيل التقديم بنجاح" : "Application saved successfully");
        this.render();
        return;
      }

      if (action === "upload-cv-job") {
        if (this.state.cvUploadPending) {
          return;
        }
        if (!auth.currentUser) {
          this.state.jobCvStatusMessage = this.state.settings.language === "ar" ? "لازم تسجل دخول أول" : "You need to sign in first";
          this.render();
          return;
        }
        const jobId = target.dataset.jobId;
        const input = document.getElementById(`jobCvInput-${jobId}`);
        const file = input && input.files ? input.files[0] : null;
        if (!file) {
          this.state.jobCvStatusMessage = this.state.settings.language === "ar" ? "اختر ملف PDF أول" : "Choose a PDF first";
          this.render();
          return;
        }
        if (file.type !== "application/pdf") {
          this.state.jobCvStatusMessage = this.state.settings.language === "ar" ? "الملف لازم يكون PDF" : "File must be a PDF";
          this.render();
          return;
        }

        this.state.cvUploadPending = true;
        this.state.jobCvStatusMessage = this.state.settings.language === "ar" ? "جاري قراءة السيرة وتحليلها..." : "Reading and analyzing your CV...";
        this.render();

        this.extractTextFromPdf(file)
          .then(async (rawText) => {
            if (rawText.length < 50) {
              this.state.jobCvStatusMessage = this.state.settings.language === "ar" ? "ما قدرت أطلع نص واضح من الـ PDF. ممكن يكون سكان/صورة." : "I could not extract clear text from the PDF. It may be a scan/image.";
              this.state.cvUploadPending = false;
              this.render();
              return;
            }
            const selectedRole = this.getProfileTargetRole(this.currentUser());
            const cvAnalysis = this.buildCvAnalysis(rawText, selectedRole);
            const aiInsights = await this.fetchCvAiInsights(rawText, selectedRole);
            if (aiInsights) {
              cvAnalysis.aiInsights = aiInsights;
            }
            await this.saveCvToFirestore(cvAnalysis);

            const currentUser = this.currentUser();
            if (currentUser) {
              currentUser.cvAnalysis = cvAnalysis;
              if (currentUser.role === "student") {
                currentUser.topSkills = Array.isArray(cvAnalysis.skills) ? cvAnalysis.skills.map((s) => typeof s === "string" ? s : s.name) : [];
              }
              this.persistAccounts();
            }

            // persist into progress so it can be reused across job applications
            const progressSafe = this.currentProgress();
            if (progressSafe) {
              progressSafe.cvUploaded = true;
              progressSafe.cvAnalysis = {
                skills: Array.isArray(cvAnalysis.skills) ? cvAnalysis.skills.map((s) => typeof s === "string" ? s : s.name) : [],
                seniority: cvAnalysis.parsedProfile?.seniority || "Entry",
                recommendedRoles: (cvAnalysis.matches || []).slice(0, 2).map((match) => match.role),
                baseScore: clamp(Math.round((cvAnalysis.scores?.TotalScore || 0) * 0.6), 0, 60)
              };
              progressSafe.readinessParts.cv = clamp(progressSafe.cvAnalysis.baseScore, 0, 60);
              if (!progressSafe.badges.includes("CV Verified")) {
                progressSafe.badges.push("CV Verified");
              }
              this.persistProgress();
            }

            this.state.jobCvStatusMessage = this.state.settings.language === "ar" ? "تم ✅ حفظ السيرة بنجاح. يمكنك التقديم الآن." : "Saved ✅ Your CV is ready. You can now apply.";
            this.state.cvUploadPending = false;
            this.render();
          })
          .catch((error) => {
            this.state.jobCvStatusMessage = error.message || (this.state.settings.language === "ar" ? "تعذر تحليل السيرة حالياً" : "Unable to analyze the CV right now");
            this.state.cvUploadPending = false;
            this.render();
          });
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
          this.showToast(this.state.settings.language === "ar" ? "اختر إجابة أولاً" : "Select an answer first");
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
          this.showToast(this.state.settings.language === "ar" ? "اختر رداً" : "Choose a response");
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

      // ============================================
      // AI Behavioral Assessment Actions
      // ============================================

      if (action === "start-behavioral-test") {
        this.loadBehavioralQuestions();
        return;
      }

      if (action.startsWith("record-behavioral-answer|")) {
        const parts = action.split("|");
        const questionId = parts[1];
        const optionId = parts[2];
        this.recordBehavioralAnswer(questionId, optionId);
        this.render();
        return;
      }

      if (action === "next-behavioral-question") {
        this.nextBehavioralQuestion();
        return;
      }

      if (action === "prev-behavioral-question") {
        if (this.state.behavioralCurrentQuestion > 0) {
          this.state.behavioralCurrentQuestion -= 1;
          const questions = this.state.behavioralQuestions || [];
          const currentQuestion = questions[this.state.behavioralCurrentQuestion];
          this.state.behavioralTimer = currentQuestion?.timeLimit || 120;
          this.startBehavioralTimer();
          this.render();
        }
        return;
      }

      if (action === "complete-behavioral-test") {
        this.completeBehavioralTest();
        return;
      }

      if (action === "retake-behavioral-test") {
        console.log("Retake behavioral test clicked");
        this.stopBehavioralTimer();
        const progress = this.currentProgress();
        if (progress) {
          progress.behavior = {
            completed: false,
            scores: null
          };
          progress.readinessParts.behavior = 0;
          progress.badges = progress.badges.filter((badge) => badge !== "Behavioral Ready");
          this.persistProgress();
        }

        // Reset behavioral test state
        this.state.behavioralQuestions = null;
        this.state.behavioralAnswers = {};
        this.state.behavioralCurrentQuestion = 0;
        this.state.behavioralTimer = 120;
        this.state.behavioralTestActive = false;
        this.state.behavioralLoading = false;
        this.state.behavioralResultReady = false;
        this.state.behavioralLatestScores = null;
        // Immediately start a fresh assessment with new questions
        this.loadBehavioralQuestions();
        return;
      }
      if (action === "start-mic") {
        if (this.state.micActive) {
           if(window._activeRecognition) window._activeRecognition.stop();
           this.state.micActive = false;
           this.render();
           return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          this.showToast(this.state.settings.language === "ar" ? "المتصفح لا يدعم المايكروفون. استخدم Chrome." : "Browser doesn't support microphone. Use Chrome.");
          return;
        }
        
        const recognition = new SpeechRecognition();
        window._activeRecognition = recognition;
        
        // Dynamic Language Sync
        recognition.lang = this.state.settings.language === "ar" ? 'ar-SA' : 'en-US'; 
        recognition.interimResults = true; 
        recognition.continuous = true; 
        
        this.state.micActive = true;
        this.render();

        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          const currentIndex = this.state.aiInterviewIndex;
          if (!this.state.aiInterviewFinalDrafts) this.state.aiInterviewFinalDrafts = {};
          
          if (finalTranscript) {
              const currentFinal = this.state.aiInterviewFinalDrafts[currentIndex] || "";
              this.state.aiInterviewFinalDrafts[currentIndex] = (currentFinal + " " + finalTranscript).trim();
          }
          
          const baseFinal = this.state.aiInterviewFinalDrafts[currentIndex] || "";
          this.state.aiInterviewDrafts[currentIndex] = (baseFinal + " " + interimTranscript).trim();
          
          this.render(); 
        };

        recognition.onerror = () => { this.state.micActive = false; this.render(); };
        recognition.onend = () => { this.state.micActive = false; this.render(); };
        
        recognition.start();
        return;
      }

      if (action === "read-question") {
        const currentQ = DATA.interviewQuestions[this.state.aiInterviewIndex];
        const isAr = this.state.settings.language === "ar";
        const textToRead = isAr ? currentQ.qAr : currentQ.qEn;
        
        window.speechSynthesis.cancel(); 
        const msg = new SpeechSynthesisUtterance(textToRead);
        
        msg.lang = isAr ? 'ar-SA' : 'en-US'; 
        msg.rate = isAr ? 0.85 : 0.95; 
        
        // Hunt for premium voices
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = voices.find(v => v.lang.includes(isAr ? 'ar' : 'en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural') || v.name.includes('Siri')));
        if(bestVoice) msg.voice = bestVoice;

        window.speechSynthesis.speak(msg);
        return;
      }

      if (action === "next-interview") {
        if(window._activeRecognition) {
            window._activeRecognition.stop();
            this.state.micActive = false;
        }

        const answer = (this.state.aiInterviewDrafts[this.state.aiInterviewIndex] || "").trim();
        if (!answer) {
          this.showToast(this.state.settings.language === "ar" ? "يرجى التحدث للإجابة أولاً" : "Please speak your answer first");
          return;
        }
        
        if (this.state.aiInterviewIndex < DATA.interviewQuestions.length - 1) {
          this.state.aiInterviewIndex += 1;
          
          setTimeout(() => {
             const readBtn = document.querySelector('[data-action="read-question"]');
             if(readBtn) readBtn.click();
          }, 400);

        } else {
          const progressSafe = this.currentProgress();
          let scores;
          try {
            scores = this.scoreInterviewAnswers(this.state.aiInterviewDrafts);
          } catch (error) {
            scores = { overall: 15, feedback: [this.state.settings.language === "ar" ? "تعذر التقييم الكامل، يرجى المحاولة مرة أخرى." : "Scoring fallback applied, please try again."] };
          }
          if (progressSafe) {
            progressSafe.interview.completed = true;
            progressSafe.interview.score = scores.overall;
            progressSafe.interview.feedback = scores.feedback;
            if (progressSafe.interview.score >= 85 && !progressSafe.badges.includes("Interview Ready")) {
              progressSafe.badges.push("Interview Ready");
            }
            this.persistProgress();
          } else {
            this.state.progress["local-interview"] = {
              interview: { completed: true, score: scores.overall, feedback: scores.feedback },
              badges: [], readinessParts: { cv: 0, micro: 0, behavior: 0, plan: 0 }
            };
          }
          this.state.aiInterviewScoreDetail = scores;
          this.state.aiInterviewDone = true;
        }
        this.render();
        return;
      }

      if (action === "reset-interview") {
        this.state.aiInterviewDrafts = {};
        this.state.aiInterviewFinalDrafts = {};
        this.state.aiInterviewIndex = 0;
        this.state.aiInterviewDone = false;
        this.state.aiInterviewScoreDetail = null;
        this.state.micActive = false;
        if(window._activeRecognition) window._activeRecognition.stop();
        window.speechSynthesis.cancel();
        this.render();
        return;
      }

      if (action === "download-profile") {
        const ok = this.downloadSmartProfilePng();
        if (ok) {
          this.showToast(this.state.settings.language === "ar" ? "تم تنزيل صورة PNG بنجاح" : "PNG downloaded successfully");
        } else {
          this.showToast(this.state.settings.language === "ar" ? "تعذر تنزيل الصورة حالياً" : "Unable to download PNG right now");
        }
        return;
      }

      if (action === "save-target-role") {
        const user = this.currentUser();
        if (!user) return;
        const select = document.getElementById("profileTargetRole");
        const selected = select ? select.value : "";
        if (!selected) {
          this.showToast(this.state.settings.language === "ar" ? "اختر دوراً مستهدفاً" : "Choose a target role");
          return;
        }

        const match = DATA.jobs.find((job) => job.titleEn === selected || job.titleAr === selected);
        user.desiredRole = match ? match.titleEn : selected;
        user.targetRoleEn = match ? match.titleEn : selected;
        user.targetRoleAr = match ? match.titleAr : selected;
        this.state.selectedTargetRole = user.targetRoleEn;

        this.persistAccounts();
        this.showToast(this.state.settings.language === "ar" ? "تم حفظ الدور المستهدف" : "Target role saved");
        this.render();
        return;
      }

      if (action === "invite-candidate") {
        const candidateId = target.dataset.candidateId;
        if (candidateId) {
          this.markCandidateInvited(candidateId);
          const candidateProgress = this.state.progress[candidateId];
          if (candidateProgress && Array.isArray(candidateProgress.appliedJobs)) {
            candidateProgress.appliedJobs.forEach((jobId) => {
              this.setApplicationStatus(candidateProgress, jobId, "interview_invited");
            });
            this.persistProgress();
          }
        }
        this.showToast(this.state.settings.language === "ar" ? "تم إرسال الدعوة للمقابلة" : "Interview invite sent");
        this.render();
        return;
      }

      if (action === "set-application-status") {
        const candidateId = target.dataset.candidateId;
        const status = target.dataset.status;
        if (!candidateId || !status) return;
        const candidateProgress = this.state.progress[candidateId];
        if (!candidateProgress || !Array.isArray(candidateProgress.appliedJobs)) return;
        candidateProgress.appliedJobs.forEach((jobId) => {
          this.setApplicationStatus(candidateProgress, jobId, status);
        });
        this.persistProgress();
        this.showToast(this.state.settings.language === "ar" ? "تم تحديث حالة الطلبات" : "Application statuses updated");
        this.render();
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
              jobApplications: {},
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
        const companyUser = this.currentUser();
        const roleReq = {
          id: uid("role"),
          companyName: String(data.get("companyName") || companyUser.companyName || companyUser.name || ""),
          title: String(data.get("title") || ""),
          requiredSkills,
          years: Number(data.get("years") || 0),
          salary: String(data.get("salary") || ""),
          location: String(data.get("location") || "Riyadh")
        };
        this.state.companyRoles = [roleReq];
        this.persistCompanyRoles();
        this.showToast(this.state.settings.language === "ar" ? "تم تحديث الترتيب للمرشحين" : "Ranked candidates for this role");
        this.render();
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

    getReadinessBreakdown(userId) {
      const progress = this.state.progress[userId];
      if (!progress || !progress.readinessParts) {
        return { cv: 0, micro: 0, behavior: 0, plan: 0 };
      }
      return {
        cv: clamp(Math.round(progress.readinessParts.cv || 0), 0, 60),
        micro: clamp(Math.round(progress.readinessParts.micro || 0), 0, 25),
        behavior: clamp(Math.round(progress.readinessParts.behavior || 0), 0, 15),
        plan: clamp(Math.round(progress.readinessParts.plan || 0), 0, 10)
      };
    }

    getApplicationStatus(progress, jobId) {
      this.normalizeProgressRecord(progress);
      if (!progress || !jobId) return "none";
      if (!progress.appliedJobs.includes(jobId)) return "none";
      const explicitStatus = progress.jobApplications[jobId] && progress.jobApplications[jobId].status;
      if (explicitStatus) return explicitStatus;
      return "submitted";
    }

    setApplicationStatus(progress, jobId, status) {
      if (!progress || !jobId || !status) return;
      this.normalizeProgressRecord(progress);
      if (!progress.appliedJobs.includes(jobId)) {
        progress.appliedJobs.push(jobId);
      }
      progress.jobApplications[jobId] = {
        status,
        updatedAt: new Date().toISOString()
      };
    }

    applicationStatusLabel(status) {
      const isAr = this.state.settings.language === "ar";
      const map = {
        none: isAr ? "غير مقدم" : "Not applied",
        submitted: isAr ? "تم التقديم" : "Submitted",
        review: isAr ? "قيد الفرز" : "Screening",
        interview_invited: isAr ? "دعوة مقابلة" : "Interview invited",
        rejected: isAr ? "مرفوض" : "Rejected",
        accepted: isAr ? "تم القبول" : "Accepted"
      };
      return map[status] || map.none;
    }

    async fetchRealJobs(role = "Frontend Developer", location = "Saudi Arabia") {
      try {
        const url = `/.netlify/functions/fetch-jobs?role=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}`;
        const response = await fetch(url);
        if (!response.ok) {
          console.error("[fetch-real-jobs] API failed", response.status);
          return null;
        }
        const data = await response.json();
        if (!data || data.source === "mock") {
          console.warn("[fetch-real-jobs] Ignoring mock jobs for strict external sourcing");
          return [];
        }
        console.log("[fetch-real-jobs] Success", {
          count: data.data ? data.data.length : 0,
          source: data.source
        });
        return data.data || [];
      } catch (error) {
        console.error("[fetch-real-jobs] Error", error);
        return null;
      }
    }

    async loadRealJobsAsync() {
      try {
        this.state.jobsLoading = true;
        
        // Fetch real jobs for multiple common roles
        const roles = ["Frontend Developer", "Backend Developer", "Data Analyst", "Product Manager"];
        const allJobs = [];

        for (const role of roles) {
          const jobs = await this.fetchRealJobs(role, "Saudi Arabia");
          if (jobs && jobs.length > 0) {
            allJobs.push(...jobs);
          }
        }

        if (allJobs.length > 0) {
          this.state.realJobs = allJobs.slice(0, 50); // Limit to 50 jobs
          console.log("[load-real-jobs] Loaded", allJobs.length, "real jobs");
          this.render();
        }
      } catch (error) {
        console.error("[load-real-jobs] Error", error);
      } finally {
        this.state.jobsLoading = false;
      }
    }

    // ============================================
    // Behavioral Simulation Questions
    // ============================================

    async fetchBehavioralQuestions(role) {
      try {
        if (!role) return null;
        
        const response = await fetch(
          `/.netlify/functions/generate-behavior-questions?role=${encodeURIComponent(role)}&locale=${this.state.settings.language}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.questions || null;
      } catch (error) {
        console.error("[fetch-behavioral] Error:", error);
        return null;
      }
    }

    normalizeBehavioralQuestions(questions) {
      if (!Array.isArray(questions)) return [];

      return questions
        .map((question, index) => {
          const rawOptions = Array.isArray(question.options) ? question.options : [];
          const options = rawOptions
            .filter((option) => option && option.id)
            .map((option, optionIndex) => {
              const inferredScore = Number.isFinite(option.score)
                ? option.score
                : clamp(Math.round((((option.communication || 0) + (option.empathy || 0) + (option.problem || 0)) / 15) * 100), 0, 100);

              return {
                id: option.id || `${index + 1}-${optionIndex + 1}`,
                textEn: option.textEn || option.text || "",
                textAr: option.textAr || option.text || "",
                score: inferredScore
              };
            });

          const scenario = question.scenario || question.titleEn || question.titleAr || "";
          const questionEn = question.questionEn || question.descriptionEn || question.question || "";
          const questionAr = question.questionAr || question.descriptionAr || question.question || questionEn;

          if (!scenario || !questionEn || options.length < 2) {
            return null;
          }

          return {
            id: question.id || `q${index + 1}`,
            scenario,
            questionEn,
            questionAr,
            options,
            timeLimit: Number.isFinite(question.timeLimit) ? question.timeLimit : 120,
            skillsTested: Array.isArray(question.skillsTested)
              ? question.skillsTested
              : (Array.isArray(question.skills_tested) ? question.skills_tested : ["communication", "problem_solving"])
          };
        })
        .filter(Boolean);
    }

    getLocalBehavioralQuestions() {
      return this.normalizeBehavioralQuestions(this.getBehaviorScenarios()).slice(0, 5);
    }

    stopBehavioralTimer() {
      if (this.behavioralInterval) {
        clearInterval(this.behavioralInterval);
        this.behavioralInterval = null;
      }
    }

    startBehavioralTimer() {
      this.stopBehavioralTimer();
      if (!this.state.behavioralTestActive || !this.state.behavioralQuestions || !this.state.behavioralQuestions.length) {
        return;
      }

      this.behavioralInterval = window.setInterval(() => {
        if (!this.state.behavioralTestActive) {
          this.stopBehavioralTimer();
          return;
        }

        if (this.state.behavioralTimer > 0) {
          this.state.behavioralTimer -= 1;
          this.render();
          return;
        }

        const currentQuestion = this.state.behavioralQuestions[this.state.behavioralCurrentQuestion];
        if (currentQuestion && this.state.behavioralAnswers[currentQuestion.id] == null) {
          this.state.behavioralAnswers[currentQuestion.id] = "";
        }

        const isLastQuestion = this.state.behavioralCurrentQuestion >= this.state.behavioralQuestions.length - 1;
        if (isLastQuestion) {
          this.completeBehavioralTest({ allowUnanswered: true });
        } else {
          this.state.behavioralCurrentQuestion += 1;
          const nextQuestion = this.state.behavioralQuestions[this.state.behavioralCurrentQuestion];
          this.state.behavioralTimer = nextQuestion?.timeLimit || 120;
          this.render();
        }
      }, 1000);
    }

    async loadBehavioralQuestions() {
      const user = this.currentUser();
      if (!user) return;

      const desiredRole = user.desiredRole || user.targetRoleEn || "Frontend Developer";
      
      this.stopBehavioralTimer();
      this.state.behavioralLoading = true;
      this.state.behavioralResultReady = false;
      this.state.behavioralLatestScores = null;
      this.state.behavioralQuestions = null;
      this.state.behavioralAnswers = {};
      this.state.behavioralCurrentQuestion = 0;
      this.state.behavioralTimer = 120;
      this.state.behavioralRole = desiredRole;
      this.render();

      try {
        const questions = await this.fetchBehavioralQuestions(desiredRole);
        const normalizedQuestions = this.normalizeBehavioralQuestions(questions);
        
        if (normalizedQuestions.length > 0) {
          // Shuffle questions for randomization
          this.state.behavioralQuestions = this.shuffleArray(normalizedQuestions);
          
          // Initialize answer tracking
          this.state.behavioralQuestions.forEach((q) => {
            this.state.behavioralAnswers[q.id] = null;
          });

          this.state.behavioralCurrentQuestion = 0;
          this.state.behavioralTimer = this.state.behavioralQuestions[0]?.timeLimit || 120;
          this.state.behavioralTestActive = true;
          this.startBehavioralTimer();
          console.log("[behavioral-load] Loaded", normalizedQuestions.length, "questions for", desiredRole);
        } else {
          const fallbackQuestions = this.getLocalBehavioralQuestions();
          if (fallbackQuestions.length > 0) {
            this.state.behavioralQuestions = this.shuffleArray(fallbackQuestions);
            this.state.behavioralQuestions.forEach((q) => {
              this.state.behavioralAnswers[q.id] = null;
            });
            this.state.behavioralCurrentQuestion = 0;
            this.state.behavioralTimer = this.state.behavioralQuestions[0]?.timeLimit || 120;
            this.state.behavioralTestActive = true;
            this.startBehavioralTimer();
            this.showToast(this.state.settings.language === "ar"
              ? "تم تشغيل نسخة محلية من أسئلة الاختبار"
              : "Loaded local fallback assessment questions");
          } else {
            this.showToast(this.state.settings.language === "ar" 
              ? "لم يتمكن من تحميل الأسئلة. حاول لاحقاً."
              : "Failed to load questions. Try again later.");
          }
        }
      } catch (error) {
        console.error("[behavioral-load] Error:", error);
        const fallbackQuestions = this.getLocalBehavioralQuestions();
        if (fallbackQuestions.length > 0) {
          this.state.behavioralQuestions = this.shuffleArray(fallbackQuestions);
          this.state.behavioralQuestions.forEach((q) => {
            this.state.behavioralAnswers[q.id] = null;
          });
          this.state.behavioralCurrentQuestion = 0;
          this.state.behavioralTimer = this.state.behavioralQuestions[0]?.timeLimit || 120;
          this.state.behavioralTestActive = true;
          this.startBehavioralTimer();
          this.showToast(this.state.settings.language === "ar"
            ? "تعذر جلب الأسئلة من الخادم، تم استخدام النسخة المحلية"
            : "Server questions unavailable, using local fallback");
        } else {
          this.showToast(this.state.settings.language === "ar"
            ? "خطأ في تحميل الأسئلة"
            : "Error loading questions");
        }
      } finally {
        this.state.behavioralLoading = false;
        this.render();
      }
    }

    recordBehavioralAnswer(questionId, optionId) {
      if (this.state.behavioralAnswers && questionId && optionId) {
        this.state.behavioralAnswers[questionId] = optionId;
        console.log("[behavioral-answer] Q:", questionId, "A:", optionId);
      }
    }

    syncCurrentBehavioralAnswerFromDom() {
      if (!this.state.behavioralQuestions || !this.state.behavioralQuestions.length) return null;
      const currentQuestion = this.state.behavioralQuestions[this.state.behavioralCurrentQuestion];
      if (!currentQuestion) return null;

      const checked = document.querySelector('input[name="behavior-answer"]:checked');
      if (checked && checked.value) {
        this.recordBehavioralAnswer(currentQuestion.id, checked.value);
      }

      return this.state.behavioralAnswers[currentQuestion.id] || null;
    }

    nextBehavioralQuestion() {
      if (!this.state.behavioralQuestions) return;
      const currentAnswer = this.syncCurrentBehavioralAnswerFromDom();
      if (!currentAnswer) {
        this.showToast(this.state.settings.language === "ar" ? "اختر إجابة أولاً" : "Choose an answer first");
        return;
      }
      
      const currentIdx = this.state.behavioralCurrentQuestion;
      const nextIdx = currentIdx + 1;

      if (nextIdx < this.state.behavioralQuestions.length) {
        this.state.behavioralCurrentQuestion = nextIdx;
        this.state.behavioralTimer = this.state.behavioralQuestions[nextIdx].timeLimit || 120;
        this.startBehavioralTimer();
        this.render();
      } else {
        // All questions completed
        this.completeBehavioralTest();
      }
    }

    completeBehavioralTest(options = {}) {
      if (this.state.behavioralResultReady && !this.state.behavioralTestActive) {
        return;
      }
      const user = this.currentUser();
      if (!user) return;
      this.stopBehavioralTimer();
      const currentAnswer = this.syncCurrentBehavioralAnswerFromDom();
      const currentQuestion = this.state.behavioralQuestions
        ? this.state.behavioralQuestions[this.state.behavioralCurrentQuestion]
        : null;
      if (!currentAnswer && currentQuestion && this.state.behavioralAnswers) {
        this.state.behavioralAnswers[currentQuestion.id] = "";
      }

      // Calculate scores based on answers
      const scores = this.calculateBehavioralScores();
      this.state.behavioralLatestScores = scores;
      this.state.behavioralResultReady = true;

      // Clear test state first, then render results immediately.
      this.state.behavioralTestActive = false;
      this.state.behavioralQuestions = null;
      this.state.behavioralAnswers = {};
      this.state.behavioralCurrentQuestion = 0;
      this.state.behavioralTimer = 120;
      this.render();

      try {
        const progress = this.currentProgress();
        if (progress) {
          if (!progress.readinessParts) {
            progress.readinessParts = { cv: 0, micro: 0, behavior: 0, plan: 0 };
          }
          if (!Array.isArray(progress.badges)) {
            progress.badges = [];
          }

          // Save to progress
          progress.behavior = {
            completed: true,
            scores,
            date: new Date().toISOString(),
            desiredRole: user.desiredRole || user.targetRoleEn
          };

          // Update readiness and badges from behavioral test outcome
          const behavioralReadiness = clamp(Math.round((scores.overall / 100) * 15), 0, 15);
          progress.readinessParts.behavior = behavioralReadiness;
          if (behavioralReadiness >= 13) {
            if (!progress.badges.includes("Behavioral Ready")) {
              progress.badges.push("Behavioral Ready");
            }
          } else {
            progress.badges = progress.badges.filter((badge) => badge !== "Behavioral Ready");
          }
          this.persistProgress();
        }
      } catch (error) {
        console.error("[behavioral-complete] Persist failed:", error);
      }

      this.showToast(this.state.settings.language === "ar"
        ? "✓ تم إكمال الاختبار السلوكي"
        : "✓ Behavioral test completed");

      console.log("[behavioral-complete] Scores:", scores);
    }

    calculateBehavioralScores() {
      if (!this.state.behavioralQuestions || !this.state.behavioralAnswers) {
        return { communication: 0, empathy: 0, problem_solving: 0, overall: 0 };
      }

      const skillScores = {
        communication: [],
        empathy: [],
        problem_solving: [],
        judgment: [],
        accountability: [],
        integrity: []
      };

      // Calculate score for each skill
      this.state.behavioralQuestions.forEach((question) => {
        const answeredOptionId = this.state.behavioralAnswers[question.id];
        if (!answeredOptionId) return;

        const selectedOption = question.options.find((opt) => opt.id === answeredOptionId);
        if (!selectedOption) return;

        const score = selectedOption.score || 0;

        // Distribute score to skills tested by this question
        const skills = question.skillsTested || [];
        skills.forEach((skill) => {
          if (skillScores[skill]) {
            skillScores[skill].push(score);
          }
        });
      });

      // Average scores per skill (out of 100)
      const averages = {};
      Object.keys(skillScores).forEach((skill) => {
        const scores = skillScores[skill];
        if (scores.length > 0) {
          averages[skill] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        } else {
          averages[skill] = 0;
        }
      });

      // Calculate overall score (average of key skills)
      const keySkills = ["communication", "problem_solving", "accountability"];
      const overallScore = Math.round(
        keySkills.reduce((sum, skill) => sum + (averages[skill] || 0), 0) / keySkills.length
      );

      return {
        communication: averages.communication || 0,
        empathy: averages.empathy || 0,
        problem_solving: averages.problem_solving || 0,
        integrity: averages.integrity || 0,
        accountability: averages.accountability || 0,
        overall: overallScore
      };
    }

    shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    getMatchesForUser(user) {
      const skills = (user.topSkills || []).map((item) => item.toLowerCase());
      // LinkedIn jobs for everyone; Sara demo account can fall back to local demo jobs.
      const jobsToMatch = this.state.realJobs && this.state.realJobs.length > 0
        ? this.state.realJobs
        : (this.isSaraDemoUser(user) ? DATA.jobs : []);
      
      return jobsToMatch.map((job) => {
        const matchedSkills = job.skills.filter((skill) => skills.includes(skill.toLowerCase()));
        const missingSkills = job.skills.filter((skill) => !skills.includes(skill.toLowerCase()));
        const match = job.skills.length > 0 
          ? clamp(Math.round((matchedSkills.length / job.skills.length) * 100), 15, 98)
          : 50;
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
      const targetRole = this.getProfileTargetRole(user).toLowerCase();
      const matches = this.getMatchesForUser(user);
      const targetMatch = matches.find((item) => {
        const roleLabel = String(this.jobTitle(item.job) || "").toLowerCase();
        return roleLabel === targetRole || roleLabel.includes(targetRole) || targetRole.includes(roleLabel);
      }) || matches[0];
      if (!targetMatch) return [];
      const isAr = this.state.settings.language === "ar";
      return targetMatch.missingSkills.map((skill, index) => ({
        skill,
        current: index === 0 ? "20%" : "35%",
        target: "85%",
        priority: index === 0 ? (isAr ? "عالية" : "High") : (isAr ? "متوسطة" : "Medium"),
        impact: index === 0
          ? (isAr ? "+12 للجاهزية" : "+12 readiness")
          : (isAr ? "+7 للجاهزية" : "+7 readiness")
      }));
    }

    getLearningSuggestions(skill) {
      const normalized = String(skill || "").toLowerCase();
      const q = encodeURIComponent(String(skill || "").trim());
      const satrSearch = `https://satr.codes/search?q=${q}`;
      const youtubeSearch = `https://www.youtube.com/results?search_query=${q}`;
      const docsSearch = `https://www.google.com/search?q=${encodeURIComponent(`${skill} official documentation`)}`;
      const maps = {
        "data analysis": [
          {
            sourceAr: "منصة سطر",
            sourceEn: "Satr Platform",
            url: "https://satr.codes",
            noteAr: "ابدأ بمسار تحليل البيانات التأسيسي لفهم المفاهيم بشكل مرتب.",
            noteEn: "Start with a structured data-analysis foundation track."
          },
          {
            sourceAr: "YouTube",
            sourceEn: "YouTube",
            url: "https://www.youtube.com/results?search_query=data+analysis+tutorial",
            noteAr: "ابحث عن شروحات تطبيقية على مجموعات بيانات حقيقية وتمارين عملية.",
            noteEn: "Use practical walkthroughs on real datasets and exercises."
          },
          {
            sourceAr: "Kaggle",
            sourceEn: "Kaggle",
            url: "https://www.kaggle.com/learn",
            noteAr: "تدرّب على ملفات جاهزة ومسابقات بسيطة لبناء فهم تطبيقي أسرع.",
            noteEn: "Practice on starter datasets and simple notebooks."
          }
        ],
        sql: [
          {
            sourceAr: "منصة سطر",
            sourceEn: "Satr Platform",
            url: "https://satr.codes",
            noteAr: "خذ مسار SQL من البداية حتى الاستعلامات المتوسطة والمتقدمة.",
            noteEn: "Use a guided SQL path from basics to intermediate queries."
          },
          {
            sourceAr: "SQLBolt",
            sourceEn: "SQLBolt",
            url: "https://sqlbolt.com/",
            noteAr: "تمارين قصيرة وسريعة لتثبيت المفاهيم الأساسية خطوة بخطوة.",
            noteEn: "Short guided drills to reinforce core concepts."
          },
          {
            sourceAr: "Mode SQL Tutorial",
            sourceEn: "Mode SQL Tutorial",
            url: "https://mode.com/sql-tutorial/",
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
          url: satrSearch,
          noteAr: `ابحث عن مسار تأسيسي في ${skill} لبناء القاعدة بشكل مرتب.`,
          noteEn: `Start with a structured foundation path for ${skill}.`
        },
        {
          sourceAr: "YouTube",
          sourceEn: "YouTube",
          url: youtubeSearch,
          noteAr: `ركّز على شروحات تطبيقية وتمارين قصيرة حول ${skill}.`,
          noteEn: `Focus on practical tutorials and short exercises for ${skill}.`
        },
        {
          sourceAr: "المراجع الرسمية",
          sourceEn: "Official docs",
          url: docsSearch,
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
      const scored = this.state.accounts.students.map((student) => {
        const studentSkills = (student.topSkills || []).map((item) => item.toLowerCase());
        const matchedSkills = roleReq.requiredSkills.filter((skill) => {
          const s = skill.toLowerCase();
          return studentSkills.some((stu) => stu.includes(s) || s.includes(stu));
        });
        const skillMatch = roleReq.requiredSkills.length ? Math.round((matchedSkills.length / roleReq.requiredSkills.length) * 100) : 0;
        const readiness = this.getReadiness(student.id);
        const studentRole = (student.targetRoleEn || "").toLowerCase();
        const roleTitle = (roleReq.title || "").toLowerCase();
        const titleMatch = roleTitle && studentRole.includes(roleTitle) ? 100 : (roleTitle && roleTitle.split(" ").some((word) => word && studentRole.includes(word)) ? 70 : 40);
        const studentCity = (student.city || "").toLowerCase();
        const roleCity = (roleReq.location || "").toLowerCase();
        const cityMatch = roleCity ? (studentCity === roleCity ? 100 : (studentCity && roleCity && studentCity.split(" ").some((part) => roleCity.includes(part)) ? 60 : 35)) : 50;
        const overall = Math.round(skillMatch * 0.45 + titleMatch * 0.25 + readiness * 0.2 + cityMatch * 0.1);
        return {
          student,
          readiness,
          skillMatch,
          titleMatch,
          cityMatch,
          overall,
          matchedSkills,
          missingSkills: roleReq.requiredSkills.filter((skill) => !studentSkills.includes(skill.toLowerCase()))
        };
      });

      return scored.sort((a, b) => {
        if (b.overall !== a.overall) return b.overall - a.overall;
        if (b.skillMatch !== a.skillMatch) return b.skillMatch - a.skillMatch;
        if (b.titleMatch !== a.titleMatch) return b.titleMatch - a.titleMatch;
        if (b.readiness !== a.readiness) return b.readiness - a.readiness;
        return b.cityMatch - a.cityMatch;
      });
    }

    getFilteredCandidates(ranked) {
      const f = this.state.companyCandidateFilters || { city: "all", minReadiness: 0, minYears: 0, skill: "all" };
      return ranked.filter((entry) => {
        const cityPass = f.city === "all" || (entry.student.city || "") === f.city;
        const readinessPass = entry.readiness >= Number(f.minReadiness || 0);
        const yearsPass = Number(entry.student.experience || 0) >= Number(f.minYears || 0);
        const skillPass = f.skill === "all" || (entry.student.topSkills || []).some((skill) => skill === f.skill);
        return cityPass && readinessPass && yearsPass && skillPass;
      });
    }

    topBar() {
      const user = this.currentUser();
      const isPublic = !user;
      const navClass = isPublic ? "topnav" : "topnav auth-nav";
      const navActive = (name) => this.state.route.name === name ? "active" : "";
      const serviceLinks = user
        ? (user.role === "student"
          ? [
              ["/student-dashboard", this.t("dashboard")],
              ["/upload", this.t("uploadCv")],
              ["/jobs", this.t("jobs")],
              ["/plan", this.t("plan")],
              ["/market-shift", this.state.settings.language === "ar" ? "توقعات السوق" : "Market Shift Predictor"],
              ["/micro-labs-test", this.state.settings.language === "ar" ? "مختبر المهارات" : "Micro Labs Test"],
              ["/interview", this.t("interview")]
            ]
          : [
              ["/company-dashboard", this.t("dashboard")],
              ["/market-shift", this.state.settings.language === "ar" ? "توقعات السوق" : "Market Shift Predictor"],
              ["/candidates", this.t("candidates")],
              ["/assessments", this.t("assessments")]
            ])
        : [];
      return `
        <header class="topbar glass">
          <div class="topbar-main">
            <button class="brand" data-nav="/">
              <img class="brand-logo light-logo" src="./assets/logo.PNG" alt="${this.t("brand")}">
              <img class="brand-logo dark-logo" src="./assets/Dark-Logo.png" alt="${this.t("brand")}">
            </button>
            ${user && user.role === "student" ? `<button class="btn btn-ghost ${navActive("profile")}" data-nav="/profile">${this.t("profile")}</button>` : ""}
            <nav class="${navClass}">
            ${isPublic ? `
              <button class="${navActive("plans")}" data-nav="/plans">${this.t("navPlans")}</button>
              <button class="${navActive("about")}" data-nav="/about">${this.t("navAbout")}</button>
            ` : `
              <button class="${navActive("plans")}" data-nav="/plans">${this.t("navPlans")}</button>
              <button class="${navActive("about")}" data-nav="/about">${this.t("navAbout")}</button>
              <div class="services-menu ${this.state.servicesMenuOpen ? "open" : ""}" data-services-menu>
                <button class="services-trigger" data-action="toggle-services-menu">
                  <span>${this.state.settings.language === "ar" ? "الخدمات" : "Services"}</span>
                  <span class="services-trigger-arrow" aria-hidden="true"></span>
                </button>
                <div class="services-dropdown">
                  ${serviceLinks.map(([route, label]) => {
                    const routeName = String(route).replace(/^\//, "").split("/")[0];
                    return `<button class="services-dropdown-item ${navActive(routeName)}" data-nav="${route}">${label}</button>`;
                  }).join("")}
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
            <span class="eyebrow">${this.state.settings.language === "ar" ? "الجاهزية المهنية السعودية بالذكاء الاصطناعي" : "Saudi AI Career Readiness"}</span>
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
            <h3>${this.state.settings.language === "ar" ? "مطابقة وظائف ذكية" : "Smart Job Matching"}</h3>
            <p>${this.state.settings.language === "ar" ? "مطابقة فورية مع الوظائف وإظهار نسبة التوافق لكل مسار." : "Instant role matching with clear percentages for each path."}</p>
            <div class="simple-list tight-list">
              <span>UI Designer - 70%</span>
              <span>Front-End Developer - 45%</span>
            </div>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">03</span>
            <h3>${this.state.settings.language === "ar" ? "تحليل فجوات المهارات" : "Skill Gap Analysis"}</h3>
            <p>${this.state.settings.language === "ar" ? "معرفة النواقص التي ترفع فرص التوظيف بشكل مباشر." : "See the missing skills that most improve hiring potential."}</p>
            <div class="simple-list tight-list">
              <span>${this.state.settings.language === "ar" ? "جاهز 68% لوظيفة Software Engineer" : "68% ready for Software Engineer"}</span>
              <span>${this.state.settings.language === "ar" ? "تنقصك: Advanced SQL, System Design" : "Missing: Advanced SQL, System Design"}</span>
            </div>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">04</span>
            <h3>${this.state.settings.language === "ar" ? "مختبرات مصغّرة" : "Micro Labs"}</h3>
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
        <section class="feature-grid services-grid">
          <article class="info-card feature-card">
            <span class="feature-kicker">07</span>
            <h3>${this.state.settings.language === "ar" ? "للمستخدم" : "For candidates"}</h3>
            <p>${this.state.settings.language === "ar" ? "رحلة واضحة ومباشرة: افهم مستواك، طوّر الفجوات، ثم أثبت المهارة." : "A direct journey: understand your level, close gaps, then validate skills."}</p>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">08</span>
            <h3>${this.state.settings.language === "ar" ? "لأقسام الموارد البشرية" : "For HR teams"}</h3>
            <p>${this.state.settings.language === "ar" ? "ترتيب أوضح للمرشحين بناءً على الجاهزية والمهارات الموثقة." : "A clearer ranking based on readiness and verified skills."}</p>
          </article>
          <article class="info-card feature-card">
            <span class="feature-kicker">09</span>
            <h3>${this.state.settings.language === "ar" ? "متوافق مع رؤية 2030" : "Aligned with Vision 2030"}</h3>
            <p>${this.state.settings.language === "ar" ? "رفع قابلية التوظيف، تسريع المواءمة بين التعليم وسوق العمل، وتمكين المواهب الرقمية الوطنية." : "Improving employability, tightening education-to-market alignment, and enabling local digital talent."}</p>
          </article>
        </section>
      `;
    }

    siteFooter() {
      if (this.state.settings.language === "ar") {
        return `
          <footer class="site-footer">
            <div class="site-footer-links">
              <a href="/contact" data-nav="/contact">تواصل معنا</a>
              <span class="footer-sep">|</span>
              <a href="/faq" data-nav="/faq">الأسئلة الشائعة</a>
              <span class="footer-sep">|</span>
              <a href="/privacy" data-nav="/privacy">الخصوصية</a>
              <span class="footer-sep">|</span>
              <a href="/terms" data-nav="/terms">الشروط والأحكام</a>
            </div>
          </footer>
        `;
      }
      return `
        <footer class="site-footer">
          <div class="site-footer-links">
            <a href="/contact" data-nav="/contact">Contact Us</a>
            <span class="footer-sep">|</span>
            <a href="/faq" data-nav="/faq">FAQ</a>
            <span class="footer-sep">|</span>
            <a href="/privacy" data-nav="/privacy">Privacy</a>
            <span class="footer-sep">|</span>
            <a href="/terms" data-nav="/terms">Terms & Conditions</a>
          </div>
        </footer>
      `;
    }

    plansPage() {
      const user = this.currentUser();
      const selectedPlan = (user && user.selectedPlan) || "";
      const isAr = this.state.settings.language === "ar";
      return `
        <section class="pricing-hero">
          <div class="pricing-hero-copy">
            <span class="pricing-kicker">${isAr ? "خطط واضحة بدون تعقيد" : "Simple plans, clear value"}</span>
            <h1>${isAr ? "اختر الخطة المناسبة لمسارك" : "Choose the plan that fits your path"}</h1>
            <p>${isAr ? "سواء كنت طالباً تبحث عن أول فرصة، أو شركة تريد فرزاً أدق للمرشحين، تمهيد يقدم لك خطة مناسبة مع أدوات جاهزة للتنفيذ." : "Whether you are a student targeting your first role or a company seeking sharper screening, Tamheed gives you a plan with execution-ready tools."}</p>
            ${user ? `<div class="pricing-current-plan"><strong>${isAr ? "الخطة الحالية:" : "Current plan:"}</strong> ${selectedPlan ? selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1) : (isAr ? "لم يتم الاختيار بعد" : "Not selected yet")}</div>` : ""}
            <div class="pricing-hero-metrics">
              <div>
                <strong>+40%</strong>
                <small>${isAr ? "متوسط تحسن الجاهزية" : "Average readiness uplift"}</small>
              </div>
              <div>
                <strong>3x</strong>
                <small>${isAr ? "سرعة أوضح في الفرز" : "Faster screening clarity"}</small>
              </div>
              <div>
                <strong>100%</strong>
                <small>${isAr ? "مسار تطوير عملي" : "Actionable development flow"}</small>
              </div>
            </div>
          </div>
        </section>

        <section class="pricing-grid">
          <article class="pricing-card">
            <span class="pricing-pill">${isAr ? "للأفراد" : "Individuals"}</span>
            <h3>Starter</h3>
            <p class="pricing-price">49 <span>SAR</span></p>
            <p class="pricing-desc">${isAr ? "بداية عملية لفهم مستواك المهني." : "A practical start to understand your career baseline."}</p>
            <ul class="pricing-feature-list">
              <li>${isAr ? "تحليل سيرة ذاتية واحد" : "1 CV analysis"}</li>
              <li>${isAr ? "مطابقة حتى 5 وظائف" : "Up to 5 job matches"}</li>
              <li>${isAr ? "خطة تطوير 4 أسابيع" : "4-week development plan"}</li>
            </ul>
            ${user
              ? `<button class="btn ${selectedPlan === "starter" ? "btn-primary" : "btn-ghost"}" data-action="choose-plan|starter">${selectedPlan === "starter" ? (isAr ? "تم الاختيار" : "Selected") : (isAr ? "اختر Starter" : "Choose Starter")}</button>`
              : `<button class="btn btn-ghost" data-nav="/register">${isAr ? "ابدأ الآن" : "Get started"}</button>`}
          </article>

          <article class="pricing-card pricing-card-featured">
            <span class="pricing-pill pricing-pill-hot">${isAr ? "الأكثر طلباً" : "Most popular"}</span>
            <h3>Pro</h3>
            <p class="pricing-price">149 <span>SAR</span></p>
            <p class="pricing-desc">${isAr ? "الخطة المتكاملة للجاهزية والتوظيف." : "The complete readiness and hiring plan."}</p>
            <ul class="pricing-feature-list">
              <li>${isAr ? "كل مزايا Starter" : "Everything in Starter"}</li>
              <li>${isAr ? "تحليل فجوات المهارات بالذكاء الاصطناعي" : "AI-powered skill gap analysis"}</li>
              <li>${isAr ? "محاكاة مقابلة وملف ذكي قابل للمشاركة" : "Interview simulation + shareable smart profile"}</li>
            </ul>
            ${user
              ? `<button class="btn btn-primary" data-action="choose-plan|pro">${selectedPlan === "pro" ? (isAr ? "تم الاختيار" : "Selected") : (isAr ? "اختر Pro" : "Choose Pro")}</button>`
              : `<button class="btn btn-primary" data-nav="/register">${isAr ? "اختر Pro" : "Choose Pro"}</button>`}
          </article>

          <article class="pricing-card">
            <span class="pricing-pill">${isAr ? "للشركات" : "Companies"}</span>
            <h3>Enterprise</h3>
            <p class="pricing-price">${isAr ? "حسب الطلب" : "Custom"}</p>
            <p class="pricing-desc">${isAr ? "حل متقدم للفرق التي توظف بشكل مكثف." : "Advanced setup for high-volume hiring teams."}</p>
            <ul class="pricing-feature-list">
              <li>${isAr ? "ترتيب مرشحين حسب الجاهزية" : "Readiness-based candidate ranking"}</li>
              <li>${isAr ? "اختبارات تقييم مولدة حسب الدور" : "Role-specific generated assessments"}</li>
              <li>${isAr ? "لوحة تحكم وتقارير لفريق التوظيف" : "Hiring team dashboard and reports"}</li>
            </ul>
            ${user
              ? `<button class="btn ${selectedPlan === "enterprise" ? "btn-primary" : "btn-ghost"}" data-action="choose-plan|enterprise">${selectedPlan === "enterprise" ? (isAr ? "تم الاختيار" : "Selected") : (isAr ? "اختر Enterprise" : "Choose Enterprise")}</button>`
              : `<button class="btn btn-ghost" data-nav="/contact">${isAr ? "تواصل معنا" : "Talk to sales"}</button>`}
          </article>
        </section>

        <section class="pricing-compare">
          <div class="pricing-compare-head">
            <h3>${this.state.settings.language === "ar" ? "مقارنة سريعة بين الخطط" : "Quick plan comparison"}</h3>
          </div>
          <div class="pricing-compare-table">
            <div class="pricing-compare-row pricing-compare-labels">
              <span>${this.state.settings.language === "ar" ? "الميزة" : "Feature"}</span>
              <span>Starter</span>
              <span>Pro</span>
              <span>Enterprise</span>
            </div>
            <div class="pricing-compare-row">
              <span>${this.state.settings.language === "ar" ? "تحليل السيرة الذاتية" : "CV analysis"}</span>
              <span>1x</span>
              <span>${this.state.settings.language === "ar" ? "غير محدود" : "Unlimited"}</span>
              <span>${this.state.settings.language === "ar" ? "غير محدود" : "Unlimited"}</span>
            </div>
            <div class="pricing-compare-row">
              <span>${this.state.settings.language === "ar" ? "مطابقة الوظائف" : "Job matching"}</span>
              <span>${this.state.settings.language === "ar" ? "أساسي" : "Basic"}</span>
              <span>${this.state.settings.language === "ar" ? "متقدم" : "Advanced"}</span>
              <span>${this.state.settings.language === "ar" ? "متقدم + مخصص" : "Advanced + custom"}</span>
            </div>
            <div class="pricing-compare-row">
              <span>${this.state.settings.language === "ar" ? "محاكاة المقابلات" : "Interview simulation"}</span>
              <span>—</span>
              <span>${this.state.settings.language === "ar" ? "نعم" : "Yes"}</span>
              <span>${this.state.settings.language === "ar" ? "نعم" : "Yes"}</span>
            </div>
            <div class="pricing-compare-row">
              <span>${this.state.settings.language === "ar" ? "لوحة الشركات" : "Company dashboard"}</span>
              <span>—</span>
              <span>${this.state.settings.language === "ar" ? "محدودة" : "Limited"}</span>
              <span>${this.state.settings.language === "ar" ? "كاملة" : "Full"}</span>
            </div>
          </div>
        </section>

        <section class="pricing-cta">
          <div class="pricing-cta-copy">
            <h3>${this.state.settings.language === "ar" ? "مستعد تبدأ؟" : "Ready to start?"}</h3>
            <p>${this.state.settings.language === "ar" ? "ابدأ بخطة مناسبة اليوم، وطور جاهزيتك بشكل واضح خطوة بخطوة." : "Start with the right plan today and improve your readiness step by step."}</p>
          </div>
          <div class="pricing-cta-actions">
            <button class="btn btn-primary" data-nav="/register">${this.state.settings.language === "ar" ? "إنشاء حساب" : "Create account"}</button>
            <button class="btn btn-ghost" data-nav="/contact">${this.state.settings.language === "ar" ? "طلب عرض للشركات" : "Request enterprise demo"}</button>
          </div>
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
            <h3>${this.state.settings.language === "ar" ? "البريد الإلكتروني" : "Email"}</h3>
            <p>hello@tamheed.demo</p>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "الموقع" : "Location"}</h3>
            <p>Riyadh, Saudi Arabia</p>
          </article>
        </section>
      `;
    }

    faqPage() {
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "الأسئلة الشائعة" : "FAQ"}</h1>
          <p>${this.state.settings.language === "ar" ? "إجابات سريعة على أكثر الأسئلة المتكررة." : "Quick answers to common questions."}</p>
        </section>
        <section class="cards">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "كيف أبدأ؟" : "How do I start?"}</h3>
            <p>${this.state.settings.language === "ar" ? "أنشئ حساباً، ارفع سيرتك الذاتية، ثم راجع نتائج التحليل وخطة التطوير." : "Create an account, upload your CV, then review analysis and development plan."}</p>
          </article>
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "هل بياناتي آمنة؟" : "Is my data secure?"}</h3>
            <p>${this.state.settings.language === "ar" ? "نلتزم بممارسات حماية البيانات ولا نشاركها بدون إذن." : "We follow data protection practices and do not share data without consent."}</p>
          </article>
        </section>
      `;
    }

    privacyPage() {
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
          <p>${this.state.settings.language === "ar" ? "نوضح كيفية جمع البيانات واستخدامها داخل المنصة." : "How data is collected and used inside the platform."}</p>
        </section>
        <section class="cards">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "استخدام البيانات" : "Data Usage"}</h3>
            <p>${this.state.settings.language === "ar" ? "تُستخدم بيانات السيرة والتحليل لتحسين التوصيات وخطة التطوير فقط." : "CV and analysis data are used to improve recommendations and development plans only."}</p>
          </article>
        </section>
      `;
    }

    termsPage() {
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</h1>
          <p>${this.state.settings.language === "ar" ? "الشروط المنظمة لاستخدام المنصة والخدمات." : "Terms governing platform and service usage."}</p>
        </section>
        <section class="cards">
          <article class="info-card">
            <h3>${this.state.settings.language === "ar" ? "الاستخدام المقبول" : "Acceptable Use"}</h3>
            <p>${this.state.settings.language === "ar" ? "يجب استخدام المنصة بشكل مهني وعدم إدخال معلومات مضللة." : "Use the platform professionally and avoid misleading information."}</p>
          </article>
        </section>
      `;
    }

    stateCard(message, title = "") {
      return `
        <section class="info-card">
          ${title ? `<h3>${title}</h3>` : ""}
          <p class="muted">${message}</p>
        </section>
      `;
    }

    notFoundPage() {
      return this.stateCard(
        this.state.settings.language === "ar"
          ? "الصفحة غير موجودة. تقدر ترجع للرئيسية من الشعار بالأعلى."
          : "Page not found. You can return home using the logo above.",
        "404"
      );
    }

   microLabsTestPage() {
      return `
        <div style="width: 100%; height: calc(100vh - 80px); border-radius: 16px; overflow: hidden; background: transparent; display: flex; flex-direction: column;">
            <iframe src="microlab.html" style="width: 100%; height: 100%; border: none; flex: 1;" title="Tamheed Microlab"></iframe>
        </div>
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
      const readinessParts = this.getReadinessBreakdown(user.id);
      const baselineReadiness = clamp(readiness - readinessParts.plan, 0, 100);
      const readinessDelta = readiness - baselineReadiness;
      const targetRoleLabel = this.getProfileTargetRole(user);
      const onboardingSteps = [
        { done: Boolean(progress.cvUploaded), labelAr: "رفع السيرة الذاتية", labelEn: "Upload CV" },
        { done: Boolean(targetRoleLabel), labelAr: "تحديد الدور المستهدف", labelEn: "Set target role" },
        { done: Boolean((progress.appliedJobs || []).length > 0), labelAr: "التقديم على وظيفة", labelEn: "Apply to a role" }
      ];
      const onboardingCompleted = onboardingSteps.filter((step) => step.done).length;
      const matchById = new Map(this.getMatchesForUser(user).map((entry) => [entry.job.id, entry]));
      const appliedEntries = (progress.appliedJobs || [])
        .map((jobId) => matchById.get(jobId))
        .filter(Boolean)
        .slice(0, 4);
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
              <article class="student-surface-card">
                <div class="dashboard-section-head">
                  <div>
                    <h3>${this.state.settings.language === "ar" ? "البدء السريع" : "Quick start"}</h3>
                    <p>${this.state.settings.language === "ar" ? "3 خطوات واضحة لفتح كل مزايا التوظيف والتوصيات." : "Three clear steps to unlock job matching and recommendations."}</p>
                  </div>
                  <span class="score-pill">${onboardingCompleted}/3</span>
                </div>
                <div class="student-onboarding-list">
                  ${onboardingSteps.map((step, index) => `
                    <div class="student-onboarding-item ${step.done ? "done" : ""}">
                      <strong>${this.state.settings.language === "ar" ? `الخطوة ${index + 1}` : `Step ${index + 1}`}</strong>
                      <small>${this.state.settings.language === "ar" ? step.labelAr : step.labelEn}</small>
                      <span>${step.done ? "✓" : "○"}</span>
                    </div>
                  `).join("")}
                </div>
              </article>
              <article class="student-surface-card">
                <div class="dashboard-section-head">
                  <div>
                    <h3>${this.state.settings.language === "ar" ? "الطلبات المقدمة" : "Submitted applications"}</h3>
                    <p>${this.state.settings.language === "ar" ? "الشركات التي قدمتِ عليها وحالة كل طلب." : "Companies you applied to and the current status of each application."}</p>
                  </div>
                  <button class="btn btn-ghost" data-nav="/jobs">${this.state.settings.language === "ar" ? "تصفّح الوظائف" : "Browse jobs"}</button>
                </div>
                <div class="student-application-stack">
                  ${appliedEntries.length ? appliedEntries.map((item) => `
                    <div class="student-application-card">
                      <div>
                        <strong>${item.job.company}</strong>
                        <small>${this.jobTitle(item.job)}</small>
                      </div>
                      <span class="application-status-chip ${this.getApplicationStatus(progress, item.job.id)}">
                        ${this.applicationStatusLabel(this.getApplicationStatus(progress, item.job.id))}
                      </span>
                    </div>
                  `).join("") : `
                    <div class="student-application-empty">
                      <p class="muted">${this.state.settings.language === "ar" ? "ما عندك طلبات حتى الآن. ابدئي من صفحة الوظائف." : "No applications yet. Start by applying from the jobs page."}</p>
                    </div>
                  `}
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
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "تغير الجاهزية هذا الأسبوع" : "Readiness change this week"}</span>
                <strong>${readinessDelta >= 0 ? "+" : ""}${readinessDelta}%</strong>
                <p>${this.state.settings.language === "ar"
                  ? `الأساس ${baselineReadiness}%، وارتفعت الجاهزية عبر تقدّم الخطة إلى ${readiness}%.`
                  : `Baseline ${baselineReadiness}%, improved to ${readiness}% mainly from plan progress.`}</p>
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
      const fitScore = cvData && cvData.aiInsights && Number.isFinite(cvData.aiInsights.job_fit_score)
        ? cvData.aiInsights.job_fit_score
        : (cvData && cvData.scores && Number.isFinite(cvData.scores.TotalScore) ? cvData.scores.TotalScore : null);
      const fitTone = fitScore === null ? "" : (fitScore >= 70 ? "good" : (fitScore >= 50 ? "warn" : "risk"));
      return `
        <section class="page-head">
          <h1>${this.t("uploadCv")}</h1>
          <p>${this.state.settings.language === "ar" ? "ارفع ملف PDF لتحليل السيرة الذاتية." : "Upload a PDF to analyze your CV."}</p>
        </section>
        <section class="cards upload-layout">
          <article class="dropzone upload-dropzone-card ${this.state.cvUploadPending ? "loading" : ""}">
            <div class="dropzone-inner upload-dropzone-inner upload-dropzone-inner-compact">
              <div class="upload-card-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "الخطوة 1" : "Step 1"}</span>
                <h3>${this.state.settings.language === "ar" ? "رفع ملف السيرة" : "Upload CV PDF"}</h3>
              </div>
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
              <div class="upload-results-head-row">
                <div>
                  <span class="hero-summary-label">${this.state.settings.language === "ar" ? "الخطوة 2" : "Step 2"}</span>
                  <h3>${this.state.settings.language === "ar" ? "نتائج التحليل" : "Analysis Results"}</h3>
                </div>
                ${fitScore !== null ? `<span class="upload-fit-pill ${fitTone}">${this.state.settings.language === "ar" ? "الجاهزية" : "Readiness"} ${fitScore}%</span>` : ""}
              </div>
              <p>${this.state.settings.language === "ar" ? "هنا تظهر نقاط القوة، الفجوات، والخطوات العملية المقترحة." : "Strengths, gaps, and practical next steps appear here."}</p>
            </div>
            ${this.state.cvUploadPending ? `
              <div class="upload-skeleton">
                <span class="upload-skeleton-line w-90"></span>
                <span class="upload-skeleton-line w-70"></span>
                <div class="upload-skeleton-grid">
                  <span class="upload-skeleton-card"></span>
                  <span class="upload-skeleton-card"></span>
                </div>
                <span class="upload-skeleton-line w-95"></span>
              </div>
            ` : cvData ? `
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
        const sortedMatches = [...matches].sort((a, b) => b.match - a.match);
        const isSaraDemo = this.isSaraDemoUser(user);
        const topMatch = sortedMatches[0] || null;
        const strongMatches = sortedMatches.filter((item) => item.match >= 70).length;
        const needsCv = !progress || !progress.cvUploaded;
        const applyDisabledReason = this.state.settings.language === "ar" ? "حمّل سيرتك الذاتية أولاً" : "Upload your CV first";
        return `
          <section class="page-head">
            <h1>${this.state.settings.language === "ar" ? "المطابقة الذكية للوظائف" : "Smart Job Matching"}</h1>
            <p>${this.state.settings.language === "ar" ? "فلتر النتائج حسب المدينة، نوع الدور، المهارة، ونسبة المطابقة." : "Filter by city, role type, skill, and match percentage."}</p>
            ${this.state.realJobs && this.state.realJobs.length > 0 ? `<div class="state-note success"><strong>✓ ${this.state.settings.language === "ar" ? "وظائف LinkedIn" : "LinkedIn Jobs Loaded"}</strong> - ${this.state.realJobs.length} ${this.state.settings.language === "ar" ? "وظيفة من LinkedIn" : "positions from LinkedIn"}</div>` : this.state.jobsLoading ? `<div class="state-note warn"><strong>⏳ ${this.state.settings.language === "ar" ? "جاري التحميل" : "Loading"}</strong> - ${this.state.settings.language === "ar" ? "جاري تحميل وظائف LinkedIn..." : "Loading LinkedIn jobs..."}</div>` : ""}
            ${needsCv ? `<div class="state-note error">${this.state.settings.language === "ar" ? "حمّل سيرتك أولاً لتتمكن من التقديم." : "Upload your CV first to apply for jobs."}</div>` : ""}
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
          <section class="cards jobs-match-grid jobs-match-list jobs-section">
              ${sortedMatches.length ? sortedMatches.map((item) => `
                <article class="job-card jobs-match-card">
                  <div class="job-card-head">
                    <div>
                      <h3>${this.jobTitle(item.job)}</h3>
                    <p>${item.job.company} · ${item.job.city}</p>
                  </div>
                  <div class="jobs-score-stack">
                    <span class="score-pill">${item.match}%</span>
                    <span class="jobs-trend ${item.match >= 70 ? "up" : "down"}">${item.match >= 70 ? "▲" : "▼"} ${item.match >= 70 ? (this.state.settings.language === "ar" ? "ممتاز" : "Strong") : (this.state.settings.language === "ar" ? "أقل" : "Lower")}</span>
                  </div>
                </div>
                <p>${this.state.settings.language === "ar" ? item.job.descriptionAr : item.job.descriptionEn}</p>
                <div class="chip-row">${item.job.skills.map((skill) => `<span class="chip">${skill}</span>`).join("")}</div>
                <div class="job-meta">
                  <span>${item.job.salary}</span>
                  <span>${item.job.type}</span>
                  ${this.getApplicationStatus(progress, item.job.id) !== "none" ? `<span>${this.applicationStatusLabel(this.getApplicationStatus(progress, item.job.id))}</span>` : ""}
                  </div>
                  <div class="actions-row">
                    <button class="btn btn-ghost" data-nav="/job/${item.job.id}">${this.state.settings.language === "ar" ? "التفاصيل" : "Details"}</button>
                    <button class="btn btn-primary" data-action="apply-job" data-job-id="${item.job.id}" ${needsCv ? "disabled" : ""} ${needsCv ? `title="${applyDisabledReason}"` : ""}>${this.getApplicationStatus(progress, item.job.id) === "none" ? this.t("apply") : this.applicationStatusLabel(this.getApplicationStatus(progress, item.job.id))}</button>
                  </div>
                </article>
              `).join("") : this.stateCard(
                isSaraDemo
                  ? (this.state.settings.language === "ar" ? "لا توجد نتائج مطابقة للفلترة الحالية." : "No jobs match the current filters.")
                  : (this.state.jobsLoading
                    ? (this.state.settings.language === "ar" ? "جاري تحميل وظائف LinkedIn..." : "Loading LinkedIn jobs...")
                    : (this.state.settings.language === "ar" ? "لا توجد وظائف LinkedIn متاحة حالياً." : "No LinkedIn jobs available right now.")),
                this.state.settings.language === "ar" ? "لا توجد نتائج حالياً" : "No results yet"
              )}
            </section>
        </div>
      `;
    }

      jobDetailsPage(jobId) {
        const user = this.currentUser();
        const progress = this.currentProgress();
      const item = this.getMatchesForUser(user).find((entry) => entry.job.id === jobId);
      if (!item) {
          return this.stateCard(this.state.settings.language === "ar" ? "الوظيفة غير موجودة." : "Job not found.");
      }
      const needsCv = !progress || !progress.cvUploaded;
      const applyDisabledReason = this.state.settings.language === "ar" ? "حمّل سيرتك الذاتية أولاً" : "Upload your CV first";
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
                <button class="btn btn-primary" data-action="apply-job" data-job-id="${item.job.id}" ${needsCv ? "disabled" : ""} ${needsCv ? `title="${applyDisabledReason}"` : ""}>${this.getApplicationStatus(progress, item.job.id) === "none" ? this.t("apply") : this.applicationStatusLabel(this.getApplicationStatus(progress, item.job.id))}</button>
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
            <!-- CV upload area: allow student to upload CV while viewing job details -->
            <article class="info-card">
              <h3>${this.state.settings.language === "ar" ? "ارفاق السيرة" : "Attach your CV"}</h3>
              <p class="muted">${this.state.settings.language === "ar" ? "ارفع سيرتك لتُخزن في حسابك ويمكنك التقديم بسهولة." : "Upload your CV and save it to your account so applying is easier."}</p>
              <div class="stack">
                <input id="jobCvInput-${item.job.id}" type="file" accept="application/pdf" />
                <div class="actions-row">
                  <button class="btn btn-primary" data-action="upload-cv-job" data-job-id="${item.job.id}">${this.state.settings.language === "ar" ? "ارفع وحفظ" : "Upload & Save"}</button>
                </div>
                ${this.state.jobCvStatusMessage ? `<p class="muted">${this.state.jobCvStatusMessage}</p>` : ""}
              </div>
            </article>

            ${needsCv ? `
              <article class="info-card" style="border-left: 4px solid #f44336;">
                <p class="muted"><strong>${this.state.settings.language === "ar" ? "حمّل سيرتك" : "Upload your CV"}</strong></p>
                <p class="muted">${this.state.settings.language === "ar" ? "ارفع ملف PDF مرة واحدة ليكون جاهزاً لكل طلبات التقديم." : "Upload one PDF once; it will be used for all job applications."}</p>
              </article>
            ` : ""}

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
      const targetRole = this.getProfileTargetRole(user);
      const learningSuggestions = this.getLearningSuggestions(focusGap ? focusGap.skill : "");
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "خطة التطوير" : "Development Plan"}</h1>
          <p>${this.state.settings.language === "ar" ? `الخطة مبنية على الدور المستهدف: ${targetRole}` : `Plan generated for your target role: ${targetRole}`}</p>
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
                    <strong><a href="${entry.url || "#"}" target="_blank" rel="noopener noreferrer">${this.state.settings.language === "ar" ? entry.sourceAr : entry.sourceEn}</a></strong>
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
      const user = this.currentUser();
      const progress = this.currentProgress();
      
      // If test is active, show assessment
      if (this.state.behavioralTestActive && this.state.behavioralQuestions) {
        return this.behaviorTestPage();
      }

      // If test is completed, show results
      if (this.state.behavioralResultReady || (progress.behavior && progress.behavior.completed)) {
        return this.behaviorResultsPage();
      }

      // Show intro and start button
      const desiredRole = user.desiredRole || user.targetRoleEn || "Your Target Role";
      
      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "محاكاة سلوكية ذكية" : "AI Behavioral Simulation"}</h1>
          <p>${this.state.settings.language === "ar" ? "اختبر قدرتك على اتخاذ القرارات في سيناريوهات واقعية للعمل." : "Test your decision-making in realistic job scenarios."}</p>
        </section>
        <section class="cards behavior-intro-layout">
          <article class="profile-card-premium behavior-intro-card">
            <div class="smart-profile-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "اختبار سلوكي" : "Behavioral Assessment"}</span>
                <h3>${this.state.settings.language === "ar" ? "محاكاة حقيقية" : "Realistic Scenarios"}</h3>
                <p>${this.state.settings.language === "ar" ? "ستواجه 5 سيناريوهات واقعية تختبر قدراتك في الاتصال وحل المشاكل والتعاطف، مخصصة لدورة:" : "You'll face 5 realistic scenarios testing communication, problem-solving, and empathy, tailored for:"}</p>
              </div>
              <div class="behavior-role-badge">
                <strong>${desiredRole}</strong>
              </div>
            </div>
            
            <div class="behavior-intro-section">
              <h4>${this.state.settings.language === "ar" ? "ما يتم تقييمه:" : "What's evaluated:"}</h4>
              <ul class="simple-list">
                <li><strong>${this.state.settings.language === "ar" ? "التواصل:" : "Communication:"}</strong> ${this.state.settings.language === "ar" ? "كيفية شرحك للأفكار والتعامل مع الفريق." : "How you explain ideas and handle teams."}</li>
                <li><strong>${this.state.settings.language === "ar" ? "حل المشاكل:" : "Problem-solving:"}</strong> ${this.state.settings.language === "ar" ? "كيفية التعامل مع التحديات الحقيقية." : "How you handle real challenges."}</li>
                <li><strong>${this.state.settings.language === "ar" ? "التعاطف:" : "Empathy:"}</strong> ${this.state.settings.language === "ar" ? "فهمك لاحتياجات الآخرين والعملاء." : "Understanding others' needs and customer impact."}</li>
                <li><strong>${this.state.settings.language === "ar" ? "المسؤولية:" : "Accountability:"}</strong> ${this.state.settings.language === "ar" ? "كيفية تحملك المسؤولية عن الأخطاء." : "How you own your mistakes."}</li>
              </ul>
            </div>

            <div class="behavior-intro-section">
              <h4>${this.state.settings.language === "ar" ? "الوقت:" : "Time:"}</h4>
              <p>~${(5 * 120) / 60} ${this.state.settings.language === "ar" ? "دقيقة (120 ثانية لكل سؤال)" : "minutes (120 seconds per question)"}</p>
            </div>

            ${this.state.behavioralLoading ? `
              <div class="loading-spinner">
                <span>${this.state.settings.language === "ar" ? "جارٍ تحميل الأسئلة الذكية..." : "Loading smart questions..."}</span>
              </div>
              <button class="btn btn-primary" disabled>${this.state.settings.language === "ar" ? "جارٍ التحميل..." : "Loading..."}</button>
            ` : `
              <button class="btn btn-primary btn-large" data-action="start-behavioral-test">
                ${this.state.settings.language === "ar" ? "ابدأ الاختبار" : "Start Assessment"}
              </button>
            `}
          </article>

          <article class="info-card behavior-tips-card">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "نصائح" : "Tips"}</span>
              <h3>${this.state.settings.language === "ar" ? "كيفية النجاح" : "How to succeed"}</h3>
            </div>
            <div class="behavior-tips-list">
              <div class="tip-item">
                <strong>✓ ${this.state.settings.language === "ar" ? "كن محدداً:" : "Be specific:"}</strong>
                <p>${this.state.settings.language === "ar" ? "استخدم أمثلة حقيقية وقابلة للقياس من تجربتك." : "Use concrete, measurable examples from your experience."}</p>
              </div>
              <div class="tip-item">
                <strong>✓ ${this.state.settings.language === "ar" ? "ركز على التأثير:" : "Show impact:"}</strong>
                <p>${this.state.settings.language === "ar" ? "اشرح النتيجة النهائية والفائدة للفريق أو العميل." : "Explain the outcome and benefit to team or customer."}</p>
              </div>
              <div class="tip-item">
                <strong>✓ ${this.state.settings.language === "ar" ? "اعترف بالأخطاء:" : "Own mistakes:"}</strong>
                <p>${this.state.settings.language === "ar" ? "أظهر المسؤولية والقدرة على التعلم من الأخطاء." : "Show ownership and ability to learn from mistakes."}</p>
              </div>
              <div class="tip-item">
                <strong>✓ ${this.state.settings.language === "ar" ? "تعامل مع الناس:" : "Handle people:"}</strong>
                <p>${this.state.settings.language === "ar" ? "أظهر التعاطف والتواصل الواضح في كل سيناريو." : "Demonstrate empathy and clear communication."}</p>
              </div>
            </div>
          </article>
        </section>
      `;
    }

    behaviorTestPage() {
      const user = this.currentUser();
      if (!user || !this.state.behavioralQuestions || this.state.behavioralQuestions.length === 0) {
        return `<section class="info-card"><p>${this.state.settings.language === "ar" ? "خطأ في تحميل الأسئلة." : "Error loading questions."}</p></section>`;
      }

      const questions = this.state.behavioralQuestions;
      const currentIdx = this.state.behavioralCurrentQuestion;
      const question = questions[currentIdx];

      if (!question) {
        return `<section class="info-card"><p>${this.state.settings.language === "ar" ? "خطأ: السؤال غير موجود." : "Error: Question not found."}</p></section>`;
      }

      const currentAnswer = this.state.behavioralAnswers[question.id];

      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "اختبار سلوكي" : "Behavioral Test"}</h1>
          <p>${this.state.settings.language === "ar" ? `السؤال ${currentIdx + 1} من ${questions.length}` : `Question ${currentIdx + 1} of ${questions.length}`}</p>
          ${this.state.behavioralRole ? `<p class="muted">${this.state.settings.language === "ar" ? "اختبار لدور: " : "Assessment for: "}${this.state.behavioralRole}</p>` : ""}
        </section>

        <section class="cards behavior-test-layout">
          <div class="behavior-progress-bar">
            <div class="progress-fill" style="width: ${((currentIdx + 1) / questions.length) * 100}%"></div>
          </div>

          <article class="profile-card-premium behavior-scenario-card">
            <div class="hero-summary-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "السيناريو" : "Scenario"}</span>
                <h3>${question.scenario}</h3>
              </div>
              <div class="behavior-timer">
                <span class="timer-display">${this.formatTime(this.state.behavioralTimer)}</span>
              </div>
            </div>

            <div class="behavior-question-text">
              <h4>${this.state.settings.language === "ar" ? question.questionAr : question.questionEn}</h4>
            </div>

            <div class="option-list behavior-test-options">
              ${question.options.map((option) => `
                <label class="option-card behavior-test-option ${currentAnswer === option.id ? "selected" : ""}">
                  <input type="radio" name="behavior-answer" value="${option.id}" 
                    ${currentAnswer === option.id ? "checked" : ""}
                    data-action="record-behavioral-answer|${question.id}|${option.id}">
                  <span>${this.state.settings.language === "ar" ? option.textAr : option.textEn}</span>
                </label>
              `).join("")}
            </div>

            <div class="behavior-test-actions">
              <button type="button" class="btn btn-ghost" data-action="prev-behavioral-question" ${currentIdx === 0 ? "disabled" : ""}>
                ${this.state.settings.language === "ar" ? "← السابق" : "← Previous"}
              </button>
              
              ${currentIdx < questions.length - 1 ? `
                <button type="button" class="btn btn-primary" data-action="next-behavioral-question" onclick="window.tamheedApp && window.tamheedApp.nextBehavioralQuestion(); return false;" onpointerup="window.tamheedApp && window.tamheedApp.nextBehavioralQuestion(); return false;" ontouchend="window.tamheedApp && window.tamheedApp.nextBehavioralQuestion(); return false;" onmouseup="window.tamheedApp && window.tamheedApp.nextBehavioralQuestion(); return false;">
                  ${this.state.settings.language === "ar" ? "التالي →" : "Next →"}
                </button>
              ` : `
                <button type="button" class="btn btn-success" data-action="complete-behavioral-test" onclick="window.tamheedApp && window.tamheedApp.completeBehavioralTest({ allowUnanswered: true }); return false;" onpointerup="window.tamheedApp && window.tamheedApp.completeBehavioralTest({ allowUnanswered: true }); return false;" ontouchend="window.tamheedApp && window.tamheedApp.completeBehavioralTest({ allowUnanswered: true }); return false;" onmouseup="window.tamheedApp && window.tamheedApp.completeBehavioralTest({ allowUnanswered: true }); return false;">
                  ${this.state.settings.language === "ar" ? "إنهاء الاختبار" : "Finish Test"}
                </button>
              `}
            </div>
          </article>

          <aside class="info-card behavior-test-guide">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "المهارات المختبرة" : "Skills tested"}</span>
            </div>
            <div class="skills-badges">
              ${(question.skillsTested || []).map((skill) => `
                <span class="chip">${skill.replace(/_/g, " ")}</span>
              `).join("")}
            </div>
            <div class="guide-section">
              <h4>${this.state.settings.language === "ar" ? "التعليمات:" : "Instructions:"}</h4>
              <ul class="simple-list">
                <li>${this.state.settings.language === "ar" ? "اقرأ السيناريو بعناية." : "Read the scenario carefully."}</li>
                <li>${this.state.settings.language === "ar" ? "فكر قبل الإجابة." : "Think before answering."}</li>
                <li>${this.state.settings.language === "ar" ? "اختر الخيار الأفضل برأيك." : "Choose your best response."}</li>
                <li>${this.state.settings.language === "ar" ? "لا توجد إجابة واحدة صحيحة." : "There's no single 'right' answer."}</li>
                <li>${this.state.settings.language === "ar" ? "ستُقيّم خياراتك على أساس الحكم والأخلاقيات." : "You're scored on judgment and ethics."}</li>
              </ul>
            </div>
          </aside>
        </section>
      `;
    }

    behaviorResultsPage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const scores = this.state.behavioralLatestScores || progress.behavior?.scores || { communication: 0, empathy: 0, problem_solving: 0, overall: 0 };
      const roleLabel = this.state.behavioralRole || progress.behavior?.desiredRole || user?.desiredRole || user?.targetRoleEn || "";
      
      console.log("behaviorResultsPage rendered, scores:", scores);
      console.log("progress.behavior:", progress.behavior);

      const getScoreLevel = (score) => {
        if (score >= 85) return this.state.settings.language === "ar" ? "ممتاز" : "Excellent";
        if (score >= 70) return this.state.settings.language === "ar" ? "جيد جداً" : "Very good";
        if (score >= 55) return this.state.settings.language === "ar" ? "جيد" : "Good";
        return this.state.settings.language === "ar" ? "متوسط" : "Average";
      };

      const getScoreColor = (score) => {
        if (score >= 85) return "#4caf50";
        if (score >= 70) return "#2196f3";
        if (score >= 55) return "#ff9800";
        return "#f44336";
      };

      return `
        <section class="page-head">
          <h1>${this.state.settings.language === "ar" ? "نتائج الاختبار السلوكي" : "Behavioral Assessment Results"}</h1>
          <p>${this.state.settings.language === "ar" ? "تحليل شامل لأدائك السلوكي" : "Comprehensive analysis of your behavioral performance"}</p>
          ${roleLabel ? `<p class="muted">${this.state.settings.language === "ar" ? "الدور المستهدف: " : "Target role: "}${roleLabel}</p>` : ""}
        </section>

        <section class="cards behavior-results-layout">
          <article class="profile-card-premium behavior-overall-card">
            <div class="smart-profile-head">
              <div>
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "النتيجة الإجمالية" : "Overall Score"}</span>
                <h3>${getScoreLevel(scores.overall)}</h3>
              </div>
              <div class="smart-profile-score">
                <div class="ring" style="--value:${Math.min(scores.overall, 100)}">
                  <span>${scores.overall}</span>
                </div>
              </div>
            </div>

            <div class="behavior-score-details">
              <div class="score-item">
                <span>${this.state.settings.language === "ar" ? "التواصل والتعبير" : "Communication"}</span>
                <div class="score-bar">
                  <div class="score-fill" style="width: ${Math.min(scores.communication, 100)}%; background: ${getScoreColor(scores.communication)}"></div>
                </div>
                <strong>${scores.communication}/100</strong>
              </div>
              <div class="score-item">
                <span>${this.state.settings.language === "ar" ? "حل المشاكل" : "Problem-solving"}</span>
                <div class="score-bar">
                  <div class="score-fill" style="width: ${Math.min(scores.problem_solving, 100)}%; background: ${getScoreColor(scores.problem_solving)}"></div>
                </div>
                <strong>${scores.problem_solving}/100</strong>
              </div>
              <div class="score-item">
                <span>${this.state.settings.language === "ar" ? "التعاطف والمسؤولية" : "Empathy & Accountability"}</span>
                <div class="score-bar">
                  <div class="score-fill" style="width: ${Math.min(scores.empathy, 100)}%; background: ${getScoreColor(scores.empathy)}"></div>
                </div>
                <strong>${scores.empathy}/100</strong>
              </div>
            </div>

            <button type="button" class="btn btn-ghost" data-action="retake-behavioral-test">
              ${this.state.settings.language === "ar" ? "إعادة الاختبار" : "Retake Assessment"}
            </button>
          </article>

          <article class="info-card behavior-insights-card">
            <div class="hero-summary-head">
              <span class="hero-summary-label">${this.state.settings.language === "ar" ? "الرؤى" : "Insights"}</span>
              <h3>${this.state.settings.language === "ar" ? "نقاط القوة والتطوير" : "Strengths & Development"}</h3>
            </div>

            <div class="insights-section">
              <h4>${this.state.settings.language === "ar" ? "نقاط القوة:" : "Strengths:"}</h4>
              <ul class="simple-list">
                ${scores.communication >= 75 ? `<li>${this.state.settings.language === "ar" ? "✓ تواصل قوي وواضح" : "✓ Strong, clear communication"}</li>` : ""}
                ${scores.problem_solving >= 75 ? `<li>${this.state.settings.language === "ar" ? "✓ قدرة قوية على حل المشاكل" : "✓ Strong problem-solving ability"}</li>` : ""}
                ${scores.empathy >= 75 ? `<li>${this.state.settings.language === "ar" ? "✓ تعاطف قوي مع الآخرين" : "✓ Strong empathy and people skills"}</li>` : ""}
                ${scores.accountability >= 75 ? `<li>${this.state.settings.language === "ar" ? "✓ المسؤولية والنزاهة" : "✓ Accountability and integrity"}</li>` : ""}
              </ul>
            </div>

            <div class="insights-section">
              <h4>${this.state.settings.language === "ar" ? "مجالات التطوير:" : "Areas to Develop:"}</h4>
              <ul class="simple-list">
                ${scores.communication < 75 ? `<li>📈 ${this.state.settings.language === "ar" ? "عزز تواصلك الكتابي والشفهي" : "Improve written and verbal communication"}</li>` : ""}
                ${scores.problem_solving < 75 ? `<li>📈 ${this.state.settings.language === "ar" ? "طور مهارات حل المشاكل" : "Strengthen problem-solving approach"}</li>` : ""}
                ${scores.empathy < 75 ? `<li>📈 ${this.state.settings.language === "ar" ? "اعمل على فهم احتياجات الآخرين" : "Work on understanding others' perspectives"}</li>` : ""}
                ${scores.accountability < 75 ? `<li>📈 ${this.state.settings.language === "ar" ? "زد المسؤولية عن القرارات" : "Increase ownership of decisions"}</li>` : ""}
              </ul>
            </div>

            <div class="insights-section">
              <h4>${this.state.settings.language === "ar" ? "الخطوات التالية:" : "Next Steps:"}</h4>
              <ul class="simple-list">
                <li>📝 ${this.state.settings.language === "ar" ? "أعد السيرة الذاتية مع أمثلة واقعية من تجربتك" : "Update your CV with real examples of these skills"}</li>
                <li>🎥 ${this.state.settings.language === "ar" ? "استعد للمقابلة الذكية" : "Prepare for smart interview"}</li>
                <li>💼 ${this.state.settings.language === "ar" ? "تقدم للوظائف المطابقة" : "Apply to matching jobs"}</li>
              </ul>
            </div>
          </article>
        </section>
      `;
    }

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

  interviewPage() {
      const progress = this.currentProgress();
      if (this.state.aiInterviewDone) {
        const scoreDetail = this.state.aiInterviewScoreDetail || (progress && progress.interview) || { feedback: [], overall: 0 };
        const finalScore = scoreDetail.overall != null ? scoreDetail.overall : (progress && progress.interview ? progress.interview.score : 0);
        return `
          <section class="page-head">
            <h1>${this.state.settings.language === "ar" ? "نتيجة المقابلة الذكية" : "Smart Interview Result"}</h1>
          </section>
          <section class="cards two-up interview-result-grid">
            <article class="info-card">
              <h3>${this.state.settings.language === "ar" ? "النتيجة النهائية" : "Final score"}</h3>
              <div class="ring" style="--value:${finalScore}">
                <span>${finalScore}</span>
              </div>
            </article>
            <article class="info-card">
              <h3>${this.state.settings.language === "ar" ? "ملاحظات الذكاء الاصطناعي" : "AI feedback"}</h3>
              <ul class="simple-list">
                ${(scoreDetail.feedback || []).map((item) => `<li>${item}</li>`).join("") || `<li>${this.state.settings.language === "ar" ? "أكمل جميع الإجابات للحصول على ملاحظات." : "Provide answers to receive feedback."}</li>`}
              </ul>
              <button class="btn btn-ghost" data-action="reset-interview">${this.state.settings.language === "ar" ? "إعادة التجربة" : "Restart"}</button>
            </article>
          </section>
        `;
      }
      
      const current = DATA.interviewQuestions[this.state.aiInterviewIndex];
      const isAr = this.state.settings.language === "ar";
      const currentDraft = this.state.aiInterviewDrafts[this.state.aiInterviewIndex] || "";
      const isMicActive = this.state.micActive;

      return `
        <section class="page-head">
          <h1>${isAr ? "المقابلة الذكية" : "Smart Interview"}</h1>
        </section>
        <section class="cards interview-layout">
          <article class="info-card interview-panel interview-main-card" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 20px;">
            
            <div style="text-align: center; margin-bottom: 2rem;">
               <span style="display: inline-block; padding: 4px 12px; background: rgba(19, 180, 183, 0.1); color: #13B4B7; border-radius: 12px; font-weight: bold; margin-bottom: 1rem;">
                  ${isAr ? `السؤال ${this.state.aiInterviewIndex + 1} من ${DATA.interviewQuestions.length}` : `Question ${this.state.aiInterviewIndex + 1} of ${DATA.interviewQuestions.length}`}
               </span>
               <h2 style="font-size: 1.8rem; color: var(--text); line-height: 1.5; max-width: 600px; margin: 0 auto;">
                   ${isAr ? current.qAr : current.qEn}
               </h2>
               <button class="btn btn-ghost" data-action="read-question" style="margin-top: 1rem; color: #10416A;">
                  🔊 ${isAr ? "استمع للسؤال" : "Listen again"}
               </button>
            </div>
            
            <div class="interview-answer-box">
               ${currentDraft ? `
                  <p style="font-size: 1.2rem; color: var(--text); line-height: 1.6; text-align: center;">
                      "${currentDraft}"
                  </p>
               ` : `
                  <p class="muted" style="text-align: center;">
                     ${isAr ? "إجابتك ستظهر هنا تلقائياً..." : "Your answer will appear here..."}
                  </p>
               `}
               
               ${isMicActive ? `
               <div style="position: absolute; top: 12px; right: 12px; width: 12px; height: 12px; background: #f44336; border-radius: 50%; box-shadow: 0 0 8px #f44336; animation: blink 1s infinite alternate;"></div>
               <style>@keyframes blink { 0% { opacity: 1; } 100% { opacity: 0.3; } }</style>
               ` : ''}
            </div>
            
            <div style="display: flex; gap: 16px; margin-top: 30px; align-items: center;">
               <button type="button" data-action="start-mic" style="border-radius: 50px; width: 64px; height: 64px; border: none; background: ${isMicActive ? '#f44336' : '#13B4B7'}; color: white; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px ${isMicActive ? 'rgba(244, 67, 54, 0.4)' : 'rgba(19, 180, 183, 0.4)'}; transition: all 0.3s ease;">
                   ${isMicActive ? '⏹' : '🎤'}
               </button>
               
               <button type="button" class="btn btn-primary" data-action="next-interview" style="border-radius: 50px; padding: 0 32px; height: 64px; font-size: 1.1rem; background: #10416A;">
                   ${this.state.aiInterviewIndex === DATA.interviewQuestions.length - 1 ? (isAr ? "إنهاء وتقييم" : "Finish & score") : (isAr ? "السؤال التالي" : "Next question")}
               </button>
            </div>

            <p class="muted" style="margin-top: 20px; font-size: 0.9rem;">
               ${isAr ? (isMicActive ? "جاري الاستماع، انقر المربع للإيقاف..." : "انقر على المايكروفون للتحدث") : (isMicActive ? "Listening, tap square to stop..." : "Tap the mic to start speaking")}
            </p>
          </article>
        </section>
      `;
    }
    profilePage() {
      const user = this.currentUser();
      const progress = this.currentProgress();
      const readiness = this.getReadiness(user.id);
      const roleOptions = Array.from(new Set(DATA.jobs.map((job) => ({
        en: job.titleEn,
        ar: job.titleAr
      })))).slice(0, 30); // limit for UI brevity
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
            <div class="smart-profile-vertical-sections">
              <div class="smart-profile-vertical-card">
                <small class="smart-profile-vertical-title">${this.state.settings.language === "ar" ? "المهارات البارزة" : "Top skills"}</small>
                <div class="smart-profile-vertical-list">
                  ${(user.topSkills || []).slice(0, 6).map((skill) => `<div class="smart-profile-vertical-item"><span>${skill}</span></div>`).join("")}
                </div>
              </div>
              <div class="smart-profile-vertical-card">
                <small class="smart-profile-vertical-title">${this.state.settings.language === "ar" ? "الإشارات الموثقة" : "Verified badges"}</small>
                <div class="smart-profile-vertical-list">
                  ${progress.badges.length
                    ? progress.badges.map((badge) => `<div class="smart-profile-vertical-item"><span>${badge}</span></div>`).join("")
                    : `<div class="smart-profile-vertical-item"><span>${this.t("empty")}</span></div>`
                  }
                </div>
              </div>
            </div>
            <button class="btn btn-primary smart-profile-download-btn" data-action="download-profile">${this.state.settings.language === "ar" ? "تنزيل PNG" : "Download PNG"}</button>
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
                  <small>${this.state.settings.language === "ar" ? "الدور المستهدف" : "Target role"}</small>
                  <div class="smart-profile-target-role">
                    <select id="profileTargetRole">
                      <option value="">${this.state.settings.language === "ar" ? "اختر الدور" : "Choose role"}</option>
                  ${roleOptions.map((opt) => `
                        <option value="${opt.en}" ${user.targetRoleEn === opt.en ? "selected" : ""}>
                          ${this.state.settings.language === "ar" ? opt.ar : opt.en}
                        </option>
                      `).join("")}
                    </select>
                    <button class="btn btn-primary btn-small" data-action="save-target-role" type="button">
                      ${this.state.settings.language === "ar" ? "حفظ" : "Save"}
                    </button>
                  </div>
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
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "حالة السيرة الذاتية" : "CV Status"}</span>
                <h3>${this.state.settings.language === "ar" ? "تحليل موثق بذكاء اصطناعي" : "AI-verified CV insights"}</h3>
              </div>
              <div class="smart-profile-list">
                ${user.cvAnalysis ? `
                  <div class="smart-profile-list-row">
                    <small>${this.state.settings.language === "ar" ? "نسبة الملاءمة" : "Job fit"}</small>
                    <strong>${user.cvAnalysis.aiInsights && user.cvAnalysis.aiInsights.job_fit_score !== null 
                      ? user.cvAnalysis.aiInsights.job_fit_score + "%" 
                      : (user.cvAnalysis.scores && user.cvAnalysis.scores.TotalScore 
                        ? user.cvAnalysis.scores.TotalScore + "/100" 
                        : "-")}</strong>
                  </div>
                  <div class="smart-profile-list-row">
                    <small>${this.state.settings.language === "ar" ? "تم التحديث" : "Updated"}</small>
                    <strong>${new Date().toLocaleDateString(this.state.settings.language === "ar" ? "ar-SA" : "en-US")}</strong>
                  </div>
                  <div class="smart-profile-list-row">
                    <small>${this.state.settings.language === "ar" ? "الحالة" : "Status"}</small>
                    <strong style="color: #4caf50;">${this.state.settings.language === "ar" ? "✓ محفوظة" : "✓ Saved"}</strong>
                  </div>
                ` : `
                  <p style="color: var(--text-soft); font-size: 0.9em;">${this.state.settings.language === "ar" ? "لم تحمل سيرة ذاتية بعد" : "No CV uploaded yet"}</p>
                  <button class="btn btn-sm btn-ghost" data-nav="/upload" style="margin-top: 8px;">${this.state.settings.language === "ar" ? "ارفع السيرة" : "Upload CV"}</button>
                `}
              </div>
            </article>
            <article class="info-card smart-profile-card">
              <div class="hero-summary-head">
                <span class="hero-summary-label">${this.state.settings.language === "ar" ? "اختصارات" : "Shortcuts"}</span>
                <h3>${this.state.settings.language === "ar" ? "افتح الملخصات المرتبطة" : "Open related summaries"}</h3>
              </div>
              <div class="actions-row smart-profile-actions">
                <button class="btn btn-ghost" data-nav="/interview">${this.state.settings.language === "ar" ? "عرض المقابلة" : "Interview summary"}</button>
              </div>
            </article>
          </div>
        </section>
      `;
    }

    companyDashboard() {
      const companyUser = this.currentUser();
      const activeRole = this.state.companyRoles[0] || DATA.defaultRoleRequirement;
      const companyName = activeRole.companyName || companyUser.companyName || companyUser.name || "-";
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
                <small class="muted">${this.state.settings.language === "ar" ? `تم الترتيب لـ ${activeRole.title}` : `Ranked for ${activeRole.title}`}</small>
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
              <small>${this.state.settings.language === "ar" ? "اسم الشركة" : "Company name"}</small>
              <strong>${companyName}</strong>
            </div>
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
            <div class="company-overview-item">
              <small>${this.state.settings.language === "ar" ? "مجموع نقاط الترتيب" : "Ranking factors"}</small>
              <strong>${this.state.settings.language === "ar" ? "المهارات + الجاهزية + العنوان + المدينة" : "Skills + readiness + title + city"}</strong>
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
              <label>${this.state.settings.language === "ar" ? "اسم الشركة" : "Company name"}<input name="companyName" value="${companyName}" required></label>
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
                  <small class="muted">${this.state.settings.language === "ar" ? `تم الترتيب لـ ${activeRole.title}` : `Ranked for ${activeRole.title}`}</small>
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
      const companyUser = this.currentUser();
      const activeRole = this.state.companyRoles[0] || DATA.defaultRoleRequirement;
      const companyName = activeRole.companyName || companyUser.companyName || companyUser.name || "-";
      const ranked = this.rankCandidates(activeRole);
      const filteredRanked = this.getFilteredCandidates(ranked);
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
                  <strong>${filteredRanked.length}</strong>
                </div>
                <div class="company-metric">
                  <small>${this.state.settings.language === "ar" ? "أفضل نتيجة" : "Top score"}</small>
                  <strong>${filteredRanked[0] ? `${filteredRanked[0].overall}%` : "-"}</strong>
                </div>
              </div>
            </div>
            <div class="company-overview-grid">
              <div class="company-overview-item">
                <small>${this.state.settings.language === "ar" ? "اسم الشركة" : "Company name"}</small>
                <strong>${companyName}</strong>
              </div>
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
          <article class="company-panel-card">
            <div class="dashboard-section-head">
              <div>
                <h3>${this.state.settings.language === "ar" ? "فلترة المرشحين" : "Candidate filters"}</h3>
                <p>${this.state.settings.language === "ar" ? "فلترة حسب المدينة، الجاهزية، الخبرة، والمهارة." : "Filter by city, readiness, experience, and key skill."}</p>
              </div>
            </div>
            <section class="filter-bar jobs-filter-grid">
              <select data-company-filter="city">
                <option value="all">${this.state.settings.language === "ar" ? "كل المدن" : "All cities"}</option>
                ${["Riyadh", "Jeddah", "Dhahran", "Tabuk"].map((city) => `<option value="${city}" ${this.state.companyCandidateFilters.city === city ? "selected" : ""}>${city}</option>`).join("")}
              </select>
              <select data-company-filter="skill">
                <option value="all">${this.state.settings.language === "ar" ? "كل المهارات" : "All skills"}</option>
                ${DATA.skills.map((skill) => `<option value="${skill}" ${this.state.companyCandidateFilters.skill === skill ? "selected" : ""}>${skill}</option>`).join("")}
              </select>
              <label class="range-wrap jobs-range-wrap">
                <span>${this.state.settings.language === "ar" ? "الحد الأدنى للجاهزية" : "Min readiness"}: ${this.state.companyCandidateFilters.minReadiness}%</span>
                <input type="range" min="0" max="100" value="${this.state.companyCandidateFilters.minReadiness}" data-company-filter="minReadiness">
              </label>
              <label class="range-wrap jobs-range-wrap">
                <span>${this.state.settings.language === "ar" ? "الحد الأدنى للخبرة" : "Min years"}: ${this.state.companyCandidateFilters.minYears}</span>
                <input type="range" min="0" max="10" value="${this.state.companyCandidateFilters.minYears}" data-company-filter="minYears">
              </label>
            </section>
          </article>
          <section class="cards company-candidates-grid">
            ${filteredRanked.length ? filteredRanked.map((entry) => `
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
                <div class="badge-row">${((this.state.progress[entry.student.id] && this.state.progress[entry.student.id].badges) || []).map((badge) => `<span class="badge-soft">${badge}</span>`).join("")}</div>
                <div class="actions-row">
                  <button class="btn btn-ghost" data-nav="/candidate/${entry.student.id}">${this.t("viewProfile")}</button>
                  <button class="btn btn-ghost" data-action="set-application-status" data-candidate-id="${entry.student.id}" data-status="accepted">${this.state.settings.language === "ar" ? "قبول" : "Accept"}</button>
                  <button class="btn btn-ghost" data-action="set-application-status" data-candidate-id="${entry.student.id}" data-status="rejected">${this.state.settings.language === "ar" ? "رفض" : "Reject"}</button>
                  <button class="btn btn-primary" data-action="invite-candidate" data-candidate-id="${entry.student.id}" ${this.isCandidateInvited(entry.student.id) ? "disabled" : ""} ${this.isCandidateInvited(entry.student.id) ? `title="${this.state.settings.language === "ar" ? "تمت دعوته مسبقًا" : "Already invited"}"` : ""}>${this.isCandidateInvited(entry.student.id) ? (this.state.settings.language === "ar" ? "تمت الدعوة" : "Invited") : this.t("invite")}</button>
                </div>
              </article>
            `).join("") : this.stateCard(
              this.state.settings.language === "ar" ? "لا يوجد مرشحون مطابقون للفلاتر الحالية." : "No candidates match the current filters.",
              this.state.settings.language === "ar" ? "نتائج الفلترة" : "Filtered results"
            )}
          </section>
        </section>
      `;
    }

    candidateProfilePage(studentId) {
      const student = this.state.accounts.students.find((item) => item.id === studentId);
      if (!student) {
        return this.stateCard(this.state.settings.language === "ar" ? "المرشح غير موجود." : "Candidate not found.");
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
            <div class="actions-row">
              <button class="btn btn-ghost" data-action="set-application-status" data-candidate-id="${student.id}" data-status="accepted">${this.state.settings.language === "ar" ? "قبول" : "Accept"}</button>
              <button class="btn btn-ghost" data-action="set-application-status" data-candidate-id="${student.id}" data-status="rejected">${this.state.settings.language === "ar" ? "رفض" : "Reject"}</button>
              <button class="btn btn-primary" data-action="invite-candidate" data-candidate-id="${student.id}" ${this.isCandidateInvited(student.id) ? "disabled" : ""} ${this.isCandidateInvited(student.id) ? `title="${this.state.settings.language === "ar" ? "تمت دعوته مسبقًا" : "Already invited"}"` : ""}>${this.isCandidateInvited(student.id) ? (this.state.settings.language === "ar" ? "تمت الدعوة" : "Invited") : this.t("invite")}</button>
            </div>
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
      const protectedStudent = new Set(["student-dashboard", "upload", "jobs", "job", "plan", "interview", "profile", "micro-labs-test"]);
      const protectedCompany = new Set(["company-dashboard", "candidate", "candidates", "assessments"]);
      const needsAuth = sharedProtected.has(route.name) || protectedStudent.has(route.name) || protectedCompany.has(route.name);

      if (needsAuth && !this.state.authResolved) {
        return this.stateCard(this.state.settings.language === "ar" ? "جاري التحقق من الجلسة..." : "Checking your session...");
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
        case "faq":
          return this.faqPage();
        case "privacy":
          return this.privacyPage();
        case "terms":
          return this.termsPage();
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
          return this.notFoundPage();
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
          ${this.siteFooter()}
          ${this.bottomTabs()}
          ${this.state.toast ? `<div class="toast-snackbar" role="status" aria-live="polite">${this.state.toast}</div>` : ""}
        </div>
      `;

      const finishBtn = this.root.querySelector('[data-action="complete-behavioral-test"]');
      if (finishBtn) {
        finishBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.completeBehavioralTest();
        });
      }

      const nextBtn = this.root.querySelector('[data-action="next-behavioral-question"]');
      if (nextBtn) {
        nextBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.nextBehavioralQuestion();
        });
      }
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
