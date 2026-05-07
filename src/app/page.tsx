"use client";

import { useState, useEffect, useRef } from "react";
import { useOrchestrator } from "@/lib/useOrchestrator";
import { DreamFlowState } from "@/lib/dream-model";

export default function App() {
  const [currentView, setCurrentView] = useState("login"); // login, home, chat, history
  const { 
    session, 
    isProcessing, 
    handleUserMessage, 
    proceedToStructuring, 
    generateInterpretation, 
    skipInterpretation, 
    saveRecord, 
    resetSession 
  } = useOrchestrator();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.messages]);

  const handleLogin = (provider: string) => {
    setCurrentView("home");
  };

  const startChat = () => {
    resetSession();
    setCurrentView("chat");
  };

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    handleUserMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDiscard = () => {
    resetSession();
    setCurrentView("home");
  };

  const handleSave = async () => {
    const success = await saveRecord();
    if (success) {
      resetSession();
      setCurrentView("history");
    }
  };

  if (currentView === "login") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-light tracking-wider mb-2">Veil</h1>
        <p className="text-text-dim mb-12">A space for your dreams</p>
        <div className="w-full max-w-xs space-y-4">
          <button onClick={() => handleLogin("Google")} className="w-full py-3 px-4 rounded-lg border border-accent hover:bg-accent/50 transition">Continue with Google</button>
          <button onClick={() => handleLogin("Instagram")} className="w-full py-3 px-4 rounded-lg border border-accent hover:bg-accent/50 transition">Continue with Instagram</button>
          <button onClick={() => handleLogin("X")} className="w-full py-3 px-4 rounded-lg border border-accent hover:bg-accent/50 transition">Continue with X</button>
          <button onClick={() => handleLogin("Guest")} className="w-full py-3 px-4 rounded-lg bg-foreground text-background hover:opacity-90 transition mt-4">Continue as Guest</button>
        </div>
      </div>
    );
  }

  if (currentView === "home") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <nav className="absolute top-0 w-full p-4 flex justify-between items-center max-w-2xl">
          <div className="text-sm tracking-widest uppercase">VEIL</div>
          <div className="flex gap-4 text-sm text-text-dim">
            <button onClick={() => setCurrentView("history")} className="hover:text-foreground">History</button>
            <button onClick={() => setCurrentView("login")} className="hover:text-foreground">Log out</button>
          </div>
        </nav>
        <h1 className="text-2xl font-light mb-8">What did you dream?</h1>
        <button onClick={startChat} className="px-8 py-3 rounded-full bg-foreground text-background hover:opacity-90 transition">Begin</button>
      </div>
    );
  }

  if (currentView === "history") {
    const records = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("dream_records") || "[]") : [];
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col">
        <nav className="flex justify-between items-center mb-8">
          <button onClick={() => setCurrentView("home")} className="text-sm text-text-dim hover:text-foreground">← Back</button>
          <div className="text-sm tracking-widest uppercase">History</div>
        </nav>
        <div className="flex-1 overflow-y-auto space-y-6">
          {records.length === 0 ? (
            <p className="text-center text-text-dim mt-20">No dreams recorded yet.</p>
          ) : (
            records.map((record: any) => (
              <div key={record.id} className="p-6 border border-accent rounded-lg">
                <div className="text-xs text-text-dim mb-2">{new Date(record.created_at).toLocaleDateString()}</div>
                <h3 className="text-lg font-medium mb-4">{record.title || "Untitled Dream"}</h3>
                <p className="text-sm text-text-dim whitespace-pre-wrap">{record.narrative}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto p-4 relative">
      <nav className="flex justify-between items-center mb-4 py-2 border-b border-accent/30">
        <button onClick={handleDiscard} className="text-sm text-text-dim hover:text-foreground">← Home</button>
        <div className="text-sm tracking-widest uppercase">VEIL</div>
      </nav>

      <div className="flex-1 overflow-y-auto pb-32 space-y-6 px-2">
        {session.messages.length === 0 && (
          <div className="text-center text-text-dim mt-20">
            Tell me what you remember. It doesn't have to make sense.
          </div>
        )}

        {session.messages.map((msg: any, i: number) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
              msg.role === "user" ? "bg-accent text-foreground" : "bg-transparent border border-accent/50 text-foreground"
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-transparent border border-accent/50 text-text-dim text-sm italic">
              Veil is thinking...
            </div>
          </div>
        )}

        {session.state === DreamFlowState.STRUCTURED && !isProcessing && (
          <div className="bg-accent/20 border border-accent rounded-xl p-6 mt-8">
            <h3 className="text-sm font-medium uppercase tracking-wider mb-4 text-text-dim">Summary</h3>
            <p className="text-sm leading-relaxed mb-6">{session.summary}</p>
            <div className="flex gap-4">
              <button onClick={() => generateInterpretation()} className="flex-1 py-2 bg-foreground text-background rounded-lg text-sm hover:opacity-90">Interpret this</button>
              <button onClick={skipInterpretation} className="flex-1 py-2 border border-accent rounded-lg text-sm hover:bg-accent/50">Save as is</button>
            </div>
          </div>
        )}

        {session.state === DreamFlowState.DONE && !isProcessing && (
          <div className="bg-accent/20 border border-accent rounded-xl p-6 mt-8">
            {session.interpretation && (
              <>
                <h3 className="text-sm font-medium uppercase tracking-wider mb-4 text-text-dim">Interpretation</h3>
                <div className="text-sm leading-relaxed mb-6 whitespace-pre-wrap">{session.interpretation}</div>
                <p className="text-xs text-text-dim italic mb-6 pb-6 border-b border-accent/50">
                  Note: Dreams are highly personal. This is just one perspective.
                </p>
              </>
            )}
            <div className="flex gap-4">
              <button onClick={handleSave} className="flex-1 py-3 bg-foreground text-background rounded-lg text-sm hover:opacity-90 font-medium">Save Record</button>
              <button onClick={handleDiscard} className="flex-1 py-3 border border-accent rounded-lg text-sm text-red-400 hover:bg-red-900/20">Discard</button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {(session.state === DreamFlowState.RAW || session.state === DreamFlowState.EXPANDING || session.state === DreamFlowState.AWAITING_CONTINUE_DECISION) && (
        <div className="absolute bottom-0 left-0 w-full bg-background p-4 border-t border-accent/30">
          <div className="max-w-2xl mx-auto flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your dream here..."
              disabled={isProcessing}
              className="flex-1 bg-accent/30 border border-accent rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-foreground resize-none h-12"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={isProcessing || !input.trim()}
              className="px-6 rounded-xl bg-foreground text-background disabled:opacity-50 text-sm font-medium"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
