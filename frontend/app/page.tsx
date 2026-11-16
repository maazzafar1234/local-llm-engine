"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => setImage(reader.result as string);
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleGenerate = async (queryText?: string) => {
    const textToSend = queryText !== undefined ? queryText : prompt;
    if (!textToSend.trim() && !image) return;

    setLoading(true);
    setOutput("");
    setIsCached(false);

    try {
      const res = await fetch("http://localhost:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSend, image }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              if (data.cached) setIsCached(true);
              if (data.text) {
                setOutput((prev) => prev + data.text);
              }
            } catch (err) {}
          }
        }
      }
    } catch (err) {
      setOutput("Error connecting to local gateway backend.");
    } finally {
      setLoading(false);
      setImage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  let codeBlockCounter = 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-6 md:p-10 font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Header Card */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-lg font-bold">
              ⚡
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Local Offline LLM Engine
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  qwen2.5-coder:1.5b
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                GPU-accelerated local AI • OCR Screenshot Support • SQLite Cache
              </p>
            </div>
          </div>
          {isCached && (
            <span className="px-3 py-1.5 bg-emerald-950/60 text-emerald-400 text-xs font-mono rounded-xl border border-emerald-800/60 shadow-sm flex items-center gap-1.5 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Cache Hit (0ms)
            </span>
          )}
        </header>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            "🚀 Write a Binary Search in Python",
            "💡 Explain Dijkstra shortest path",
            "🐛 Debug a React useEffect infinite loop",
            "📊 Solve a Time & Work aptitude problem",
          ].map((chip, idx) => {
            const query = chip.slice(2).trim();
            return (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(query);
                  handleGenerate(query);
                }}
                className="text-xs bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg transition font-medium shadow-sm hover:border-zinc-700"
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Input Card */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-3">
          {image && (
            <div className="relative w-28 h-28 border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 shadow-md">
              <img
                src={image}
                alt="Screenshot preview"
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full p-1 text-xs transition shadow"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Ask coding logic, paste code, or press Ctrl+V to drop a screenshot..."
                className="w-full p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition text-sm resize-none font-sans"
              />
              <span className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-500 pointer-events-none hidden md:block">
                Ctrl + Enter to generate
              </span>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={loading}
              className="md:w-36 px-6 py-4 bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 rounded-xl font-semibold text-white transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Thinking
                </>
              ) : (
                "Generate ⚡"
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 md:p-8 min-h-[420px] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800/60 text-xs font-mono text-zinc-400">
            <span>RESPONSE OUTPUT</span>
            <span>UTF-8 Stream Active</span>
          </div>

          {output ? (
            <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed space-y-4 font-sans">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    if (!inline && match) {
                      const currentIndex = codeBlockCounter++;
                      const isCopied = copiedIndex === currentIndex;

                      return (
                        <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl">
                          <div className="flex justify-between items-center px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 text-xs font-mono text-zinc-400">
                            <span className="font-semibold uppercase text-blue-400">
                              {match[1]}
                            </span>
                            <button
                              onClick={() =>
                                handleCopyCode(codeString, currentIndex)
                              }
                              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition text-xs font-medium shadow-sm active:scale-95"
                            >
                              {isCopied ? (
                                <>
                                  <svg
                                    className="w-3.5 h-3.5 text-emerald-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  <span className="text-emerald-400 font-semibold">
                                    Copied Code!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-3.5 h-3.5 text-zinc-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                    />
                                  </svg>
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-100 bg-zinc-950/90 leading-relaxed">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <code
                        className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-blue-400 border border-zinc-700/50"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {output}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[320px] text-zinc-600 font-mono text-sm gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-inner">
                ✨
              </div>
              <p className="text-zinc-500 text-center max-w-xs">
                Ask a coding question, select a quick chip above, or press{" "}
                <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400">
                  Ctrl + V
                </kbd>{" "}
                to paste a screenshot.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
