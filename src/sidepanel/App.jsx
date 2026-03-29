import React, { useState, useEffect, useCallback } from "react";
import HomeScreen from "./components/HomeScreen";
import LoadingScreen from "./components/LoadingScreen";
import QuizScreen from "./components/QuizScreen";
import ResultsScreen from "./components/ResultsScreen";
import ReviewScreen from "./components/ReviewScreen";

const isExtension =
  typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage;

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    if (!isExtension) {
      // Mock responses for development
      if (message.type === "GET_PAGE_CONTENT") {
        resolve({
          success: true,
          data: {
            content: "Sample content for testing.",
            title:
              "Test Page — Example Website with a Really Long Title That Should Be Truncated",
            url: "https://example.com",
          },
        });
      } else if (message.type === "GENERATE_QUIZ") {
        setTimeout(() => {
          resolve({
            success: true,
            questions: Array.from(
              { length: message.config.numQuestions },
              (_, i) => ({
                id: i + 1,
                question: `Sample question ${i + 1} about the page content? This might be a longer question to test how the layout handles multi-line text.`,
                options: [
                  "Option A — This is the first choice",
                  "Option B — This is the second choice",
                  "Option C — This is the third choice",
                  "Option D — This is the fourth choice",
                ],
                correctAnswer: i % 4,
                explanation:
                  "This is the explanation for the correct answer. It provides context about why this particular option is correct and helps the user learn from the question.",
              }),
            ),
          });
        }, 2000);
      } else if (message.type === "GET_SAVED_QUIZ") {
        resolve({ success: true, quiz: null });
      } else if (message.type === "SAVE_QUIZ") {
        resolve({ success: true });
      } else if (message.type === "SAVE_QUESTION") {
        resolve({ success: true });
      } else if (message.type === "GET_SAVED_QUESTIONS") {
        // Mock: return some saved questions for dev testing
        resolve({
          success: true,
          questions: [
            {
              id: 1,
              question:
                "Sample saved question about the page content? This was bookmarked for later review.",
              options: [
                "Option A — This is the first choice",
                "Option B — This is the second choice",
                "Option C — This is the third choice",
                "Option D — This is the fourth choice",
              ],
              correctAnswer: 0,
              explanation:
                "This is the explanation for the correct answer. It was saved for later review.",
              userAnswer: 1,
              isCorrect: false,
              pageTitle: "Test Page",
              savedAt: Date.now() - 60000,
            },
            {
              id: 2,
              question:
                "Another saved question that was bookmarked during a quiz session.",
              options: [
                "Option A — First",
                "Option B — Second",
                "Option C — Third",
                "Option D — Fourth",
              ],
              correctAnswer: 2,
              explanation:
                "Option C is correct because it directly relates to the main topic discussed in the article.",
              userAnswer: 2,
              isCorrect: true,
              pageTitle: "Test Page",
              savedAt: Date.now() - 30000,
            },
          ],
        });
      } else if (message.type === "GET_CONFIG") {
        resolve({
          success: true,
          config: {
            llmProvider: "openai",
            llmModel: "gpt-4o-mini",
            apiKey: "test",
          },
        });
      } else {
        resolve({});
      }
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState({
    numQuestions: 5,
    difficulty: "medium",
  });
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [pageInfo, setPageInfo] = useState({ url: "", title: "" });
  const [pageContent, setPageContent] = useState("");
  const [savedQuiz, setSavedQuiz] = useState(null);
  const [savedPageQuestions, setSavedPageQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState(new Set());

  // On mount, get page content and check for saved quizzes & saved questions
  useEffect(() => {
    async function init() {
      try {
        const pageResponse = await sendMessage({ type: "GET_PAGE_CONTENT" });
        if (pageResponse && pageResponse.success && pageResponse.data) {
          setPageInfo({
            url: pageResponse.data.url,
            title: pageResponse.data.title,
          });
          setPageContent(pageResponse.data.content);

          // Check for saved quiz on this page
          try {
            const savedResponse = await sendMessage({
              type: "GET_SAVED_QUIZ",
              url: pageResponse.data.url,
            });
            if (savedResponse && savedResponse.success && savedResponse.quiz) {
              setSavedQuiz(savedResponse.quiz);
            }
          } catch (err) {
            console.warn("Could not check for saved quiz:", err);
          }

          // Load saved questions for this page
          try {
            const savedQResponse = await sendMessage({
              type: "GET_SAVED_QUESTIONS",
              url: pageResponse.data.url,
            });
            if (
              savedQResponse &&
              savedQResponse.success &&
              savedQResponse.questions
            ) {
              setSavedPageQuestions(savedQResponse.questions);
            }
          } catch (err) {
            console.warn("Could not load saved questions:", err);
          }
        }
      } catch (err) {
        console.warn("Could not get page content:", err);
        setError(
          "Could not access page content. Make sure you have a page open.",
        );
      }
    }
    init();
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setScreen("loading");

    try {
      // Re-extract page content fresh (page may have finished loading since mount)
      let currentPageContent = pageContent;
      let currentPageInfo = pageInfo;
      let extractionError = null;
      try {
        const freshPage = await sendMessage({ type: "GET_PAGE_CONTENT" });
        console.log(
          "GET_PAGE_CONTENT response:",
          JSON.stringify(freshPage).substring(0, 500),
        );
        if (freshPage && freshPage.success && freshPage.data) {
          currentPageContent = freshPage.data.content;
          currentPageInfo = {
            url: freshPage.data.url,
            title: freshPage.data.title,
          };
          setPageContent(currentPageContent);
          setPageInfo(currentPageInfo);
        } else if (freshPage && freshPage.error) {
          extractionError = freshPage.error;
          console.error("Content extraction returned error:", freshPage.error);
        }
      } catch (err) {
        extractionError = err.message;
        console.error("Content extraction threw error:", err);
      }

      if (!currentPageContent || currentPageContent.trim().length === 0) {
        const detail = extractionError
          ? `Error: ${extractionError}`
          : "The page returned empty content.";
        setError(
          `Could not extract content from this page. ${detail} Try refreshing the page and clicking Generate again.`,
        );
        setScreen("home");
        return;
      }

      console.log(
        `Extracted ${currentPageContent.length} chars from "${currentPageInfo.title}"`,
      );

      const response = await sendMessage({
        type: "GENERATE_QUIZ",
        config,
        pageContent: currentPageContent,
        pageInfo: currentPageInfo,
      });

      if (response && response.success && response.questions) {
        setQuestions(response.questions);
        setCurrentQuestion(0);
        setAnswers({});
        setSubmitted({});
        setSavedQuestions(new Set());
        setScreen("quiz");
      } else {
        const errMsg =
          response && response.error
            ? response.error
            : "Failed to generate quiz. Please check your API key in settings.";
        setError(errMsg);
        setScreen("home");
      }
    } catch (err) {
      setError(err.message || "Failed to generate quiz. Please try again.");
      setScreen("home");
    }
  }, [config, pageContent, pageInfo]);

  const handleReviewSaved = useCallback(() => {
    if (savedQuiz && savedQuiz.questions) {
      setQuestions(savedQuiz.questions);
      setCurrentQuestion(0);
      // Mark all as submitted with saved answers if available
      const savedAnswers = savedQuiz.answers || {};
      const savedSubmitted = {};
      Object.keys(savedAnswers).forEach((key) => {
        savedSubmitted[key] = true;
      });
      setAnswers(savedAnswers);
      setSubmitted(savedSubmitted);
      setScreen("quiz");
    }
  }, [savedQuiz]);

  const handleRetake = useCallback(() => {
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted({});
    setSavedQuestions(new Set());
    setScreen("quiz");
  }, []);

  const handleNewQuiz = useCallback(() => {
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted({});
    setSavedQuestions(new Set());
    setError(null);
    setScreen("home");
  }, []);

  const handleSeeResults = useCallback(() => {
    setScreen("results");
  }, []);

  const handleSaveQuestion = useCallback(
    async (questionIndex) => {
      setSavedQuestions((prev) => new Set([...prev, questionIndex]));
      if (!pageInfo.url) return;
      try {
        const q = questions[questionIndex];
        const savedQuestion = {
          ...q,
          userAnswer: answers[questionIndex],
          isCorrect: answers[questionIndex] === q.correctAnswer,
          pageTitle: pageInfo.title,
          savedAt: Date.now(),
        };
        await sendMessage({
          type: "SAVE_QUESTION",
          url: pageInfo.url,
          question: savedQuestion,
        });
        // Update local savedPageQuestions list
        setSavedPageQuestions((prev) => [...prev, savedQuestion]);
      } catch (err) {
        console.warn("Could not save question:", err);
      }
    },
    [pageInfo, questions, answers],
  );

  const handleViewSavedQuestions = useCallback(() => {
    setScreen("review");
  }, []);

  const handleBackFromReview = useCallback(() => {
    setScreen("home");
  }, []);

  return (
    <div className="app">
      <div className={`app__screen app__screen--${screen}`}>
        {screen === "home" && (
          <HomeScreen
            config={config}
            setConfig={setConfig}
            onGenerate={handleGenerate}
            savedQuiz={savedQuiz}
            onReviewSaved={handleReviewSaved}
            pageInfo={pageInfo}
            error={error}
            savedPageQuestions={savedPageQuestions}
            onViewSavedQuestions={handleViewSavedQuestions}
          />
        )}

        {screen === "loading" && <LoadingScreen />}

        {screen === "quiz" && (
          <QuizScreen
            questions={questions}
            currentQuestion={currentQuestion}
            setCurrentQuestion={setCurrentQuestion}
            answers={answers}
            setAnswers={setAnswers}
            submitted={submitted}
            setSubmitted={setSubmitted}
            onSeeResults={handleSeeResults}
            savedQuestions={savedQuestions}
            onSaveQuestion={handleSaveQuestion}
          />
        )}

        {screen === "results" && (
          <ResultsScreen
            questions={questions}
            answers={answers}
            onRetake={handleRetake}
            onNewQuiz={handleNewQuiz}
          />
        )}

        {screen === "review" && (
          <ReviewScreen
            savedQuestions={savedPageQuestions}
            onBack={handleBackFromReview}
          />
        )}
      </div>
    </div>
  );
}
