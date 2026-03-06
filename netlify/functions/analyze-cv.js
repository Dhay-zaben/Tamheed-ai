const Busboy = require("busboy");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "OPTIONS, POST"
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers["content-type"] || event.headers["Content-Type"];
    if (!contentType) {
      reject(new Error("missing-content-type"));
      return;
    }

    const busboy = Busboy({
      headers: {
        "content-type": contentType
      }
    });

    const result = {
      fields: {},
      file: null,
      fileSize: 0
    };

    busboy.on("file", (fieldName, fileStream, info) => {
      const chunks = [];
      fileStream.on("data", (chunk) => {
        chunks.push(chunk);
        result.fileSize += chunk.length;
      });
      fileStream.on("end", () => {
        result.file = {
          fieldName,
          filename: info.filename,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks)
        };
      });
    });

    busboy.on("field", (fieldName, value) => {
      result.fields[fieldName] = value;
    });

    busboy.on("error", reject);
    busboy.on("finish", () => resolve(result));

    const bodyBuffer = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8");
    busboy.end(bodyBuffer);
  });
}

async function extractTextFromRequest(event) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";

  if (contentType.includes("multipart/form-data")) {
    console.log("[analyze-cv] stage=upload type=multipart");
    const { fields, file, fileSize } = await parseMultipart(event);
    console.log("[analyze-cv] stage=upload parsed", {
      fileSize,
      hasFile: Boolean(file),
      fieldName: file ? file.fieldName : null,
      mimeType: file ? file.mimeType : null
    });
    const targetRole = (fields && (fields.target_role || fields.targetRole)) || "";
    if (fields && fields.text && fields.text.trim()) {
      return {
        text: fields.text.trim(),
        fileSize,
        targetRole
      };
    }
    if (!file || !file.buffer || !file.buffer.length) {
      throw Object.assign(new Error("missing-input"), { statusCode: 400 });
    }
    if (file.mimeType !== "application/pdf") {
      throw Object.assign(new Error("invalid-file-type"), { statusCode: 400 });
    }
    try {
      console.log("[analyze-cv] stage=parsing type=pdf", { fileSize, targetRole });
      const parsed = await pdfParse(file.buffer);
      return {
        text: (parsed.text || "").trim(),
        fileSize,
        targetRole
      };
    } catch (error) {
      console.error("[analyze-cv] stage=parsing failed", {
        message: error && error.message ? error.message : "Unknown PDF parsing error"
      });
      throw Object.assign(new Error("pdf-parse-failed"), { statusCode: 422 });
    }
  }

  if (contentType.includes("application/json")) {
    console.log("[analyze-cv] stage=upload type=json");
    const payload = JSON.parse(event.body || "{}");
    const targetRole = (payload && (payload.target_role || payload.targetRole)) || "";
    if (payload && typeof payload.text === "string" && payload.text.trim()) {
      if (payload.fileBase64) {
        try {
          const pdfBuffer = Buffer.from(payload.fileBase64, "base64");
          console.log("[analyze-cv] stage=upload parsed-base64", {
            fileSize: pdfBuffer.length,
            contentType: payload.contentType || "application/pdf"
          });
          const parsed = await pdfParse(pdfBuffer);
          return {
            text: (parsed.text || "").trim(),
            fileSize: pdfBuffer.length,
            targetRole
          };
        } catch (error) {
          console.error("[analyze-cv] stage=parsing failed", {
            message: error && error.message ? error.message : "Unknown PDF parsing error"
          });
          throw Object.assign(new Error("pdf-parse-failed"), { statusCode: 422 });
        }
      }
      return {
        text: payload.text.trim(),
        fileSize: 0,
        targetRole
      };
    }
    if (payload && payload.fileBase64) {
      try {
        const pdfBuffer = Buffer.from(payload.fileBase64, "base64");
        console.log("[analyze-cv] stage=upload parsed-base64", {
          fileSize: pdfBuffer.length,
          contentType: payload.contentType || "application/pdf"
        });
        const parsed = await pdfParse(pdfBuffer);
        return {
          text: (parsed.text || "").trim(),
        fileSize: pdfBuffer.length,
        targetRole
        };
      } catch (error) {
        console.error("[analyze-cv] stage=parsing failed", {
          message: error && error.message ? error.message : "Unknown PDF parsing error"
        });
        throw Object.assign(new Error("pdf-parse-failed"), { statusCode: 422 });
      }
    }
    throw Object.assign(new Error("missing-input"), { statusCode: 400 });
  }

  if (contentType.includes("text/plain")) {
    console.log("[analyze-cv] stage=upload type=text");
    const text = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8").toString("utf8").trim();
    if (text) {
      return {
        text,
        fileSize: 0,
        targetRole: ""
      };
    }
  }

  throw Object.assign(new Error("missing-input"), { statusCode: 400 });
}

exports.handler = async function handler(event) {
  const bodySize = event.body ? event.body.length : 0;
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  console.log("[analyze-cv] request", {
    method: event.httpMethod,
    contentType,
    bodySize,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY)
  });

  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: "Missing OPENAI_API_KEY" });
  }

  let cvText = "";
  let fileSize = 0;
  let targetRole = "";

  try {
    const extracted = await extractTextFromRequest(event);
    cvText = extracted.text;
    fileSize = extracted.fileSize || 0;
    targetRole = extracted.targetRole || "";
  } catch (error) {
    console.error("[analyze-cv] stage=upload failed", {
      message: error && error.message ? error.message : "Unknown upload error"
    });
    if (error.message === "missing-input") {
      return json(400, { error: "No CV text or file was provided." });
    }
    if (error.message === "invalid-file-type") {
      return json(400, { error: "Only PDF files are supported." });
    }
    if (error.message === "pdf-parse-failed") {
      return json(422, { error: "Failed to extract text from the PDF." });
    }
    return json(error.statusCode || 500, { error: "Unable to process the request." });
  }

  if (!cvText || cvText.length < 20) {
    return json(422, { error: "The extracted CV text is too short to analyze." });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const models = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"];
    let completion = null;
    let lastError = null;

    for (const model of models) {
      try {
        console.log("[analyze-cv] stage=openai request", {
          model,
          fileSize,
          textLength: cvText.length
        });
        completion = await client.chat.completions.create({
          model,
          response_format: {
            type: "json_object"
          },
          messages: [
            {
              role: "system",
              content: "You are an expert CV analyst specializing in job market readiness assessment. Your task is to provide HIGHLY ACCURATE analysis of candidates' capability to perform specific roles. You MUST consider: (1) exact skill-to-job matching, (2) experience level alignment, (3) gap identification, and (4) realistic capability scoring. Always condition analysis strictly on the TARGET ROLE. Return ONLY valid JSON with keys: summary (string), target_role (string), job_fit_score (number 0-100), capability_assessment (string explaining if they CAN do the job), suggested_role (string), strengths (array of top 3 role-specific strengths), weaknesses (array of top 3 role-specific gaps), skills (array of all detected skills), missing_skills (array of required skills NOT in CV), suggestions (array of 4 actionable improvement steps). Do not include any additional keys, markdown, or commentary."
            },
            {
              role: "user",
              content: `CRITICAL: You must assess whether this candidate can realistically perform the target role based on their CV.\n\nTarget job role: ${targetRole || "Not specified - infer from CV context"}.\n\nAnalysis tasks:\n1) Provide an accurate 3-4 sentence summary of the candidate's profile.\n2) Assess job capability: Can they perform this target role? (yes/no with reasoning)\n3) Score their fit for the target role (0-100, where 70+ = capable, 50-69 = needs development, <50 = significant gaps).\n4) List top 3 strengths SPECIFIC to the target role requirements.\n5) List top 3 weaknesses or critical gaps for this role.\n6) Extract ALL technical and soft skills detected in the CV.\n7) List skills MISSING that are typically required for this role (be specific to role).\n8) Provide 4 practical, actionable suggestions to improve fit for the target role.\n\nIMPORTANT: Be realistic and accurate. If they lack core requirements for the role, say so. If they are well-suited, acknowledge it.\n\nCV TEXT:\n${cvText}`
            }
          ]
        });
        break;
      } catch (error) {
        lastError = error;
        console.error("[analyze-cv] stage=openai failed", {
          model,
          name: error && error.name,
          code: error && error.code,
          status: error && error.status,
          message: error && error.message
        });
      }
    }

    if (!completion) {
      throw lastError || new Error("openai-request-failed");
    }

    const rawOutput = completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
      ? completion.choices[0].message.content
      : "{}";
    const parsed = JSON.parse(rawOutput);

    return json(200, {
      summary: parsed.summary,
      target_role: parsed.target_role || targetRole || null,
      suggested_role: parsed.suggested_role,
      job_fit_score: typeof parsed.job_fit_score === "number" ? parsed.job_fit_score : null,
      capability_assessment: parsed.capability_assessment || null,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      raw_text_preview: cvText.slice(0, 1200)
    });
  } catch (error) {
    console.error("[analyze-cv] stage=openai final-failure", {
      name: error && error.name,
      code: error && error.code,
      status: error && error.status,
      message: error && error.message
    });
    return json(502, {
      error: "OpenAI analysis failed.",
      details: {
        status: error && error.status ? error.status : 502,
        code: error && error.code ? error.code : null,
        message: error && error.message ? error.message : "Unknown OpenAI error"
      }
    });
  }
};
