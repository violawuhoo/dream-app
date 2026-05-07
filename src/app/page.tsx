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
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto relative overflow-hidden">
      <div className="bg-glow" />
      
      <nav className="flex justify-between items-center p-6 border-b border-white/5 backdrop-blur-md z-10">
        <button onClick={handleDiscard} className="text-sm text-text-dim hover:text-foreground transition-colors">← Home</button>
        <div className="text-xs tracking-[0.3em] font-light text-text-dim uppercase">VEIL</div>
        <div className="w-12" /> {/* spacer */}
      </nav>

      <div className="flex-1 overflow-y-auto pb-40 space-y-8 px-6 pt-8 scroll-smooth z-0">
        {session.messages.length === 0 && (
          <div className="text-center text-text-dim mt-20 font-light italic opacity-50">
            Tell it as it comes back to you. I will stay close to the shape of it.
          </div>
        )}

        {session.messages.map((msg: any, i: number) => (
          <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            <div className={`bubble ${
              msg.role === "user" ? "bubble-user shadow-lg shadow-black/20" : "bubble-veil"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bubble bubble-veil">
              <div className="dots">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            </div>
          </div>
        )}

        {session.state === DreamFlowState.STRUCTURED && !isProcessing && (
          <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => generateInterpretation()} 
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98]"
            >
              Interpret the symbols
            </button>
            <button 
              onClick={skipInterpretation} 
              className="w-full py-4 text-text-dim hover:text-foreground text-xs transition-colors"
            >
              Just save the dream
            </button>
          </div>
        )}

        {session.state === DreamFlowState.DONE && !isProcessing && (
          <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {session.interpretation && (
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
                <div className="text-xs tracking-widest text-text-dim uppercase mb-6 opacity-50">Interpretation</div>
                <div className="text-sm leading-relaxed space-y-4 whitespace-pre-wrap text-foreground/90 font-light">
                  {session.interpretation}
                </div>
                <div className="mt-8 pt-6 border-t border-white/5">
                  <p className="text-[10px] text-text-dim/40 italic uppercase tracking-tighter">
                    Dreams are personal echoes. This is a reflection, not a diagnosis.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSave} 
                className="w-full py-5 bg-foreground text-background rounded-2xl text-sm font-medium tracking-widest uppercase hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Save into Archive
              </button>
              <button 
                onClick={handleDiscard} 
                className="w-full py-4 text-red-400/50 hover:text-red-400 text-xs transition-colors"
              >
                Discard this dream
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {(session.state === DreamFlowState.RAW || session.state === DreamFlowState.EXPANDING || session.state === DreamFlowState.AWAITING_CONTINUE_DECISION) && (
        <div className="fixed bottom-0 left-0 w-full p-6 z-20">
          <div className="max-w-2xl mx-auto input-container rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
            <div className="flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your dream..."
                disabled={isProcessing}
                className="flex-1 bg-transparent border-none px-4 py-4 text-sm focus:outline-none resize-none h-14 max-h-32"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={isProcessing || !input.trim()}
                className="mb-1 mr-1 p-3 rounded-2xl bg-foreground text-background disabled:opacity-20 transition-all active:scale-90"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

