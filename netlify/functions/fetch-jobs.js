/**
 * Fetch real jobs from JSearch API
 * Pulls actual job listings from LinkedIn, Indeed, etc.
 */

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

exports.handler = async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" });
  }

  // Get query parameters
  const queryString = event.rawQuery || event.queryStringParameters || {};
  const role = queryString.role || "Frontend Developer";
  const location = queryString.location || "Saudi Arabia";
  const page = queryString.page || "1";
  const num_pages = queryString.num_pages || "1";

  try {
    // If RapidAPI key not available, return mock jobs (fallback)
    if (!process.env.RAPIDAPI_KEY) {
      console.warn("[fetch-jobs] No RAPIDAPI_KEY, returning mock jobs");
      return json(200, {
        data: getMockJobs(role, location),
        source: "mock",
        message: "Using mock jobs (configure RAPIDAPI_KEY for real jobs)"
      });
    }

    // Fetch from JSearch API (RapidAPI)
    const searchQuery = `${role} ${location}`.trim();
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=${page}&num_pages=${num_pages}`;

    console.log("[fetch-jobs] Fetching from JSearch API", {
      role,
      location,
      query: searchQuery
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
      }
    });

    if (!response.ok) {
      console.error("[fetch-jobs] API failed", {
        status: response.status,
        statusText: response.statusText
      });
      // Fall back to mock jobs
      return json(200, {
        data: getMockJobs(role, location),
        source: "mock",
        message: "Using mock jobs (API unavailable)"
      });
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      console.warn("[fetch-jobs] Unexpected API response format");
      return json(200, {
        data: getMockJobs(role, location),
        source: "mock",
        message: "Using mock jobs (no results from API)"
      });
    }

    // Transform API response to our format
    const jobs = data.data.map((job, index) => formatJobFromApi(job, index));

    return json(200, {
      data: jobs,
      source: "jsearch",
      total: data.data.length,
      message: "Real jobs from JSearch API"
    });

  } catch (error) {
    console.error("[fetch-jobs] Error fetching jobs", {
      message: error && error.message ? error.message : "Unknown error"
    });

    // Fall back to mock jobs
    return json(200, {
      data: getMockJobs(role, location),
      source: "mock",
      message: "Using mock jobs (error fetching real jobs)"
    });
  }
};

/**
 * Format job from JSearch API to our format
 */
function formatJobFromApi(job, index) {
  return {
    id: `job-api-${index}`,
    titleEn: job.job_title || "Position",
    titleAr: job.job_title || "وظيفة",
    company: job.employer_name || "Company",
    city: extractCity(job.job_city || job.job_country || ""),
    location: job.job_city || job.job_country || "Remote",
    country: job.job_country || "Saudi Arabia",
    type: detectJobType(job.job_employment_type || ""),
    remote: (job.job_is_remote === true || job.job_employment_type === "FULLTIME"),
    salary: job.job_min_salary && job.job_max_salary 
      ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency || "USD"}`
      : "Competitive",
    skills: extractSkills(job.job_description || ""),
    descriptionEn: job.job_description ? truncate(job.job_description, 300) : "",
    descriptionAr: job.job_description ? truncate(job.job_description, 300) : "",
    url: job.job_apply_link || job.job_google_link || "",
    company_logo: job.employer_logo || "",
    posted_date: job.job_posted_at_datetime_utc || new Date().toISOString(),
    source: "jsearch"
  };
}

/**
 * Extract city from location string
 */
function extractCity(location) {
  if (!location) return "Remote";
  const cities = ["Riyadh", "Jeddah", "Dhahran", "Tabuk", "Dammam", "Khobar", "Abha"];
  const found = cities.find(city => location.toLowerCase().includes(city.toLowerCase()));
  return found || location.split(",")[0] || "Remote";
}

/**
 * Detect job type from employment type
 */
function detectJobType(employmentType) {
  if (!employmentType) return "Full-time";
  const type = employmentType.toLowerCase();
  if (type.includes("part")) return "Part-time";
  if (type.includes("contract")) return "Contract";
  if (type.includes("temp")) return "Temporary";
  if (type.includes("freelance")) return "Freelance";
  return "Full-time";
}

/**
 * Extract skills from job description
 */
function extractSkills(description) {
  if (!description) return [];
  
  const skillKeywords = [
    "javascript", "react", "vue", "angular", "node", "python", "java", "c++",
    "sql", "mongodb", "postgresql", "docker", "kubernetes", "aws", "azure",
    "git", "api", "rest", "graphql", "typescript", "html", "css",
    "communication", "teamwork", "leadership", "project management",
    "agile", "scrum", "excel", "power bi", "tableau", "analytics",
    "data analysis", "machine learning", "ai", "tensorflow", "pytorch",
    "devops", "ci/cd", "jenkins", "linux", "unix", "bash",
    "ui design", "ux design", "figma", "adobe", "design thinking"
  ];

  const text = description.toLowerCase();
  const found = skillKeywords.filter(skill => 
    text.includes(skill.toLowerCase())
  );

  // Return unique skills, max 8
  return [...new Set(found)].slice(0, 8).map(skill => 
    skill.charAt(0).toUpperCase() + skill.slice(1)
  );
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Mock jobs (fallback when API not available)
 */
function getMockJobs(role, location) {
  return [
    {
      id: "job-mock-1",
      titleEn: `${role} - Riyadh`,
      titleAr: `${role} - الرياض`,
      company: "Saudi Tech Company",
      city: "Riyadh",
      location: "Riyadh, Saudi Arabia",
      country: "Saudi Arabia",
      type: "Full-time",
      remote: true,
      salary: "12,000 - 18,000 SAR",
      skills: ["JavaScript", "Problem Solving", "Communication"],
      descriptionEn: `Looking for a talented ${role}. Competitive salary and benefits. Join our growing team.`,
      descriptionAr: `نبحث عن ${role} موهوب. راتب وميزات تنافسية. انضم إلى فريقنا المتنامي.`,
      url: "https://example.com/apply",
      company_logo: "https://via.placeholder.com/100",
      posted_date: new Date().toISOString(),
      source: "mock"
    },
    {
      id: "job-mock-2",
      titleEn: `Senior ${role}`,
      titleAr: `${role} أقدم`,
      company: "International Company",
      city: "Jeddah",
      location: "Jeddah, Saudi Arabia",
      country: "Saudi Arabia",
      type: "Full-time",
      remote: false,
      salary: "15,000 - 22,000 SAR",
      skills: ["Leadership", "Team Management", "Strategic Planning"],
      descriptionEn: `Seeking an experienced ${role} to lead our technical team.`,
      descriptionAr: `نبحث عن ${role} ذو خبرة لقيادة فريقنا التقني.`,
      url: "https://example.com/apply",
      company_logo: "https://via.placeholder.com/100",
      posted_date: new Date().toISOString(),
      source: "mock"
    }
  ];
}
