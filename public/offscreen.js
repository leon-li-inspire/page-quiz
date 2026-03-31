import * as pdfjsLib from "./pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";

console.log("[Offscreen] pdf.js loaded, version:", pdfjsLib.version);
console.log("[Offscreen] Registering message listener...");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== "offscreen") return;

  console.log("[Offscreen] Received message type:", message.type);

  if (message.type === "PING") {
    console.log("[Offscreen] Responding to PING");
    sendResponse({ pong: true });
    return;
  }

  if (message.type === "EXTRACT_PDF") {
    console.log(
      "[Offscreen] Fetching and processing PDF from URL:",
      message.url,
    );
    fetchAndExtractText(message.url)
      .then((result) => {
        console.log(
          "[Offscreen] Extraction complete, text:",
          result.text.length,
          "chars",
        );
        sendResponse({ success: true, text: result.text });
      })
      .catch((err) => {
        console.error("[Offscreen] Error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

console.log("[Offscreen] Message listener registered and ready.");

async function fetchAndExtractText(url) {
  const cleanUrl = url.split("#")[0];
  console.log("[Offscreen] Fetching PDF from:", cleanUrl);

  const response = await fetch(cleanUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch PDF: " + response.status);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(
    "[Offscreen] PDF fetched, size:",
    arrayBuffer.byteLength,
    "bytes",
  );

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    disableAutoFetch: true,
    isEvalSupported: false,
  }).promise;
  console.log("[Offscreen] PDF parsed, pages:", pdf.numPages);

  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    console.log("[Offscreen] Page", i, "text:", pageText.length, "chars");
    fullText += pageText + "\n\n";
  }

  fullText = fullText.trim();

  if (fullText.length < 50) {
    throw new Error(
      "Could not extract readable text from this PDF. It may be a scanned document or image-based PDF without selectable text. Try a PDF with selectable text instead.",
    );
  }

  return { text: fullText };
}
