const Busboy = require("busboy");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
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
      file: null
    };

    busboy.on("file", (fieldName, fileStream, info) => {
      const chunks = [];
      fileStream.on("data", (chunk) => chunks.push(chunk));
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
    const { fields, file } = await parseMultipart(event);
    if (fields && fields.text && fields.text.trim()) {
      return fields.text.trim();
    }
    if (!file || !file.buffer || !file.buffer.length) {
      throw Object.assign(new Error("missing-input"), { statusCode: 400 });
    }
    if (file.mimeType !== "application/pdf") {
      throw Object.assign(new Error("invalid-file-type"), { statusCode: 400 });
    }
    try {
      const parsed = await pdfParse(file.buffer);
      return (parsed.text || "").trim();
    } catch (error) {
      throw Object.assign(new Error("pdf-parse-failed"), { statusCode: 422 });
    }
  }

  if (contentType.includes("application/json")) {
    const payload = JSON.parse(event.body || "{}");
    if (payload && typeof payload.text === "string" && payload.text.trim()) {
      return payload.text.trim();
    }
    throw Object.assign(new Error("missing-input"), { statusCode: 400 });
  }

  if (contentType.includes("text/plain")) {
    const text = Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8").toString("utf8").trim();
    if (text) {
      return text;
    }
  }

  throw Object.assign(new Error("missing-input"), { statusCode: 400 });
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: "Missing OPENAI_API_KEY" });
  }

  let cvText = "";

  try {
    cvText = await extractTextFromRequest(event);
  } catch (error) {
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
    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You analyze CVs for a Saudi job-readiness platform. Return strict JSON only with keys: summary, suggested_role, skills, missing_skills, suggestions."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this CV text. Summarize the candidate, extract key skills, identify the most suitable job role, identify missing skills for a mid-level version of that role, and provide practical improvement suggestions.\n\nCV:\n${cvText}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "cv_analysis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              suggested_role: { type: "string" },
              skills: {
                type: "array",
                items: { type: "string" }
              },
              missing_skills: {
                type: "array",
                items: { type: "string" }
              },
              suggestions: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["summary", "suggested_role", "skills", "missing_skills", "suggestions"]
          }
        }
      }
    });

    const rawOutput = completion.output_text || "{}";
    const parsed = JSON.parse(rawOutput);

    return json(200, {
      summary: parsed.summary,
      suggested_role: parsed.suggested_role,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      raw_text_preview: cvText.slice(0, 1200)
    });
  } catch (error) {
    return json(502, {
      error: "OpenAI analysis failed."
    });
  }
};
