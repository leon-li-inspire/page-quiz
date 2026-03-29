import React from 'react';
import './ReviewScreen.css';

export default function ReviewScreen({ savedQuestions, onBack }) {
  if (!savedQuestions || savedQuestions.length === 0) {
    return (
      <div className="review-screen">
        <div className="review-screen__empty">
          <div className="review-screen__empty-icon">🔖</div>
          <h2 className="review-screen__empty-title">No Saved Questions</h2>
          <p className="review-screen__empty-text">
            Take a quiz and bookmark questions you want to revisit!
          </p>
          <button className="review-screen__back-btn" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-screen">
      <header className="review-screen__header">
        <h1 className="review-screen__title">🔖 Saved Questions</h1>
        <p className="review-screen__subtitle">
          {savedQuestions.length} question{savedQuestions.length !== 1 ? 's' : ''} from this page
        </p>
      </header>

      <div className="review-screen__list">
        {savedQuestions.map((q, idx) => (
          <div
            key={q.savedAt || idx}
            className="review-screen__card"
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <div className="review-screen__card-header">
              <span className="review-screen__card-badge">{idx + 1}</span>
              <span className={`review-screen__card-status ${q.isCorrect ? 'review-screen__card-status--correct' : 'review-screen__card-status--wrong'}`}>
                {q.isCorrect ? '✅ Correct' : '❌ Incorrect'}
              </span>
            </div>

            <p className="review-screen__card-question">{q.question}</p>

            <div className="review-screen__answers">
              <div className={`review-screen__answer ${q.isCorrect ? 'review-screen__answer--correct' : 'review-screen__answer--wrong'}`}>
                <span className="review-screen__answer-label">Your answer</span>
                <span className="review-screen__answer-text">
                  {q.userAnswer !== undefined && q.userAnswer !== null ? q.options[q.userAnswer] : 'No answer'}
                </span>
              </div>

              {!q.isCorrect && (
                <div className="review-screen__answer review-screen__answer--correct">
                  <span className="review-screen__answer-label">Correct answer</span>
                  <span className="review-screen__answer-text">{q.options[q.correctAnswer]}</span>
                </div>
              )}
            </div>

            {q.explanation && (
              <div className="review-screen__explanation">
                <span className="review-screen__explanation-icon">💡</span>
                <p className="review-screen__explanation-text">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="review-screen__back-btn" onClick={onBack}>
        ← Back to Home
      </button>
    </div>
  );
}
