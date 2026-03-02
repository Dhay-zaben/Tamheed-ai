window.TAMHEED_DATA = {
  translations: {
    ar: {
      brand: "تمهيد",
      brandLatin: "Tamheed",
      tagline: "جاهزيتك المهنية تبدأ بخطوة ذكية",
      navHome: "الرئيسية",
      navPlans: "الخطط",
      navAbout: "عن تمهيد",
      navContact: "تواصل",
      navLogin: "دخول",
      navLogout: "خروج",
      ctaStart: "ابدأ الآن",
      ctaDemo: "استعرض التجربة",
      student: "باحث عن عمل",
      company: "شركة",
      settings: "الإعدادات",
      lang: "اللغة",
      dark: "الوضع الداكن",
      login: "تسجيل الدخول",
      register: "إنشاء حساب",
      forgot: "نسيت كلمة المرور",
      uploadCv: "رفع السيرة الذاتية",
      jobs: "الوظائف",
      labs: "المختبرات",
      plan: "الخطة",
      profile: "الملف الذكي",
      dashboard: "لوحة التحكم",
      roles: "الأدوار",
      candidates: "المرشحون",
      assessments: "الاختبارات",
      save: "حفظ",
      apply: "تقديم",
      generate: "توليد",
      viewProfile: "عرض الملف",
      invite: "دعوة للمقابلة",
      score: "درجة الجاهزية",
      loading: "جاري التحليل الذكي",
      empty: "لا توجد بيانات بعد",
      futureWork: "ميزة مستقبلية"
    },
    en: {
      brand: "Tamheed",
      brandLatin: "Tamheed",
      tagline: "Career readiness, intelligently accelerated",
      navHome: "Home",
      navPlans: "Plans",
      navAbout: "About",
      navContact: "Contact",
      navLogin: "Login",
      navLogout: "Logout",
      ctaStart: "Get Started",
      ctaDemo: "View Demo",
      student: "Student",
      company: "Company",
      settings: "Settings",
      lang: "Language",
      dark: "Dark Mode",
      login: "Login",
      register: "Register",
      forgot: "Forgot Password",
      uploadCv: "Upload CV",
      jobs: "Jobs",
      labs: "Labs",
      plan: "Plan",
      profile: "Profile",
      dashboard: "Dashboard",
      roles: "Roles",
      candidates: "Candidates",
      assessments: "Assessments",
      save: "Save",
      apply: "Apply",
      generate: "Generate",
      viewProfile: "View Profile",
      invite: "Invite to Interview",
      score: "Readiness Score",
      loading: "Running AI analysis",
      empty: "No data yet",
      futureWork: "Future work"
    }
  },
  skills: [
    "JavaScript",
    "SQL",
    "Python",
    "Power BI",
    "Excel",
    "Cybersecurity",
    "Cloud",
    "Communication",
    "Customer Support",
    "React",
    "Node.js",
    "Data Analysis"
  ],
  jobs: [
    {
      id: "job-1",
      titleAr: "محلل بيانات مبتدئ",
      titleEn: "Junior Data Analyst",
      company: "stc",
      city: "Riyadh",
      type: "Hybrid",
      remote: true,
      salary: "10,000 - 13,000 SAR",
      skills: ["SQL", "Power BI", "Excel", "Data Analysis"],
      descriptionAr: "تحليل البيانات التشغيلية وبناء لوحات مؤشرات تنفيذية تدعم فرق النمو.",
      descriptionEn: "Analyze operational data and build executive dashboards for growth teams."
    },
    {
      id: "job-2",
      titleAr: "مطور واجهات أمامية",
      titleEn: "Front-End Developer",
      company: "Tamara",
      city: "Jeddah",
      type: "On-site",
      remote: false,
      salary: "12,000 - 16,000 SAR",
      skills: ["JavaScript", "React", "Communication"],
      descriptionAr: "تطوير واجهات عالية الأداء لتجربة مستخدم مالية موثوقة وسلسة.",
      descriptionEn: "Build high-performance interfaces for a trusted fintech experience."
    },
    {
      id: "job-3",
      titleAr: "محلل أمن سيبراني",
      titleEn: "Cybersecurity Analyst",
      company: "Aramco Digital",
      city: "Dhahran",
      type: "On-site",
      remote: false,
      salary: "14,000 - 18,000 SAR",
      skills: ["Cybersecurity", "SQL", "Communication"],
      descriptionAr: "مراقبة التنبيهات ورفع توصيات وقائية واستجابة أولية للحوادث.",
      descriptionEn: "Monitor alerts and provide preventive recommendations and initial incident response."
    },
    {
      id: "job-4",
      titleAr: "منسق نجاح عملاء",
      titleEn: "Customer Success Coordinator",
      company: "Jahez",
      city: "Riyadh",
      type: "Remote",
      remote: true,
      salary: "8,000 - 11,000 SAR",
      skills: ["Communication", "Customer Support", "Excel"],
      descriptionAr: "إدارة تجربة العميل وحل المشكلات وتحسين مؤشرات الرضا والاحتفاظ.",
      descriptionEn: "Manage customer experience, resolve issues, and improve retention metrics."
    },
    {
      id: "job-5",
      titleAr: "مطور حلول سحابية مبتدئ",
      titleEn: "Junior Cloud Solutions Engineer",
      company: "NEOM Tech",
      city: "Tabuk",
      type: "Hybrid",
      remote: true,
      salary: "13,000 - 17,000 SAR",
      skills: ["Cloud", "Python", "Communication"],
      descriptionAr: "دعم نشر الخدمات السحابية وتوثيق التشغيل ومتابعة الأداء.",
      descriptionEn: "Support cloud deployments, operations documentation, and performance follow-up."
    }
  ],
  labs: [
    {
      id: "lab-sql",
      titleAr: "مختبر SQL: إصلاح استعلام",
      titleEn: "SQL Lab: Fix the Query",
      promptAr: "الاستعلام الحالي لا يحسب إجمالي المبيعات لكل مدينة بشكل صحيح. اختر التصحيح الأفضل.",
      promptEn: "The current query does not correctly total sales by city. Choose the best fix.",
      snippet: "SELECT city, SUM(amount) FROM orders WHERE status = 'paid';",
      options: [
        {
          id: "a",
          textAr: "إضافة GROUP BY city",
          textEn: "Add GROUP BY city",
          correct: true
        },
        {
          id: "b",
          textAr: "استبدال SUM بـ COUNT",
          textEn: "Replace SUM with COUNT",
          correct: false
        },
        {
          id: "c",
          textAr: "حذف شرط status",
          textEn: "Remove the status filter",
          correct: false
        }
      ]
    }
  ],
  behaviorScenario: {
    id: "scenario-1",
    titleAr: "عميل غاضب بسبب توقف الخدمة",
    titleEn: "Angry customer after service outage",
    descriptionAr: "عميل مهم يشتكي بانفعال بعد توقف الخادم لمدة 20 دقيقة. ما ردك الأول؟",
    descriptionEn: "A key customer is upset after a 20-minute server outage. What is your first response?",
    options: [
      {
        id: "b1",
        textAr: "أعتذر بوضوح، أشرح ما نعرفه، وأحدد وقت تحديث قريب",
        textEn: "Apologize clearly, explain what is known, and commit to a near-term update",
        communication: 5,
        empathy: 5,
        problem: 5
      },
      {
        id: "b2",
        textAr: "أطلب منهم الانتظار حتى ينتهي الفريق التقني",
        textEn: "Ask them to wait until engineering is done",
        communication: 2,
        empathy: 1,
        problem: 2
      },
      {
        id: "b3",
        textAr: "أوضح أن العطل خارج سيطرتنا",
        textEn: "Explain the outage is outside our control",
        communication: 1,
        empathy: 0,
        problem: 1
      }
    ]
  },
  interviewQuestions: [
    {
      qAr: "عرف بنفسك خلال 60 ثانية.",
      qEn: "Introduce yourself in 60 seconds."
    },
    {
      qAr: "اذكر مشروعاً واجهت فيه تحدياً وكيف تعاملت معه.",
      qEn: "Describe a project challenge and how you handled it."
    },
    {
      qAr: "كيف ترتب أولوياتك عند تعدد المهام؟",
      qEn: "How do you prioritize when multiple tasks collide?"
    },
    {
      qAr: "ما المهارة التي تعمل على تطويرها حالياً؟",
      qEn: "Which skill are you actively improving?"
    },
    {
      qAr: "لماذا أنت مناسب لهذه الفرصة؟",
      qEn: "Why are you a fit for this opportunity?"
    }
  ],
  users: {
    students: [
      {
        id: "student-1",
        role: "student",
        name: "سارة العتيبي",
        nameEn: "Sarah Alotaibi",
        email: "sarah@tamheed.demo",
        password: "123456",
        city: "Riyadh",
        targetRoleAr: "محللة بيانات",
        targetRoleEn: "Data Analyst",
        experience: 1,
        topSkills: ["SQL", "Power BI", "Excel", "Communication"],
        portfolio: ["behance.net/sarahdata", "github.com/sarah-data"],
        badges: ["CV Verified"]
      },
      {
        id: "student-2",
        role: "student",
        name: "عبدالله القحطاني",
        nameEn: "Abdullah Alqahtani",
        email: "abdullah@tamheed.demo",
        password: "123456",
        city: "Jeddah",
        targetRoleAr: "مطور واجهات أمامية",
        targetRoleEn: "Front-End Developer",
        experience: 2,
        topSkills: ["JavaScript", "React", "Communication"],
        portfolio: ["github.com/abdullah-ui", "dribbble.com/abdullah-ui"],
        badges: ["Code Lab Gold"]
      },
      {
        id: "student-3",
        role: "student",
        name: "نورة الحربي",
        nameEn: "Noura Alharbi",
        email: "noura@tamheed.demo",
        password: "123456",
        city: "Dhahran",
        targetRoleAr: "محللة أمن سيبراني",
        targetRoleEn: "Cybersecurity Analyst",
        experience: 1,
        topSkills: ["Cybersecurity", "SQL", "Communication"],
        portfolio: ["linkedin.com/in/nouracyber"],
        badges: ["Security Basics"]
      }
    ],
    companies: [
      {
        id: "company-1",
        role: "company",
        name: "شركة وادي التقنية",
        nameEn: "Wadi Tech",
        email: "hr@waditech.demo",
        password: "123456",
        companyName: "Wadi Tech",
        city: "Riyadh"
      }
    ]
  },
  defaultRoleRequirement: {
    title: "Junior Data Analyst",
    requiredSkills: ["SQL", "Power BI", "Communication"],
    years: 1,
    salary: "10,000 - 14,000 SAR",
    location: "Riyadh"
  },
  plans: [
    {
      week: 1,
      titleAr: "تحليل أساسيات البيانات",
      titleEn: "Data foundations",
      resourceAr: "مسار SQL العملي",
      resourceEn: "Practical SQL track",
      taskAr: "إكمال 3 تمارين استعلامات",
      taskEn: "Complete 3 query drills",
      projectAr: "لوحة KPI بسيطة",
      projectEn: "Build a simple KPI dashboard"
    },
    {
      week: 2,
      titleAr: "تصميم تقارير واضحة",
      titleEn: "Clear reporting",
      resourceAr: "أساسيات Power BI",
      resourceEn: "Power BI fundamentals",
      taskAr: "بناء تقرير أسبوعي",
      taskEn: "Create a weekly report",
      projectAr: "قصة بيانات للإدارة",
      projectEn: "Create a management data story"
    },
    {
      week: 3,
      titleAr: "التواصل المهني",
      titleEn: "Professional communication",
      resourceAr: "جلسة محاكاة عرض النتائج",
      resourceEn: "Results presentation workshop",
      taskAr: "تسجيل عرض من دقيقتين",
      taskEn: "Record a two-minute presentation",
      projectAr: "ملخص تنفيذي بصري",
      projectEn: "Build a visual executive summary"
    },
    {
      week: 4,
      titleAr: "مشروع نهائي مصغر",
      titleEn: "Final mini-project",
      resourceAr: "قالب دراسة حالة",
      resourceEn: "Case study template",
      taskAr: "تحليل مجموعة بيانات محلية",
      taskEn: "Analyze a local dataset",
      projectAr: "ملف جاهز للمشاركة مع التوظيف",
      projectEn: "Publish a hiring-ready case file"
    }
  ]
};
