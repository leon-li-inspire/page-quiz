import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

const messages = [
  'Reading the page...',
  'Highlighting the important bits...',
  'Thinking of tricky questions...',
  "Making sure they're not too easy...",
  'Almost ready...',
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        <div className="loading-screen__emoji">🧠</div>
        <p className={`loading-screen__message ${fade ? 'loading-screen__message--visible' : 'loading-screen__message--hidden'}`}>
          {messages[messageIndex]}
        </p>
        <div className="loading-screen__dots">
          <span className="loading-screen__dot"></span>
          <span className="loading-screen__dot"></span>
          <span className="loading-screen__dot"></span>
        </div>
      </div>
    </div>
  );
}
