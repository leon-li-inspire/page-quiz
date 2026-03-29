import React from "react";
import "./QuizScreen.css";

const LETTER_BADGES = ["A", "B", "C", "D"];

export default function QuizScreen({
  questions,
  currentQuestion,
  setCurrentQuestion,
  answers,
  setAnswers,
  submitted,
  setSubmitted,
  onSeeResults,
  savedQuestions,
  onSaveQuestion,
}) {
  const total = questions.length;
  const question = questions[currentQuestion];
  const isSubmitted = !!submitted[currentQuestion];
  const selectedOption = answers[currentQuestion];
  const submittedCount = Object.keys(submitted).length;
  const allSubmitted = submittedCount === total;
  const progressPercent = (submittedCount / total) * 100;

  const handleSelectOption = (optionIndex) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion]: optionIndex }));
  };

  const handleSubmit = () => {
    if (selectedOption === undefined || isSubmitted) return;
    setSubmitted((prev) => ({ ...prev, [currentQuestion]: true }));
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < total - 1 && isSubmitted) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const getOptionClass = (optionIndex) => {
    const base = "quiz-screen__option";
    const classes = [base];

    if (!isSubmitted) {
      if (selectedOption === optionIndex) {
        classes.push(`${base}--selected`);
      }
    } else {
      const isCorrect = optionIndex === question.correctAnswer;
      const isSelected = selectedOption === optionIndex;

      if (isCorrect) {
        classes.push(`${base}--correct`);
      } else if (isSelected && !isCorrect) {
        classes.push(`${base}--wrong`);
      }

      if (!isSelected && !isCorrect) {
        classes.push(`${base}--locked`);
      }
    }

    return classes.join(" ");
  };

  const getOptionIcon = (optionIndex) => {
    if (!isSubmitted) return null;
    const isCorrect = optionIndex === question.correctAnswer;
    const isSelected = selectedOption === optionIndex;

    if (isCorrect) return <span className="quiz-screen__option-icon">✅</span>;
    if (isSelected && !isCorrect)
      return <span className="quiz-screen__option-icon">❌</span>;
    return null;
  };

  return (
    <div className="quiz-screen">
      {/* Progress Section */}
      <div className="quiz-screen__progress">
        <div className="quiz-screen__progress-header">
          <span className="quiz-screen__progress-label">
            Question {currentQuestion + 1} of {total}
          </span>
          <span className="quiz-screen__progress-count">
            {submittedCount}/{total} answered
          </span>
        </div>
        <div className="quiz-screen__progress-bar">
          <div
            className="quiz-screen__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="quiz-screen__card" key={currentQuestion}>
        <div className="quiz-screen__question-header">
          <span className="quiz-screen__question-badge">
            {currentQuestion + 1}
          </span>
          <span className="quiz-screen__difficulty-indicator">
            {question.id ? `#${question.id}` : ""}
          </span>
        </div>
        <h2 className="quiz-screen__question-text">{question.question}</h2>

        {/* Options */}
        <div className="quiz-screen__options">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              className={getOptionClass(idx)}
              onClick={() => handleSelectOption(idx)}
              disabled={isSubmitted}
              aria-label={`Option ${LETTER_BADGES[idx]}: ${option}`}
            >
              <span className="quiz-screen__option-badge">
                {LETTER_BADGES[idx]}
              </span>
              <span className="quiz-screen__option-text">{option}</span>
              {getOptionIcon(idx)}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        {!isSubmitted && selectedOption !== undefined && (
          <button className="quiz-screen__submit-btn" onClick={handleSubmit}>
            Submit Answer ✓
          </button>
        )}

        {/* Explanation */}
        {isSubmitted && question.explanation && (
          <div className="quiz-screen__explanation">
            <div className="quiz-screen__explanation-header">
              <span className="quiz-screen__explanation-icon">💡</span>
              <span className="quiz-screen__explanation-label">
                Explanation
              </span>
            </div>
            <p className="quiz-screen__explanation-text">
              {question.explanation}
            </p>
          </div>
        )}

        {/* Save Question Button */}
        {isSubmitted && (
          <button
            className={`quiz-screen__save-btn ${savedQuestions.has(currentQuestion) ? "quiz-screen__save-btn--saved" : ""}`}
            onClick={() => onSaveQuestion(currentQuestion)}
            disabled={savedQuestions.has(currentQuestion)}
          >
            {savedQuestions.has(currentQuestion)
              ? "Saved 🔖"
              : "Save Question 🔖"}
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="quiz-screen__navigation">
        <button
          className="quiz-screen__nav-btn quiz-screen__nav-btn--prev"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          ← Previous
        </button>

        {currentQuestion === total - 1 && allSubmitted ? (
          <button
            className="quiz-screen__nav-btn quiz-screen__nav-btn--results"
            onClick={onSeeResults}
          >
            See Results 🎉
          </button>
        ) : (
          <button
            className="quiz-screen__nav-btn quiz-screen__nav-btn--next"
            onClick={handleNext}
            disabled={currentQuestion === total - 1 || !isSubmitted}
          >
            Next →
          </button>
        )}
      </div>

      {/* Question Dots Navigator */}
      <div className="quiz-screen__dots">
        {questions.map((_, idx) => {
          let dotClass = "quiz-screen__dot";
          if (idx === currentQuestion) dotClass += " quiz-screen__dot--active";
          if (submitted[idx]) {
            dotClass +=
              answers[idx] === questions[idx].correctAnswer
                ? " quiz-screen__dot--correct"
                : " quiz-screen__dot--wrong";
          }
          return (
            <button
              key={idx}
              className={dotClass}
              onClick={() => {
                if (submitted[idx] || idx === currentQuestion) {
                  setCurrentQuestion(idx);
                }
              }}
              aria-label={`Go to question ${idx + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
