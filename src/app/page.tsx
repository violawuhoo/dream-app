"use client";

import { useState, useEffect, useRef } from "react";
import { useOrchestrator } from "@/lib/useOrchestrator";
import { DreamFlowState } from "@/lib/dream-model";
import { toPng } from "html-to-image";

export default function App() {
  const [currentView, setCurrentView] = useState("login"); // login, home, chat, history
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const { 
    session, 
    isProcessing, 
    handleUserMessage, 
    proceedToStructuring, 
    generateInterpretation, 
    skipInterpretation, 
    saveRecord, 
    resetSession,
    handleLifeConnection,
    drawTarot,
    skipTarot
  } = useOrchestrator();

  const [input, setInput] = useState("");
  const [showPoster, setShowPoster] = useState(false);
  const [showTarotPage, setShowTarotPage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.messages, session.state]);

  useEffect(() => {
    if (session.state === DreamFlowState.TAROT_DRAWING) {
      setShowTarotPage(true);
    } else if (session.state === DreamFlowState.DONE && showTarotPage) {
      // Keep tarot page visible for a moment then maybe close or just let user see results
      // Actually, if it's a "page", we should probably show the results on that page
    }
  }, [session.state]);

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

  const handleShare = async () => {
    if (!posterRef.current) return;
    try {
      const dataUrl = await toPng(posterRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.download = `dream-${session.title || "unveiled"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Oops, something went wrong!", err);
    }
  };

  // Helper to render interpretation with basic markdown support
   const renderInterpretation = (text: string) => {
     if (!text) return null;
     
     // Split by one or more newlines
     return text.split(/\n+/).map((paragraph, idx) => {
       if (!paragraph.trim()) return null;
       
       // Handle bold text like **symbol**
       const parts = paragraph.split(/(\*\*.*?\*\*)/g);
       return (
         <p key={idx} className="mb-4 last:mb-0">
           {parts.map((part, i) => {
             if (part.startsWith("**") && part.endsWith("**")) {
               return <strong key={i} className="font-semibold text-accent-light">{part.slice(2, -2)}</strong>;
             }
             return part;
           })}
         </p>
       );
     });
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
        <h1 className="text-2xl font-light mb-8">What fragments remain from your dream?</h1>
        <button onClick={startChat} className="px-8 py-3 rounded-full bg-foreground text-background hover:opacity-90 transition">Begin the descent</button>
      </div>
    );
  }

  if (currentView === "history") {
    const records = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("dream_records") || "[]") : [];
    
    if (selectedRecord) {
      return (
        <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col relative overflow-hidden">
          <div className="bg-glow opacity-20" />
          <nav className="flex justify-between items-center mb-8 z-10">
            <button onClick={() => setSelectedRecord(null)} className="text-sm text-text-dim hover:text-foreground">← Back to List</button>
            <div className="text-xs tracking-widest uppercase opacity-50">Record Detail</div>
          </nav>
          
          <div className="flex-1 overflow-y-auto space-y-8 pb-12 z-0">
            <header className="space-y-2">
              <div className="text-xs text-text-dim/60 uppercase tracking-widest">{new Date(selectedRecord.created_at).toLocaleDateString()}</div>
              <h1 className="text-3xl font-light">{selectedRecord.title || "Untitled Dream"}</h1>
            </header>

            <section className="space-y-4">
              <div className="text-[10px] tracking-[0.3em] text-text-dim uppercase opacity-40">The Narrative</div>
              <p className="text-sm leading-relaxed font-light text-foreground/80 whitespace-pre-wrap">{selectedRecord.narrative}</p>
            </section>

            <section className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm space-y-8">
              {selectedRecord.interpretation && (
                <div className="space-y-4">
                  <div className="text-[10px] tracking-widest text-text-dim/40 uppercase">Initial Interpretation</div>
                  <div className="text-sm leading-relaxed font-light">{renderInterpretation(selectedRecord.interpretation)}</div>
                </div>
              )}

              {selectedRecord.life_connection_interpretation && (
                <div className="space-y-4 pt-8 border-t border-white/5">
                  <div className="text-[10px] tracking-widest text-text-dim/40 uppercase">Life Connection Insight</div>
                  <div className="text-sm leading-relaxed font-light">{renderInterpretation(selectedRecord.life_connection_interpretation)}</div>
                </div>
              )}

              {selectedRecord.tarot_card && (
                <div className="space-y-6 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🃏</span>
                    <div className="space-y-1">
                      <div className="text-[10px] tracking-widest text-accent-light/60 uppercase">Tarot Confirmation</div>
                      <div className="text-lg font-medium text-accent-light">{selectedRecord.tarot_card.name}</div>
                    </div>
                  </div>
                  {selectedRecord.tarot_interpretation && (
                    <div className="text-sm leading-relaxed font-light text-foreground/90 italic">
                      {renderInterpretation(selectedRecord.tarot_interpretation)}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col">
        <nav className="flex justify-between items-center mb-8">
          <button onClick={() => setCurrentView("home")} className="text-sm text-text-dim hover:text-foreground">← Back</button>
          <div className="text-sm tracking-widest uppercase">History</div>
        </nav>
        <div className="flex-1 overflow-y-auto space-y-4">
          {records.length === 0 ? (
            <p className="text-center text-text-dim mt-20">No dreams recorded yet.</p>
          ) : (
            records.map((record: any) => (
              <button 
                key={record.id} 
                onClick={() => setSelectedRecord(record)}
                className="w-full text-left p-6 border border-white/5 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] text-text-dim/40 uppercase tracking-widest">{new Date(record.created_at).toLocaleDateString()}</div>
                  {record.tarot_card && <span className="text-xs opacity-40 group-hover:opacity-100 transition-opacity">🃏</span>}
                </div>
                <h3 className="text-lg font-medium mb-2 group-hover:text-accent-light transition-colors">{record.title || "Untitled Dream"}</h3>
                <p className="text-xs text-text-dim line-clamp-2 font-light">{record.narrative}</p>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Tarot Drawing View
  if (showTarotPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
        <div className="bg-glow opacity-40 scale-150" />
        
        <div className="z-10 text-center space-y-12 max-w-sm w-full flex flex-col items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-light tracking-widest uppercase">The Oracle</h2>
            <p className="text-sm text-text-dim font-light leading-relaxed">
              Focus on your dream and the connection to your life. Draw a card for final confirmation.
            </p>
          </div>

          <div className="relative w-full h-80 flex items-center justify-center perspective-1000">
            {session.state === DreamFlowState.TAROT_DRAWING ? (
              <div className="w-48 h-72 rounded-2xl border-2 border-accent/30 bg-black/40 flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(var(--accent-rgb),0.3)]">
                <div className="text-4xl">✨</div>
              </div>
            ) : session.tarotCard ? (
              <div className="w-48 h-72 rounded-2xl border border-accent/50 bg-accent/5 p-6 flex flex-col items-center justify-center text-center animate-in zoom-in duration-700 shadow-2xl overflow-y-auto">
                <div className="text-4xl mb-4">🃏</div>
                <div className="space-y-3">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-accent-light/60">The Drawn Card</div>
                  <h3 className="text-xl font-medium text-accent-light">{session.tarotCard.name}</h3>
                  <div className="text-[10px] text-text-dim italic leading-relaxed border-t border-white/5 pt-2">
                    {session.tarotCard.meaning}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    onClick={() => drawTarot()}
                    className={`absolute w-40 h-64 rounded-xl tarot-card-back shadow-xl transition-all duration-500 hover:-translate-y-4 hover:border-accent/60 animate-fan-${i} active:scale-95`}
                    style={{ zIndex: 5 - Math.abs(2 - i) }}
                  />
                ))}
              </div>
            )}
          </div>

          {session.tarotInterpretation && (
            <div className="w-full mt-8 p-6 bg-white/[0.03] border border-white/5 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="text-[10px] tracking-widest uppercase text-accent-light/40 mb-4">Tarot Confirmation</div>
              <div className="text-sm leading-relaxed font-light text-foreground/90 text-left max-h-48 overflow-y-auto">
                {renderInterpretation(session.tarotInterpretation)}
              </div>
            </div>
          )}

          {(session.state === DreamFlowState.DONE || session.state === DreamFlowState.TAROT_INTERPRETING) && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              {isProcessing ? (
                <div className="text-xs tracking-widest uppercase text-accent-light/60 animate-pulse">Veil is weaving the insight...</div>
              ) : (
                <button 
                  onClick={() => setShowTarotPage(false)}
                  className="px-8 py-3 rounded-full bg-foreground text-background text-sm tracking-widest uppercase font-medium hover:opacity-90 transition-all"
                >
                  Return to descent
                </button>
              )}
            </div>
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
        
        {isProcessing && session.state !== DreamFlowState.TAROT_DRAWING && session.state !== DreamFlowState.TAROT_INTERPRETING && (
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

        {session.state === DreamFlowState.AWAITING_TAROT_DECISION && !isProcessing && (
          <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => drawTarot()} 
              className="w-full py-4 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] text-accent-light"
            >
              ✨ Draw a Tarot card for final insight
            </button>
            <button 
              onClick={skipTarot} 
              className="w-full py-4 text-text-dim hover:text-foreground text-xs transition-colors"
            >
              No, I'm ready to save
            </button>
          </div>
        )}

        {(session.state === DreamFlowState.DONE) && !isProcessing && (
          <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {session.interpretation && (
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
                <div className="text-xs tracking-widest text-text-dim uppercase mb-6 opacity-50">Final Reflections</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-light">
                  {renderInterpretation(session.interpretation)}
                  {session.lifeConnectionInterpretation && (
                    <>
                      <div className="my-8 border-t border-white/5 pt-8" />
                      <div className="text-[10px] tracking-widest text-text-dim/40 uppercase mb-6">Life Connection Insight</div>
                      <div className="text-sm leading-relaxed font-light">
                        {renderInterpretation(session.lifeConnectionInterpretation)}
                      </div>
                    </>
                  )}
                  {session.tarotInterpretation && (
                    <>
                      <div className="my-8 border-t border-white/5 pt-8" />
                      <div className="flex items-center gap-2 text-accent-light mb-6">
                        <span className="text-xl">🃏</span>
                        <span className="text-[10px] tracking-widest uppercase font-medium">Tarot Confirmation</span>
                      </div>
                      {renderInterpretation(session.tarotInterpretation)}
                    </>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <p className="text-[10px] text-text-dim/40 italic uppercase tracking-tighter">
                    Dreams are personal echoes. This is a reflection, not a diagnosis.
                  </p>
                </div>
              </div>
            )}
            
            {session.state === DreamFlowState.DONE && (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSave} 
                  className="w-full py-5 bg-foreground text-background rounded-2xl text-sm font-medium tracking-widest uppercase hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  Save into Archive
                </button>
                <button 
                  onClick={() => setShowPoster(true)} 
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Share Dream Poster
                </button>
                <button 
                  onClick={handleDiscard} 
                  className="w-full py-4 text-red-400/50 hover:text-red-400 text-xs transition-colors"
                >
                  Discard this dream
                </button>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Poster Modal */}
      {showPoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm flex flex-col items-center gap-6">
            <button 
              onClick={() => setShowPoster(false)}
              className="absolute -top-12 right-0 text-white/50 hover:text-white p-2 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div ref={posterRef} className="w-full aspect-[3/4] bg-background border border-white/10 rounded-[2rem] p-8 flex flex-col relative overflow-hidden shadow-2xl">
              <div className="bg-glow opacity-30" />
              <div className="z-10 flex flex-col h-full">
                <div className="text-[10px] tracking-[0.4em] text-text-dim uppercase mb-12">Veil • Dream Record</div>
                
                <h2 className="text-2xl font-light mb-8 leading-tight">{session.title || "Untitled Dream"}</h2>
                
                <div className="flex-1 space-y-6">
                  <div className="space-y-2">
                    <div className="text-[10px] tracking-widest text-text-dim/40 uppercase">The Narrative</div>
                    <p className="text-sm font-light text-foreground/80 line-clamp-[8] leading-relaxed">
                      {session.summary}
                    </p>
                  </div>
                  
                  {session.tarotCard && (
                    <div className="pt-6 border-t border-white/5 flex gap-4">
                      <div className="w-12 h-18 rounded border border-accent/30 bg-black/40 flex-shrink-0 flex items-center justify-center text-lg">🃏</div>
                      <div>
                        <div className="text-[10px] tracking-widest text-accent-light/60 uppercase">Tarot Guidance</div>
                        <div className="text-sm font-medium text-accent-light">{session.tarotCard.name}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-8 flex justify-between items-end">
                  <div className="text-[10px] text-text-dim/30">
                    {new Date().toLocaleDateString()}
                  </div>
                  <div className="text-[10px] tracking-widest text-text-dim/30 uppercase">Unveil your subconscious</div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleShare}
              className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-medium tracking-widest uppercase hover:opacity-90 transition-all active:scale-[0.98] shadow-xl"
            >
              Download Poster
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {(session.state === DreamFlowState.RAW || 
        session.state === DreamFlowState.EXPANDING || 
        session.state === DreamFlowState.AWAITING_CONTINUE_DECISION ||
        session.state === DreamFlowState.AWAITING_LIFE_CONNECTION) && (
        <div className="fixed bottom-0 left-0 w-full p-6 z-20">
          <div className="max-w-2xl mx-auto input-container rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
            <div className="flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={session.state === DreamFlowState.AWAITING_LIFE_CONNECTION ? "Your reflection..." : "Unveil your dream fragments..."}
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

