"use client";

import { useState, useEffect, useRef } from "react";
import { useOrchestrator } from "@/lib/useOrchestrator";
import { DreamFlowState } from "@/lib/dream-model";
import { toPng } from "html-to-image";

// Streaming Text Component with paragraph support
function StreamingText({ 
  text, 
  speed = 20, 
  onComplete,
  active = true 
}: { 
  text: string; 
  speed?: number; 
  onComplete?: () => void;
  active?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, speed, onComplete, active]);

  return <>{displayedText}</>;
}

export default function App() {
  const [currentView, setCurrentView] = useState("login"); // login, home, chat, history, summary
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isNewSession, setIsNewSession] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [streamingParagraphIndex, setStreamingParagraphIndex] = useState(0);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);

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
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // Helper to handle paragraph streaming completion
  const handleParagraphComplete = (isLast: boolean) => {
    if (isLast) {
      setIsStreamingComplete(true);
      return;
    }
    setTimeout(() => {
      setStreamingParagraphIndex(prev => prev + 1);
    }, 400); // 400ms delay between paragraphs
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session.messages, session.state]);

  useEffect(() => {
    if (session.state === DreamFlowState.TAROT_DRAWING || session.state === DreamFlowState.TAROT_INTERPRETING) {
      setShowTarotPage(true);
    } else if (session.state === DreamFlowState.DONE && showTarotPage) {
      // Keep it open until user hits return
    }
  }, [session.state, showTarotPage]);

  // Transition to Summary view when done
  useEffect(() => {
    if (session.state === DreamFlowState.DONE && !showTarotPage && currentView === 'chat') {
      setIsNewSession(true);
      setIsStreamingComplete(true); // Summary view is static
      setCurrentView('summary');
    }
  }, [session.state, showTarotPage, currentView]);

  const handleDrawTarot = (index: number) => {
    setSelectedCardIndex(index);
    drawTarot();
  };

  const handleLogin = (provider: string) => {
    setCurrentView("home");
  };

  const startChat = () => {
    resetSession();
    setSelectedCardIndex(null);
    setIsNewSession(true);
    setStreamingParagraphIndex(0);
    setIsStreamingComplete(false);
    setCurrentView("chat");
  };

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    
    // Reset streaming for new messages in chat
    setStreamingParagraphIndex(0);
    setIsStreamingComplete(false);
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
    setSelectedCardIndex(null);
    setCurrentView("home");
  };

  const handleSave = async () => {
    const success = await saveRecord();
    if (success) {
      resetSession();
      setSelectedCardIndex(null);
      setCurrentView("history");
    }
  };

  const handleDelete = async () => {
    const recordToDelete = selectedRecord || (isNewSession ? session.completedRecord : null);
    if (!recordToDelete) {
      resetSession();
      setCurrentView("home");
      return;
    }

    const records = JSON.parse(localStorage.getItem("dream_records") || "[]");
    const updated = records.filter((r: any) => r.id !== (recordToDelete.id || recordToDelete.sessionID));
    localStorage.setItem("dream_records", JSON.stringify(updated));
    
    setSelectedRecord(null);
    setShowDeleteConfirm(false);
    resetSession();
    setCurrentView("history");
  };

  const handleShare = async () => {
    // Auto-save if it's a new session and not already saved
    if (isNewSession && !session.completedRecord) {
      await saveRecord();
    }

    setShowPoster(true);
  };

  const triggerShare = async () => {
    if (!posterRef.current) return;
    try {
      const dataUrl = await toPng(posterRef.current, { 
        cacheBust: true,
        style: { transform: 'scale(1)' }
      });
      
      const title = session.title || selectedRecord?.title || "My Dream";
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `dream-${title.toLowerCase().replace(/\s+/g, '-')}.png`, { type: "image/png" });

      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: "I unveiled my dream with Veil."
          });
        } catch (shareErr) {
          downloadPoster(dataUrl, title);
        }
      } else {
        downloadPoster(dataUrl, title);
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const downloadPoster = (dataUrl: string, title: string) => {
    const link = document.createElement("a");
    link.download = `dream-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Helper to render interpretation with streaming effect
  const renderInterpretation = (text: string, isNew: boolean = false) => {
    if (!text) return null;
    
    const cleanText = text.replace(/\*/g, "");
    const paragraphs = cleanText.split(/\n+/).filter(p => p.trim());
    
    return paragraphs.map((paragraph, idx) => {
      // For summary view (isNew=false), everything is visible immediately
      // For chat view (isNew=true), we use streaming
      const isVisible = !isNew || idx <= streamingParagraphIndex;
      const isStreaming = isNew && idx === streamingParagraphIndex;
      const isLast = idx === paragraphs.length - 1;

      const colonIndex = paragraph.indexOf(":");
      let title = "";
      let content = paragraph;

      if (colonIndex > 0 && colonIndex < 40) {
        title = paragraph.substring(0, colonIndex).trim();
        content = paragraph.substring(colonIndex + 1).trim();
      }

      if (!isVisible) return null;

      return (
        <div key={idx} className={`mb-6 last:mb-0 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {title && <div className="text-[10px] tracking-widest uppercase text-accent-light/60 mb-2 font-bold italic"><i><b>{title}</b></i></div>}
          <div className="text-sm leading-relaxed font-light text-foreground/90 text-justify">
            {isStreaming ? (
              <StreamingText 
                text={content} 
                onComplete={() => handleParagraphComplete(isLast)}
              />
            ) : (
              content
            )}
          </div>
        </div>
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
            <button onClick={() => setCurrentView("history")} className="hover:text-foreground transition-colors">History</button>
            <button onClick={() => setCurrentView("login")} className="hover:text-foreground transition-colors">Log out</button>
          </div>
        </nav>
        <h1 className="text-2xl font-light mb-8">What fragments remain from your dream?</h1>
        <button onClick={startChat} className="px-8 py-3 rounded-full bg-foreground text-background hover:opacity-90 transition shadow-2xl shadow-black/20">Begin the descent</button>
      </div>
    );
  }

  if (currentView === "history") {
    const records = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("dream_records") || "[]") : [];
    
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col">
        <nav className="flex justify-between items-center mb-8">
          <button onClick={() => setCurrentView("home")} className="text-sm text-text-dim hover:text-foreground transition-colors">← Back</button>
          <div className="text-sm tracking-widest uppercase">History</div>
        </nav>
        <div className="flex-1 overflow-y-auto space-y-4">
          {records.length === 0 ? (
            <p className="text-center text-text-dim mt-20">No dreams recorded yet.</p>
          ) : (
            records.map((record: any) => (
              <button 
                key={record.id} 
                onClick={() => {
                  setSelectedRecord(record);
                  setIsNewSession(false);
                  setCurrentView('summary');
                }}
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

  // Unified Summary / Detail View
  if (currentView === "summary") {
    const data = isNewSession ? session : selectedRecord;
    if (!data) return null;

    // Use specific interpretation fields from record or session
    const interpretation = data.interpretation || "";
    const lifeInsight = data.life_connection_interpretation || data.lifeConnectionInterpretation || "";
    const tarotCard = data.tarot_card || data.tarotCard || null;
    const tarotInterpretation = data.tarot_interpretation || data.tarotInterpretation || "";

    // Narrative processing for first-person
    let narrative = data.narrative || data.summary || "";
    if (narrative && !narrative.toLowerCase().startsWith("i dreamed")) {
      narrative = "I dreamed " + narrative.charAt(0).toLowerCase() + narrative.slice(1);
    }

    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col relative overflow-hidden">
        <div className="bg-glow opacity-20" />
        <nav className="flex justify-between items-center mb-8 z-10">
          <button 
            onClick={() => {
              if (isNewSession) {
                setShowDeleteConfirm(true);
              } else {
                setSelectedRecord(null);
                setCurrentView("history");
              }
            }} 
            className="text-sm text-text-dim hover:text-foreground transition-colors"
          >
            {isNewSession ? "← Discard" : "← Back"}
          </button>
          <div className="text-xs tracking-widest uppercase opacity-50">Dream Summary</div>
        </nav>
        
        <div className="flex-1 overflow-y-auto space-y-8 pb-32 z-0 no-scrollbar">
          <header className="space-y-2">
            <div className="text-xs text-text-dim/60 uppercase tracking-widest">
              {new Date(data.created_at || Date.now()).toLocaleDateString()}
            </div>
            <h1 className="text-3xl font-light italic leading-tight">{data.title || "Untitled Dream"}</h1>
          </header>

          <section className="space-y-4">
            <div className="text-[10px] tracking-[0.3em] text-text-dim uppercase opacity-40 font-bold italic"><i><b>The Narrative</b></i></div>
            <p className="text-sm leading-relaxed font-light text-foreground/80 whitespace-pre-wrap italic">
              {narrative}
            </p>
          </section>

          {(interpretation || lifeInsight || tarotCard) && (
            <div className="space-y-12">
              {interpretation && (
                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm space-y-6">
                  <div className="text-[10px] tracking-widest text-text-dim/40 uppercase font-bold italic"><i><b>Initial Interpretation</b></i></div>
                  <div className="text-sm leading-relaxed font-light">{renderInterpretation(interpretation, false)}</div>
                </div>
              )}

              {lifeInsight && (
                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm space-y-6">
                  <div className="text-[10px] tracking-widest text-text-dim/40 uppercase font-bold italic"><i><b>Life Connection Insight</b></i></div>
                  <div className="text-sm leading-relaxed font-light">{renderInterpretation(lifeInsight, false)}</div>
                </div>
              )}

              {tarotCard && (
                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm space-y-8">
                  <div className="flex items-center gap-6">
                    <div 
                      className="w-24 h-44 rounded-xl border border-accent-light/30 bg-black/40 shadow-2xl shadow-accent/5 bg-cover bg-center"
                      style={{ backgroundImage: `url(${tarotCard.image})` }}
                    />
                    <div className="space-y-1">
                      <div className="text-[10px] tracking-widest text-accent-light/60 uppercase font-bold italic"><i><b>Tarot Confirmation</b></i></div>
                      <div className="text-2xl font-medium text-accent-light uppercase tracking-tight">{tarotCard.name}</div>
                    </div>
                  </div>
                  {tarotInterpretation && (
                    <div className="text-sm leading-relaxed font-light text-foreground/90 italic pt-6 border-t border-white/5">
                      {renderInterpretation(tarotInterpretation, false)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-background via-background/90 to-transparent z-20">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <div className="flex gap-3">
              <button 
                onClick={handleShare} 
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-medium tracking-widest uppercase transition-all flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share
              </button>
              {isNewSession ? (
                <button 
                  onClick={handleSave} 
                  className="flex-1 py-4 bg-foreground text-background rounded-2xl text-sm font-medium tracking-widest uppercase hover:opacity-90 transition-all"
                >
                  Save
                </button>
              ) : (
                <button 
                  onClick={() => setShowDeleteConfirm(true)} 
                  className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium tracking-widest uppercase transition-all"
                >
                  Remove
                </button>
              )}
            </div>
            {isNewSession && (
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="w-full py-3 text-text-dim hover:text-red-400 text-xs transition-colors uppercase tracking-widest"
              >
                Discard
              </button>
            )}
          </div>
        </div>

        {/* Delete/Discard Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-background border border-white/10 p-8 rounded-[2rem] max-w-xs w-full text-center space-y-6 shadow-2xl">
              <div className="text-3xl">🌑</div>
              <p className="text-sm font-light leading-relaxed">
                {isNewSession 
                  ? "Are you sure you want to discard this dream fragment?" 
                  : "Are you sure you want to remove this dream from your memory?"}
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleDelete}
                  className="w-full py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-xs font-medium uppercase tracking-widest transition-colors"
                >
                  Yes, Remove it
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-3 text-text-dim hover:text-foreground text-xs uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
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

          <div className="relative w-full h-96 flex items-center justify-center perspective-1000">
            <div className={`tarot-fan-container ${selectedCardIndex !== null ? 'card-selected' : ''}`}>
              <div className="tarot-fan-inner">
                {Array.from({ length: 23 }).map((_, i) => {
                  const isSelected = selectedCardIndex === i;
                  const hasRevealed = isSelected && session.tarotCard;

                  return (
                    <button
                      key={i}
                      onClick={() => !isProcessing && handleDrawTarot(i)}
                      disabled={selectedCardIndex !== null && !isSelected}
                      className={`tarot-card-item ${isSelected ? 'selected' : ''} ${hasRevealed ? 'revealed' : 'tarot-card-back'}`}
                      style={{ 
                        zIndex: isSelected ? 2000 : i,
                        transform: isSelected 
                          ? 'translate(-50%, -50%) scale(1)' 
                          : `rotate(${(i - 11) * 3}deg) translateX(${(i - 11) * 15}px) translateY(${Math.pow(Math.abs(i - 11), 1.5) * 0.8}px)`
                      }}
                    >
                      {hasRevealed && (
                        <div 
                          className="absolute inset-0 tarot-card-revealed animate-in fade-in duration-1000 flex flex-col items-center justify-end p-6 text-center"
                          style={{ backgroundImage: `url(${session.tarotCard.image})` }}
                        >
                          <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 w-full">
                            <div className="text-[8px] tracking-[0.2em] uppercase text-accent-light/60 mb-1">The Oracle's Sign</div>
                            <h3 className="text-sm font-medium text-accent-light leading-tight uppercase">{session.tarotCard.name}</h3>
                          </div>
                        </div>
                      )}
                      {isSelected && !hasRevealed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-2xl animate-pulse">✨</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {session.tarotInterpretation && (
            <div className="w-full mt-8 p-6 bg-white/[0.03] border border-white/5 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="text-[10px] tracking-widest uppercase text-accent-light/40 mb-4">Tarot Confirmation</div>
              <div className="text-sm leading-relaxed font-light text-foreground/90 text-left max-h-48 overflow-y-auto no-scrollbar">
                {renderInterpretation(session.tarotInterpretation, true)}
              </div>
            </div>
          )}

          {(session.state === DreamFlowState.DONE || session.state === DreamFlowState.TAROT_INTERPRETING) && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
              {isProcessing ? (
                <div className="text-xs tracking-widest uppercase text-accent-light/60 animate-pulse">Veil is weaving the insight...</div>
              ) : (
                <button 
                  onClick={() => {
                    setShowTarotPage(false);
                    setStreamingParagraphIndex(0);
                    setCurrentView('summary');
                  }}
                  className="px-8 py-3 rounded-full bg-foreground text-background text-sm tracking-widest uppercase font-medium hover:opacity-90 transition-all shadow-xl"
                >
                  View Full Summary
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

      <div className="flex-1 overflow-y-auto pb-40 space-y-8 px-6 pt-8 scroll-smooth z-0 no-scrollbar">
        {session.messages.length === 0 && (
          <div className="text-center text-text-dim mt-20 font-light italic opacity-50">
            Tell it as it comes back to you. I will stay close to the shape of it.
          </div>
        )}

        {session.messages.map((msg: any, i: number) => {
          const isLastMessage = i === session.messages.length - 1;
          const isAssistant = msg.role === "assistant";
          
          return (
            <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <div className={`bubble ${
                msg.role === "user" ? "bubble-user shadow-lg shadow-black/20" : "bubble-veil"
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {isAssistant && isLastMessage && !isProcessing ? (
                    <StreamingText text={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
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

        {session.state === DreamFlowState.STRUCTURED && !isProcessing && isStreamingComplete && (
          <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => {
                setStreamingParagraphIndex(0);
                setIsStreamingComplete(false);
                generateInterpretation();
              }} 
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

        {session.state === DreamFlowState.AWAITING_TAROT_DECISION && !isProcessing && isStreamingComplete && (
          <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
              onClick={() => setShowTarotPage(true)} 
              className="w-full py-4 bg-accent/20 hover:bg-accent/30 border border-accent/30 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] text-accent-light"
            >
              ✨ Draw a Tarot card for final insight
            </button>
            <button 
              onClick={() => {
                skipTarot();
                setStreamingParagraphIndex(0);
                setIsStreamingComplete(true);
                setCurrentView('summary');
              }} 
              className="w-full py-4 text-text-dim hover:text-foreground text-xs transition-colors"
            >
              No, I'm ready to save
            </button>
          </div>
        )}

        {(session.state === DreamFlowState.DONE) && !isProcessing && isStreamingComplete && (
          <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {session.interpretation && (
              <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm">
                <div className="text-xs tracking-widest text-text-dim uppercase mb-6 opacity-50">Final Reflections</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-light">
                  {renderInterpretation(session.interpretation, true)}
                  {session.lifeConnectionInterpretation && (
                    <>
                      <div className="my-8 border-t border-white/5 pt-8" />
                      <div className="text-[10px] tracking-widest text-text-dim/40 uppercase mb-6">Life Connection Insight</div>
                      <div className="text-sm leading-relaxed font-light">
                        {renderInterpretation(session.lifeConnectionInterpretation, true)}
                      </div>
                    </>
                  )}
                  {session.tarotInterpretation && (
                    <>
                      <div className="my-8 border-t border-white/5 pt-8" />
                      <div className="flex items-center gap-4 text-accent-light mb-6">
                        <div 
                          className="w-12 h-20 rounded border border-accent-light/20 bg-cover bg-center"
                          style={{ backgroundImage: `url(${session.tarotCard.image})` }}
                        />
                        <span className="text-[10px] tracking-widest uppercase font-medium">Tarot Confirmation</span>
                      </div>
                      {renderInterpretation(session.tarotInterpretation, true)}
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowPoster(false)}
        >
          <div 
            className="relative w-full max-w-sm flex flex-col items-center gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={posterRef} className="w-full aspect-[3/4.5] bg-background border border-white/10 rounded-[2rem] p-8 flex flex-col relative overflow-hidden shadow-2xl">
              <div className="bg-glow opacity-30" />
              <div className="z-10 flex flex-col h-full">
                <div className="text-[10px] tracking-[0.4em] text-text-dim uppercase mb-10">Veil • Dream Record</div>
                
                <h2 className="text-2xl font-light mb-6 leading-tight italic">{session.title || selectedRecord?.title || "Untitled Dream"}</h2>
                
                <div className="flex-1 space-y-6 overflow-hidden">
                  <div className="space-y-2">
                    <div className="text-[8px] tracking-[0.2em] text-text-dim/40 uppercase">The Narrative</div>
                    <p className="text-xs font-light text-foreground/80 line-clamp-[6] leading-relaxed italic">
                      "I dreamed {session.summary.replace(/\b[I|i]\s/g, "I ").replace(/^[I|i]\s/, "I ").charAt(0).toLowerCase() + session.summary.slice(1)}"
                    </p>
                  </div>
                  
                  {(session.tarotCard || selectedRecord?.tarot_card) && (
                    <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-3">
                      <div className="w-10 h-16 rounded border border-accent/30 bg-black/40 flex items-center justify-center text-xl shadow-lg shadow-accent/5">🃏</div>
                      <div className="text-center">
                        <div className="text-[8px] tracking-widest text-accent-light/60 uppercase mb-1">The Oracle's Sign</div>
                        <div className="text-xs font-medium text-accent-light tracking-wide">{(session.tarotCard || selectedRecord?.tarot_card).name}</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[8px] tracking-widest text-text-dim/40 uppercase mb-2">The Unveiling</div>
                    <div className="text-[11px] leading-relaxed font-light text-foreground/90 text-justify line-clamp-4 italic opacity-80">
                      {(session.interpretation || selectedRecord?.interpretation || "").split('\n')[0].replace(/.*:/, '').trim()}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex justify-between items-end">
                  <div className="text-[8px] text-text-dim/30">
                    {new Date(selectedRecord?.created_at || Date.now()).toLocaleDateString()}
                  </div>
                  <div className="text-[8px] tracking-widest text-text-dim/30 uppercase">Unveil your subconscious</div>
                </div>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div className="flex justify-center gap-6">
                <button onClick={triggerShare} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg">
                  <span className="text-xl">📸</span>
                </button>
                <button onClick={triggerShare} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg">
                  <span className="text-xl">𝕏</span>
                </button>
                <button onClick={triggerShare} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg">
                  <span className="text-xl">🧵</span>
                </button>
              </div>
              <button 
                onClick={() => setShowPoster(false)}
                className="w-full py-3 text-text-dim hover:text-foreground text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Back to Record
              </button>
            </div>
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

