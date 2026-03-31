// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    handleGetPageContent(sendResponse);
    return true; // async response
  }

  if (message.type === "GENERATE_QUIZ") {
    handleGenerateQuiz(
      message.config,
      message.pageContent,
      message.pageInfo,
      sendResponse,
    );
    return true;
  }

  if (message.type === "SAVE_QUIZ") {
    handleSaveQuiz(message.url, message.quiz, sendResponse);
    return true;
  }

  if (message.type === "GET_SAVED_QUIZ") {
    handleGetSavedQuiz(message.url, sendResponse);
    return true;
  }

  if (message.type === "SAVE_QUESTION") {
    handleSaveQuestion(message.url, message.question, sendResponse);
    return true;
  }

  if (message.type === "GET_SAVED_QUESTIONS") {
    handleGetSavedQuestions(message.url, sendResponse);
    return true;
  }

  if (message.type === "GET_CONFIG") {
    handleGetConfig(sendResponse);
    return true;
  }
});

// Check if a URL points to a PDF
function isPdfUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    // Direct .pdf extension
    if (path.endsWith(".pdf")) return true;
    // Common PDF URL patterns (arxiv, etc.)
    if (path.includes("/pdf/")) return true;
    // URLs with .pdf before query/fragment/version suffix (e.g., paper.pdf?dl=1)
    if (path.match(/\.pdf[^/]*$/)) return true;
    return false;
  } catch {
    return false;
  }
}

// Extract text from a PDF using an offscreen document (pdf.js can't run in service workers)
async function extractPdfText(url) {
  console.log("[PDF] Starting extraction for:", url);

  // Step 1: Ensure offscreen document exists
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });
    if (existingContexts.length === 0) {
      console.log("[PDF] Creating offscreen document...");
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["DOM_PARSER"],
        justification: "Parse PDF content using pdf.js",
      });
      console.log("[PDF] Offscreen document created, waiting for init...");
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch (err) {
    console.error("[PDF] Error creating offscreen document:", err);
    throw new Error("Failed to create offscreen document: " + err.message);
  }

  // Step 2: Send URL to offscreen document — it fetches and extracts text
  console.log("[PDF] Sending EXTRACT_PDF message to offscreen...");
  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "EXTRACT_PDF",
    url: url,
  });

  console.log(
    "[PDF] Got response: success=" +
      (response ? response.success : "null") +
      " text=" +
      (response && response.text ? response.text.length : 0) +
      " chars",
  );

  if (!response || !response.success) {
    throw new Error(
      (response && response.error) || "Failed to extract PDF text",
    );
  }

  return { text: response.text || "", images: null };
}

// Extract page content by injecting a script into the active tab
async function handleGetPageContent(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      sendResponse({ error: "No active tab found" });
      return;
    }

    // Handle PDF files
    if (isPdfUrl(tab.url)) {
      try {
        const pdfResult = await extractPdfText(tab.url);
        let content = (pdfResult.text || "")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]+/g, " ")
          .trim()
          .substring(0, 10000);

        if (!content || content.length < 50) {
          sendResponse({
            error:
              "Could not extract readable text from this PDF. It may be a scanned document or image-based PDF without embedded text.",
          });
          return;
        }

        const title = tab.title || tab.url.split("/").pop() || "PDF Document";
        sendResponse({
          success: true,
          data: { content, title, url: tab.url },
        });
      } catch (err) {
        sendResponse({
          error: `Failed to extract PDF content: ${err.message}`,
        });
      }
      return;
    }

    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Remove noisy elements before extracting text
          const noisySelectors = [
            "nav",
            "header",
            "footer",
            '[role="navigation"]',
            '[role="banner"]',
            '[role="contentinfo"]',
            ".comments",
            "#comments",
            '[class*="comment"]',
            '[class*="Comment"]',
            ".sidebar",
            "#sidebar",
            '[class*="sidebar"]',
            '[class*="Sidebar"]',
            ".nav",
            ".menu",
            ".footer",
            ".header",
            '[class*="cookie"]',
            '[class*="popup"]',
            '[class*="modal"]',
            '[class*="banner"]',
            '[class*="ad-"]',
            '[class*="social"]',
            '[class*="share"]',
            '[class*="related"]',
            '[class*="newsletter"]',
          ];

          // Clone the document body so we can remove noisy elements without affecting the page
          const clone = document.body.cloneNode(true);
          for (const sel of noisySelectors) {
            clone.querySelectorAll(sel).forEach((el) => el.remove());
          }

          // Try progressively broader selectors on the cleaned clone
          const contentSelectors = [
            "article",
            '[role="article"]',
            ".post-content",
            ".article-content",
            ".entry-content",
            ".blog-content",
            ".prose",
            ".markdown-body",
            ".post-body",
            ".article-body",
            ".content-body",
            "main article",
            "main",
            '[role="main"]',
          ];

          let content = "";
          for (const selector of contentSelectors) {
            const el = clone.querySelector(selector);
            if (el && el.innerText && el.innerText.trim().length > 100) {
              content = el.innerText.trim();
              break;
            }
          }

          // Fallback: use the cleaned clone's body text
          if (!content || content.trim().length < 100) {
            content = clone.innerText || "";
          }

          // Clean up the text: collapse whitespace, remove excessive blank lines
          content = content
            .replace(/\n{3,}/g, "\n\n")
            .replace(/[ \t]+/g, " ")
            .trim();

          // Truncate to ~10000 chars to stay within token limits
          content = content.substring(0, 10000);

          return {
            content,
            title: document.title,
            url: window.location.href,
          };
        },
      });

      if (results && results[0]) {
        sendResponse({ success: true, data: results[0].result });
      } else {
        sendResponse({ error: "Failed to extract content" });
      }
    } catch (scriptErr) {
      console.warn(
        "[Content] Script injection failed, trying PDF extraction as fallback:",
        scriptErr.message,
      );
      // Fallback: if script injection fails, try PDF extraction
      // This handles cases where Chrome's PDF viewer blocks script injection
      try {
        const pdfResult = await extractPdfText(tab.url);
        let content = (pdfResult.text || "")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]+/g, " ")
          .trim()
          .substring(0, 10000);

        if (!content || content.length < 50) {
          sendResponse({
            error:
              "Could not extract content. If this is a PDF, it may be scanned/image-based without embedded text.",
          });
          return;
        }

        const title = tab.title || tab.url.split("/").pop() || "PDF Document";
        sendResponse({
          success: true,
          data: { content, title, url: tab.url },
        });
      } catch (pdfErr) {
        sendResponse({
          error:
            scriptErr.message +
            " (PDF fallback also failed: " +
            pdfErr.message +
            ")",
        });
      }
    }
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// Generate quiz using LLM
async function handleGenerateQuiz(config, pageContent, pageInfo, sendResponse) {
  try {
    // Get LLM config from storage
    const stored = await chrome.storage.local.get([
      "llmProvider",
      "llmModel",
      "apiKey",
      "awsRegion",
    ]);

    if (!stored.apiKey) {
      sendResponse({
        error:
          "No API key configured. Please set up your LLM provider in the extension options.",
      });
      return;
    }

    const { numQuestions, difficulty } = config;

    const systemPrompt = `You are a JSON API that generates quizzes. You MUST respond with ONLY a JSON object — no explanations, no commentary, no markdown, no code fences, no text before or after the JSON.

Generate exactly ${numQuestions} multiple-choice questions at "${difficulty}" difficulty based on the provided web page content.

Difficulty guidelines:
- easy: Basic recall and comprehension. Answers are directly stated in the text.
- medium: Understanding and application. May require connecting ideas from different parts.
- hard: Analysis and inference. Requires critical thinking and reading between the lines.

Your entire response must be exactly this JSON structure:
{"questions":[{"id":1,"question":"Question text?","options":["A","B","C","D"],"correctAnswer":0,"explanation":"Why this is correct."}]}

Rules:
- correctAnswer is the zero-based index (0-3) of the correct option
- Each question must have exactly 4 options
- Do NOT wrap in markdown code blocks
- Do NOT include any text outside the JSON object
- Start your response with { and end with }`;

    const userPrompt = `Web page title: ${pageInfo.title}\n\nWeb page content:\n${pageContent}`;

    let responseText;
    const provider = stored.llmProvider || "openai";
    const model =
      stored.llmModel ||
      (provider === "openai"
        ? "gpt-4o-mini"
        : provider === "anthropic"
          ? "claude-sonnet-4-20250514"
          : "anthropic.claude-sonnet-4-20250514-v1:0");

    if (provider === "openai") {
      responseText = await callOpenAI(
        stored.apiKey,
        model,
        systemPrompt,
        userPrompt,
      );
    } else if (provider === "anthropic") {
      responseText = await callAnthropic(
        stored.apiKey,
        model,
        systemPrompt,
        userPrompt,
      );
    } else if (provider === "bedrock") {
      responseText = await callBedrock(
        stored.apiKey,
        model,
        stored.awsRegion || "us-east-1",
        systemPrompt,
        userPrompt,
      );
    }

    // Extract and parse JSON from the response
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText);
    sendResponse({ success: true, questions: parsed.questions });
  } catch (err) {
    console.error("Quiz generation error:", err);
    sendResponse({ error: `Failed to generate quiz: ${err.message}` });
  }
}

// Extract JSON from LLM response that may contain surrounding text or markdown
function extractJSON(text) {
  // If it's already valid JSON, return as-is
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    // Continue to extraction
  }

  // Try to extract JSON from markdown code blocks: ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      JSON.parse(codeBlockMatch[1].trim());
      return codeBlockMatch[1].trim();
    } catch (e) {
      // Continue
    }
  }

  // Try to find a JSON object by matching the outermost { ... }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch (e) {
      // Continue
    }
  }

  // Nothing worked — throw with a helpful message
  const preview = text.substring(0, 120).replace(/\n/g, " ");
  throw new Error(
    `Could not extract valid JSON from LLM response. Response starts with: "${preview}..."`,
  );
}

async function callOpenAI(apiKey, model, systemPrompt, userPrompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, model, systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callBedrock(
  bearerToken,
  model,
  region,
  systemPrompt,
  userPrompt,
) {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Bedrock API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Save individual question to storage
async function handleSaveQuestion(url, question, sendResponse) {
  try {
    const key = `saved_questions_${btoa(url).substring(0, 50)}`;
    const stored = await chrome.storage.local.get([key]);
    const questions = stored[key] || [];
    // Avoid duplicates by checking question id
    const exists = questions.some(
      (q) => q.id === question.id && q.savedAt === question.savedAt,
    );
    if (!exists) {
      questions.push(question);
      await chrome.storage.local.set({ [key]: questions });
    }
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// Save quiz to storage
async function handleSaveQuiz(url, quiz, sendResponse) {
  try {
    const key = `quiz_${btoa(url).substring(0, 50)}`;
    const stored = await chrome.storage.local.get([key]);
    const quizzes = stored[key] || [];
    quizzes.push({
      ...quiz,
      timestamp: new Date().toISOString(),
    });
    await chrome.storage.local.set({ [key]: quizzes });
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// Get saved quiz for a URL
async function handleGetSavedQuiz(url, sendResponse) {
  try {
    const key = `quiz_${btoa(url).substring(0, 50)}`;
    const stored = await chrome.storage.local.get([key]);
    const quizzes = stored[key] || [];
    // Return the most recent quiz
    const latest = quizzes.length > 0 ? quizzes[quizzes.length - 1] : null;
    sendResponse({ success: true, quiz: latest });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// Get saved questions for a URL
async function handleGetSavedQuestions(url, sendResponse) {
  try {
    const key = `saved_questions_${btoa(url).substring(0, 50)}`;
    const stored = await chrome.storage.local.get([key]);
    const questions = stored[key] || [];
    sendResponse({ success: true, questions });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// Get LLM config
async function handleGetConfig(sendResponse) {
  try {
    const config = await chrome.storage.local.get([
      "llmProvider",
      "llmModel",
      "apiKey",
      "awsRegion",
    ]);
    sendResponse({ success: true, config });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
