import {
  useEffect,
  useRef,
  useState,
} from "react";

import { ASSISTANT_NOTICE } from "../explain-safety.mjs";

export default function AssistantDock({
  open,
  thread,
  loading,
  error,
  onOpen,
  onClose,
  onAsk,
}) {
  const [question, setQuestion] =
    useState("");

  const threadRef = useRef(null);

  useEffect(() => {
    const element = threadRef.current;
    if (element)
      element.scrollTop =
        element.scrollHeight;
  }, [thread, loading, error, open]);

  if (!open) {
    return (
      <button
        className="assistant-launcher"
        onClick={onOpen}
      >
        Ask about this report
      </button>
    );
  }

  function submit(event) {
    event.preventDefault();

    const text = question.trim();
    if (!text || loading) return;

    setQuestion("");
    onAsk(text);
  }

  return (
    <section className="assistant-dock">
      <div className="assistant-head">
        <h2>
          Explanation assistant
        </h2>

        <button onClick={onClose}>
          Close
        </button>
      </div>

      <p className="assistant-notice">
        {ASSISTANT_NOTICE}
      </p>

      <div
        className="assistant-thread"
        ref={threadRef}
      >
        {thread.length === 0 && (
          <p className="small-note">
            Ask about anything on this
            report, or press one of the
            explain buttons on a card.
            Your question is matched to
            an item on this page inside
            your browser and is not sent
            anywhere.
          </p>
        )}

        {thread.map((message) => (
          <div
            key={message.id}
            className={`assistant-message ${message.role}`}
          >
            <p>{message.text}</p>

            {message.source && (
              <small>
                {message.source}
              </small>
            )}

            {message.note && (
              <small className="assistant-message-note">
                {message.note}
              </small>
            )}
          </div>
        ))}

        {loading && (
          <p className="small-note">
            Preparing a plain-language
            explanation…
          </p>
        )}

        {error && (
          <p className="field-error">
            {error}
          </p>
        )}
      </div>

      <form
        className="assistant-composer"
        onSubmit={submit}
      >
        <input
          type="text"
          value={question}
          maxLength={300}
          aria-label="Your question"
          placeholder="What does the smoking figure mean?"
          onChange={(event) =>
            setQuestion(
              event.target.value
            )
          }
        />

        <button
          className="primary-button"
          type="submit"
          disabled={
            loading || !question.trim()
          }
        >
          Ask
        </button>
      </form>
    </section>
  );
}
