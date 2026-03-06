/**
 * Generate AI-powered behavioral simulation questions based on job role
 * Questions test decision-making, ethics, problem-solving specific to the job
 */

const handler = async (event) => {
  try {
    const { role = "Frontend Developer", locale = "en" } = event.queryStringParameters || {};

    // Validate role
    if (!role || role.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid role parameter" }),
      };
    }

    // Try to use OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      return await generateWithOpenAI(role, locale, apiKey);
    }

    // Fallback to mock questions
    console.log("No OpenAI API key, using mock behavioral questions");
    return {
      statusCode: 200,
      body: JSON.stringify({
        questions: getMockBehavioralQuestions(role, locale),
        source: "mock",
        message: "Using mock behavioral questions (configure OPENAI_API_KEY for AI-generated)",
      }),
    };
  } catch (error) {
    console.error("Error generating behavioral questions:", error.message);
    return {
      statusCode: 200,
      body: JSON.stringify({
        questions: getMockBehavioralQuestions("General", "en"),
        source: "mock",
        message: "Using mock behavioral questions (API error)",
      }),
    };
  }
};

/**
 * Generate questions using OpenAI GPT
 */
async function generateWithOpenAI(role, locale, apiKey) {
  const models = ["gpt-4o-mini", "gpt-4.1-mini"];
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `You are an expert behavioral assessment designer for job interviews. 
Create 5 realistic scenario-based questions that test decision-making, ethics, and problem-solving 
specific to the ${role} role. Include ${locale === "ar" ? "Arabic" : "English"} responses.
Return a JSON array with these fields for each question:
{
  "id": "q1",
  "scenario": "The scenario/situation",
  "questionEn": "The question in English",
  "questionAr": "The question in Arabic",
  "options": [
    {"id": "a", "textEn": "Option text", "textAr": "نص الخيار", "score": 85},
    ...
  ],
  "timeLimit": 120 (seconds),
  "skills_tested": ["communication", "problem_solving"]
}
Only return the JSON array, no other text.`,
            },
            {
              role: "user",
              content: `Generate 5 behavioral interview questions for a ${role} position. Make them realistic scenarios they might face.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not parse JSON from OpenAI response");
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate and normalize questions
      const validQuestions = questions
        .filter((q) => q.scenario && q.questionEn && q.options && q.options.length >= 2)
        .slice(0, 5)
        .map((q) => ({
          id: q.id || `q${questions.indexOf(q) + 1}`,
          scenario: q.scenario,
          questionEn: q.questionEn || q.question,
          questionAr: q.questionAr || q.question,
          options: q.options.map((opt) => ({
            id: opt.id,
            textEn: opt.textEn || opt.text,
            textAr: opt.textAr || opt.text,
            score: opt.score || 75,
          })),
          timeLimit: q.timeLimit || 120,
          skillsTested: q.skills_tested || ["communication", "problem_solving"],
        }));

      if (validQuestions.length === 0) {
        throw new Error("No valid questions generated");
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          questions: validQuestions,
          source: "openai",
          model,
          message: `Generated ${validQuestions.length} behavioral questions using ${model}`,
        }),
      };
    } catch (error) {
      lastError = error;
      console.error(`Model ${model} failed:`, error.message);
      // Try next model
      continue;
    }
  }

  // All models failed, return mock
  console.error("All OpenAI models failed, falling back to mock questions");
  return {
    statusCode: 200,
    body: JSON.stringify({
      questions: getMockBehavioralQuestions(role, locale),
      source: "mock",
      message: `Using mock questions (AI generation failed: ${lastError?.message})`,
    }),
  };
}

/**
 * Mock behavioral questions for fallback
 */
function inferSkills(role) {
  const r = role.toLowerCase();
  if (r.includes("data")) return ["analysis", "sql", "visualization"];
  if (r.includes("analyst")) return ["analysis", "insight", "communication"];
  if (r.includes("frontend") || r.includes("front-end") || r.includes("ui")) return ["ui", "react", "performance"];
  if (r.includes("backend") || r.includes("back-end") || r.includes("api")) return ["apis", "scalability", "observability"];
  if (r.includes("product")) return ["prioritization", "stakeholders", "experiments"];
  if (r.includes("project") || r.includes("delivery")) return ["planning", "risks", "communication"];
  if (r.includes("security") || r.includes("cyber")) return ["risk", "incident_response", "compliance"];
  if (r.includes("devops") || r.includes("cloud") || r.includes("sre")) return ["reliability", "deployments", "monitoring"];
  if (r.includes("qa") || r.includes("test")) return ["quality", "automation", "coverage"];
  if (r.includes("support") || r.includes("success") || r.includes("customer")) return ["empathy", "escalations", "prioritization"];
  return ["communication", "problem_solving", "judgment"];
}

function hash(str) {
  return str.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

function buildGenericQuestions(role, locale) {
  const lang = locale === "ar" ? "ar" : "en";
  const t = (en, ar) => (lang === "ar" ? ar : en);
  const skills = inferSkills(role);
  const templates = [
    {
      scenario: (r, s) => t(
        `A critical incident hits production owned by ${r}. Dashboards show errors for a key user flow.`,
        `حادث حرج يضرب الإنتاج المسؤول عنه ${r} مع أخطاء في مسار مستخدم رئيسي.`
      ),
      questionEn: (r, s) => `As the ${r}, how do you triage, communicate, and restore service while protecting users?`,
      questionAr: (r, s) => `بصفتك ${r}، كيف تُقيّم الحالة وتبلّغ وتعيد الخدمة مع حماية المستخدمين؟`,
      skills: ["incident_response", "communication", skills[0]]
    },
    {
      scenario: (r, s) => t(
        `A VP demands a last-minute change that conflicts with your roadmap.`,
        `نائب الرئيس يطلب تغييراً مفاجئاً يتعارض مع خارطة الطريق.`
      ),
      questionEn: (r, s) => `How do you handle the escalation, quantify impact, and decide whether to ship for ${r}?`,
      questionAr: (r, s) => `كيف تتعامل مع التصعيد، وتقيّم الأثر، وتقرر التنفيذ لدور ${r}?`,
      skills: ["stakeholder_management", "prioritization", skills[1]]
    },
    {
      scenario: (r, s) => t(
        `A key metric is slipping because a dependency team is late.`,
        `مؤشر أساسي يتراجع بسبب تأخر فريق تابع.`
      ),
      questionEn: (r, s) => `As ${r}, what do you do to recover the goal without burning trust?`,
      questionAr: (r, s) => `كـ${r}، ماذا تفعل لاستعادة الهدف دون خسارة الثقة؟`,
      skills: ["collaboration", "risk_management", "communication"]
    },
    {
      scenario: (r, s) => t(
        `You discover a quality gap in a deliverable about to launch.`,
        `تكتشف فجوة جودة في تسليم على وشك الإطلاق.`
      ),
      questionEn: (r, s) => `How do you decide ship/hold, and what safeguards do you add for ${r} work?`,
      questionAr: (r, s) => `كيف تقرر الإطلاق أو الإيقاف، وما الضمانات التي تضيفها لعمل ${r}؟`,
      skills: ["quality", "judgment", skills[2]]
    },
    {
      scenario: (r, s) => t(
        `Team morale dipped after repeated scope changes.`,
        `معنويات الفريق انخفضت بعد تغييرات متكررة في النطاق.`
      ),
      questionEn: (r, s) => `How do you stabilize scope, reset expectations, and keep the team engaged as ${r}?`,
      questionAr: (r, s) => `كيف تثبّت النطاق، تعيد ضبط التوقعات، وتحافظ على تفاعل الفريق كـ${r}؟`,
      skills: ["leadership", "communication", "planning"]
    },
    {
      scenario: (r, s) => t(
        `A customer reports a severe bug affecting their revenue.`,
        `عميل يبلغ عن عطل حاد يؤثر على إيراداته.`
      ),
      questionEn: (r, s) => `How do you respond, prioritize, and prevent recurrence in your ${r} scope?`,
      questionAr: (r, s) => `كيف ترد وتحدد الأولوية وتمنع التكرار ضمن نطاق ${r}؟`,
      skills: ["customer_focus", "problem_solving", skills[0]]
    },
    {
      scenario: (r, s) => t(
        `You need to hand off work to another time zone under tight timelines.`,
        `يجب عليك تسليم العمل لمنطقة زمنية أخرى بجدول ضيق.`
      ),
      questionEn: (r, s) => `What does a robust handoff look like for ${r} to avoid rework and delays?`,
      questionAr: (r, s) => `كيف يكون تسليم العمل المتقن لدور ${r} لتجنب إعادة العمل والتأخير؟`,
      skills: ["documentation", "communication", "planning"]
    }
  ];

  const seed = hash(role);
  const pickOrder = [...templates].sort((a, b) => (hash(role + a.scenario(role)) % 1000) - (hash(role + b.scenario(role)) % 1000));
  const chosen = pickOrder.slice(0, 5);

  return chosen.map((tpl, idx) => ({
    id: `role-${idx + 1}`,
    scenario: tpl.scenario(role, skills),
    questionEn: tpl.questionEn(role, skills),
    questionAr: tpl.questionAr(role, skills),
    options: [
      { id: "a", textEn: t("Clarify impact, propose options with owners and deadlines", "توضيح الأثر، طرح خيارات مع مسؤولين ومواعيد"), textAr: t("Clarify impact, propose options with owners and deadlines", "توضيح الأثر، طرح خيارات مع مسؤولين ومواعيد"), score: 90 },
      { id: "b", textEn: t("Wait for more info before acting", "الانتظار لمزيد من المعلومات قبل التحرك"), textAr: t("Wait for more info before acting", "الانتظار لمزيد من المعلومات قبل التحرك"), score: 40 },
      { id: "c", textEn: t("Act alone without aligning stakeholders", "التحرك منفرداً دون مواءمة أصحاب المصلحة"), textAr: t("Act alone without aligning stakeholders", "التحرك منفرداً دون مواءمة أصحاب المصلحة"), score: 30 },
      { id: "d", textEn: t("Escalate without options or data", "التصعيد دون خيارات أو بيانات"), textAr: t("Escalate without options or بيانات"), score: 55 }
    ],
    timeLimit: 120,
    skillsTested: tpl.skills
  }));
}

function getMockBehavioralQuestions(role, locale) {
  // Always generate role-tailored questions to avoid repetition across roles
  return buildGenericQuestions(role, locale);
}

module.exports = { handler };
