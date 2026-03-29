import React from "react";
import "./HomeScreen.css";

const QUESTION_COUNTS = [5, 6, 7, 8, 9, 10];
const DIFFICULTIES = [
  { value: "easy", label: "Easy 🌱" },
  { value: "medium", label: "Medium 🌿" },
  { value: "hard", label: "Hard 🌳" },
];

export default function HomeScreen({
  config,
  setConfig,
  onGenerate,
  savedQuiz,
  onReviewSaved,
  pageInfo,
  error,
  savedPageQuestions,
  onViewSavedQuestions,
}) {
  const truncatedTitle = pageInfo?.title
    ? pageInfo.title.length > 60
      ? pageInfo.title.slice(0, 57) + "..."
      : pageInfo.title
    : "No page detected";

  return (
    <div className="home-screen">
      <header className="home-screen__header">
        <h1 className="home-screen__title">🧠 PageQuiz</h1>
        <p className="home-screen__subtitle" title={pageInfo?.title || ""}>
          {truncatedTitle}
        </p>
      </header>

      {savedQuiz && (
        <div className="home-screen__saved-card">
          <div className="home-screen__saved-icon">📋</div>
          <div className="home-screen__saved-info">
            <p className="home-screen__saved-text">
              You took a quiz here before — scored{" "}
              <strong>
                {savedQuiz.score}/{savedQuiz.total}
              </strong>
            </p>
            <button className="home-screen__saved-btn" onClick={onReviewSaved}>
              Review Previous Quiz
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="home-screen__error-card">
          <span className="home-screen__error-icon">⚠️</span>
          <p className="home-screen__error-text">{error}</p>
        </div>
      )}

      <section className="home-screen__config">
        <div className="home-screen__config-group">
          <label className="home-screen__label">Number of Questions</label>
          <div className="home-screen__pills">
            {QUESTION_COUNTS.map((num) => (
              <button
                key={num}
                className={`home-screen__pill ${
                  config.numQuestions === num ? "home-screen__pill--active" : ""
                }`}
                onClick={() => setConfig({ ...config, numQuestions: num })}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="home-screen__config-group">
          <label className="home-screen__label">Difficulty</label>
          <div className="home-screen__pills">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                className={`home-screen__pill home-screen__pill--wide ${
                  config.difficulty === d.value
                    ? "home-screen__pill--active"
                    : ""
                }`}
                onClick={() => setConfig({ ...config, difficulty: d.value })}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button className="home-screen__generate-btn" onClick={onGenerate}>
        Generate Quiz 🚀
      </button>

      {savedPageQuestions && savedPageQuestions.length > 0 && (
        <button
          className="home-screen__saved-questions-btn"
          onClick={onViewSavedQuestions}
        >
          🔖 Saved Questions ({savedPageQuestions.length})
        </button>
      )}
    </div>
  );
}
