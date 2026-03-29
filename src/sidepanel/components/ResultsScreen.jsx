import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import "./ResultsScreen.css";

export default function ResultsScreen({
  questions,
  answers,
  onRetake,
  onNewQuiz,
}) {
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [showThanks, setShowThanks] = useState(false);
  const confettiFired = useRef(false);

  const { score, total, percentage } = useMemo(() => {
    let correct = 0;
    const total = questions.length;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      score: correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }, [questions, answers]);

  const message = useMemo(() => {
    if (percentage >= 90) return "Outstanding! 🏆 You really nailed it!";
    if (percentage >= 80) return "Great job! 🎉 You know your stuff!";
    if (percentage >= 60) return "Nice work! 💪 Room to improve!";
    if (percentage >= 40) return "Keep learning! 📚 You'll get there!";
    return "Don't give up! 🌟 Try reading the page again!";
  }, [percentage]);

  useEffect(() => {
    if (percentage >= 80 && !confettiFired.current) {
      confettiFired.current = true;

      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#74b9ff"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#74b9ff"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [percentage]);

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getScoreColor = () => {
    if (percentage >= 80) return "var(--color-success)";
    if (percentage >= 60) return "var(--color-accent)";
    if (percentage >= 40) return "var(--color-error)";
    return "var(--color-error)";
  };

  const toggleQuestion = (idx) => {
    setExpandedQuestion(expandedQuestion === idx ? null : idx);
  };

  const handleDone = () => {
    setShowThanks(true);
  };

  if (showThanks) {
    return (
      <div className="results-screen">
        <div className="results-screen__thanks">
          <div className="results-screen__thanks-emoji">🎓</div>
          <h2 className="results-screen__thanks-title">Thanks for playing!</h2>
          <p className="results-screen__thanks-subtitle">
            Keep exploring and quizzing yourself to learn more.
          </p>
          <button
            className="results-screen__btn results-screen__btn--new"
            onClick={onNewQuiz}
          >
            Quiz Another Page ✨
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-screen">
      <div className="results-screen__score-section">
        <div className="results-screen__donut">
          <svg className="results-screen__donut-svg" viewBox="0 0 120 120">
            <circle
              className="results-screen__donut-bg"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e9ecef"
              strokeWidth="10"
            />
            <circle
              className="results-screen__donut-fill"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={getScoreColor()}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="results-screen__donut-label">
            <span className="results-screen__donut-percentage">
              {percentage}%
            </span>
          </div>
        </div>

        <h2 className="results-screen__score-text">
          You scored <strong>{score}</strong> out of <strong>{total}</strong>!
        </h2>
        <p className="results-screen__message">{message}</p>
      </div>

      <div className="results-screen__review">
        <h3 className="results-screen__review-title">📋 Question Review</h3>
        <div className="results-screen__review-list">
          {questions.map((q, idx) => {
            const isCorrect = answers[idx] === q.correctAnswer;
            const isExpanded = expandedQuestion === idx;

            return (
              <div
                key={q.id}
                className={`results-screen__review-item ${
                  isCorrect
                    ? "results-screen__review-item--correct"
                    : "results-screen__review-item--wrong"
                }`}
                onClick={() => toggleQuestion(idx)}
              >
                <div className="results-screen__review-header">
                  <span className="results-screen__review-indicator">
                    {isCorrect ? "✅" : "❌"}
                  </span>
                  <span
                    className={`results-screen__review-question ${
                      isExpanded
                        ? "results-screen__review-question--expanded"
                        : ""
                    }`}
                  >
                    {q.question}
                  </span>
                  <span
                    className={`results-screen__review-chevron ${
                      isExpanded ? "results-screen__review-chevron--open" : ""
                    }`}
                  >
                    ▾
                  </span>
                </div>

                {isExpanded && (
                  <div className="results-screen__review-details">
                    {!isCorrect && (
                      <>
                        <div className="results-screen__review-answer results-screen__review-answer--yours">
                          <span className="results-screen__review-label">
                            Your answer:
                          </span>
                          <span className="results-screen__review-value">
                            {answers[idx] !== undefined
                              ? q.options[answers[idx]]
                              : "No answer"}
                          </span>
                        </div>
                        <div className="results-screen__review-answer results-screen__review-answer--correct">
                          <span className="results-screen__review-label">
                            Correct answer:
                          </span>
                          <span className="results-screen__review-value">
                            {q.options[q.correctAnswer]}
                          </span>
                        </div>
                      </>
                    )}
                    {isCorrect && (
                      <div className="results-screen__review-answer results-screen__review-answer--correct">
                        <span className="results-screen__review-label">
                          Answer:
                        </span>
                        <span className="results-screen__review-value">
                          {q.options[q.correctAnswer]}
                        </span>
                      </div>
                    )}
                    {q.explanation && (
                      <div className="results-screen__review-explanation">
                        💡 {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="results-screen__actions">
        <button
          className="results-screen__btn results-screen__btn--retake"
          onClick={onRetake}
        >
          Retake Quiz 🔄
        </button>
        <button
          className="results-screen__btn results-screen__btn--new"
          onClick={onNewQuiz}
        >
          New Quiz ✨
        </button>
        <button
          className="results-screen__btn results-screen__btn--done"
          onClick={handleDone}
        >
          Done ✅
        </button>
      </div>
    </div>
  );
}
