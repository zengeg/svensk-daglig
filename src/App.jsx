import { useState, useRef, useEffect } from "react";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`;

const ANALYSIS_PROMPT = `You are a Swedish language teacher. The user is at A2 level working toward C1.
Analyze EVERY sentence in the provided Swedish text. Return ONLY valid JSON (no markdown, no backticks, no preamble, no explanation outside the JSON).
Format:
{
  "sentences": [
    {
      "sv": "The Swedish sentence exactly as written",
      "en": "Natural English translation",
      "vocab": [
        { "word": "swedish word", "def": "English definition", "level": "B1" }
      ],
      "grammar": "Grammar explanation focusing on the most important/interesting point in this sentence",
      "phrases": ["related phrase 1 = English meaning", "related phrase 2 = English meaning"]
    }
  ]
}
RULES:
- Include EVERY sentence from the text, in order
- For vocab: only include words ABOVE A2 level. Mark each as B1, B2, or C1
- If a sentence only has A2 words, set vocab to empty array but still include grammar and phrases
- Grammar: explain the most interesting/useful grammar point in each sentence. Be specific and educational.
- Phrases: 2-3 related useful expressions for each sentence
- Keep explanations concise but clear
- All output must be valid JSON, nothing else`;

const TUTOR_SYSTEM = `You are a warm, friendly Swedish conversation tutor. The user is learning Swedish (currently A2, aiming for C1). 
RULES:
- Speak primarily in Swedish
- After difficult words or sentences, add English translation in parentheses
- When the user makes mistakes, gently correct them: show the wrong form, the correct form, and briefly explain why
- Suggest more natural or advanced phrasing when you can
- Do NOT score or rate the user
- Keep responses conversational and not too long
- Adapt to whatever topic the user wants to discuss
- If the user seems stuck, help them along
- Mix in new vocabulary naturally and explain it
- Be encouraging and patient
Start by greeting the user warmly in Swedish and asking what they'd like to talk about.`;

async function callGemini(prompt, systemInstruction) {
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callGeminiChat(messages, systemInstruction) {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = { contents };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function levelColor(level) {
  switch (level) {
    case "B1": return { bg: "var(--b1-bg)", text: "var(--b1-text)" };
    case "B2": return { bg: "var(--b2-bg)", text: "var(--b2-text)" };
    case "C1": return { bg: "var(--c1-bg)", text: "var(--c1-text)" };
    default: return { bg: "var(--warm-gray)", text: "var(--muted)" };
  }
}

export default function SvenskDaglig() {
  const [tab, setTab] = useState("analyze");
  const [inputText, setInputText] = useState("");
  const [sentences, setSentences] = useState(null);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tutorStarted, setTutorStarted] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleAnalyze = async () => {
    if (!inputText.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setSentences(null);
    setSentenceIdx(0);
    try {
      const raw = await callGemini(
        `${ANALYSIS_PROMPT}\n\n---\nTEXT:\n${inputText.trim()}`
      );
      console.log("RAW:", raw);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.sentences && parsed.sentences.length > 0) {
        setSentences(parsed.sentences);
      } else {
        setAnalyzeError("No sentences found. Try pasting a longer text.");
      }
    } catch (e) {
      console.error(e);
      setAnalyzeError("Analysis failed. Check your text and try again.");
    }
    setAnalyzing(false);
  };

  const clearAnalysis = () => {
    setSentences(null);
    setSentenceIdx(0);
    setInputText("");
    setAnalyzeError("");
  };

  const s = sentences?.[sentenceIdx];

  const startTutor = async () => {
    setTutorStarted(true);
    setChatLoading(true);
    try {
      const firstMsg = [{ role: "user", content: "Hej! Jag vill öva min svenska." }];
      const reply = await callGeminiChat(firstMsg, TUTOR_SYSTEM);
      setMessages([
        { role: "user", content: "Hej! Jag vill öva min svenska." },
        { role: "assistant", content: reply || "Hej! Vad vill du prata om idag?" },
      ]);
    } catch {
      setMessages([{ role: "assistant", content: "Något gick fel — försök igen." }]);
    }
    setChatLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMsgs = [...messages, { role: "user", content: userMsg }];
    setMessages(newMsgs);
    setChatLoading(true);
    try {
      const reply = await callGeminiChat(newMsgs, TUTOR_SYSTEM);
      setMessages([...newMsgs, { role: "assistant", content: reply || "..." }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "Något gick fel — försök igen." }]);
    }
    setChatLoading(false);
  };

  return (
    <div style={{ fontFamily: "'Crimson Pro', Georgia, serif", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
          --bg: #f5f3ed; --text: #2a2a28; --muted: #807e76; --accent: #2d6a4f;
          --accent-hover: #245a42; --card: #fefefe; --border: #dedad0;
          --warm-gray: #edeae2; --gold: #7a5c1e; --gold-bg: #faf5e4;
          --blue: #2c4a7c; --blue-bg: #edf2fa;
          --b1-bg: #dbeafe; --b1-text: #1e40af;
          --b2-bg: #fef3c7; --b2-text: #92400e;
          --c1-bg: #fce7f3; --c1-text: #9d174d;
          --user-bg: #2d6a4f; --user-text: #fff;
          --bot-bg: #edeae2; --bot-text: #2a2a28;
          --radius: 10px; --shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #18181a; --text: #e2e0d8; --muted: #8a887e; --accent: #6fb490;
            --accent-hover: #5da07c; --card: #232325; --border: #3a3a36;
            --warm-gray: #2a2a27; --gold: #d4a72c; --gold-bg: #2a2510;
            --blue: #7ca2d4; --blue-bg: #1a2233;
            --b1-bg: #1e2d44; --b1-text: #7cb3f0;
            --b2-bg: #2e2510; --b2-text: #e0b040;
            --c1-bg: #301828; --c1-text: #e87aa0;
            --user-bg: #2d5a44; --user-text: #e2e0d8;
            --bot-bg: #2a2a27; --bot-text: #e2e0d8;
            --shadow: 0 1px 4px rgba(0,0,0,0.2);
          }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .app-header { padding: 18px 24px 0; display: flex; align-items: baseline; gap: 10px; }
        .app-header h1 { font-size: 26px; font-weight: 300; letter-spacing: -0.02em; }
        .app-header h1 b { font-weight: 700; color: var(--accent); }
        .tabs { display: flex; margin: 14px 24px 0; border-bottom: 1px solid var(--border); }
        .tab { padding: 10px 20px; border: none; background: none; font-family: 'Crimson Pro', serif; font-size: 16px; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab:hover { color: var(--text); }
        .tab.on { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
        .container { max-width: 660px; margin: 0 auto; padding: 20px 24px; }
        .paste-area { width: 100%; min-height: 140px; padding: 16px; border: 1.5px solid var(--border); border-radius: var(--radius); font-family: 'Crimson Pro', serif; font-size: 17px; line-height: 1.6; background: var(--card); color: var(--text); resize: vertical; outline: none; transition: border-color 0.2s; }
        .paste-area:focus { border-color: var(--accent); }
        .paste-area::placeholder { color: var(--muted); font-style: italic; }
        .action-row { display: flex; gap: 10px; margin-top: 12px; align-items: center; }
        .btn { padding: 11px 28px; border: none; border-radius: 7px; font-family: 'Crimson Pro', serif; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: 0.45; cursor: default; }
        .btn-ghost { background: none; border: none; color: var(--muted); padding: 11px 16px; text-decoration: underline; font-size: 14px; cursor: pointer; font-family: 'Crimson Pro', serif; }
        .btn-ghost:hover { color: var(--text); }
        .char-count { margin-left: auto; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); }
        .s-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; animation: rise 0.3s ease-out; margin-top: 20px; }
        @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .s-sv { padding: 22px 22px 10px; font-size: 20px; line-height: 1.55; font-weight: 500; }
        .s-en { padding: 0 22px 18px; font-size: 15px; line-height: 1.5; color: var(--muted); font-style: italic; border-bottom: 1px solid var(--border); }
        .sec { padding: 14px 22px; }
        .sec-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px; }
        .v-row { display: flex; align-items: baseline; gap: 8px; font-size: 15px; line-height: 1.5; padding: 3px 0; }
        .v-word { font-weight: 600; color: var(--accent); white-space: nowrap; }
        .v-def { color: var(--muted); flex: 1; }
        .v-level { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
        .g-card { margin: 10px 22px; padding: 13px 16px; background: var(--gold-bg); border-radius: 7px; font-size: 14px; line-height: 1.65; color: var(--gold); }
        .p-card { margin: 0 22px 18px; padding: 13px 16px; background: var(--blue-bg); border-radius: 7px; font-size: 14px; line-height: 1.8; color: var(--blue); }
        .nav-row { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-bottom: 24px; }
        .nav-btn { padding: 10px 22px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); font-family: 'Crimson Pro', serif; font-size: 15px; cursor: pointer; box-shadow: var(--shadow); transition: all 0.15s; }
        .nav-btn:hover { border-color: var(--accent); color: var(--accent); }
        .nav-btn:disabled { opacity: 0.25; cursor: default; }
        .nav-btn.g { background: var(--accent); color: #fff; border-color: var(--accent); }
        .nav-btn.g:hover { opacity: 0.9; }
        .nav-count { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted); }
        .progress-track { margin-top: 20px; height: 3px; background: var(--warm-gray); border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s; }
        .loading-wrap { display: flex; flex-direction: column; align-items: center; padding: 60px 0; gap: 16px; }
        .spin { width: 28px; height: 28px; border: 2.5px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: sp 0.7s linear infinite; }
        @keyframes sp { to { transform: rotate(360deg); } }
        .load-text { font-size: 15px; color: var(--muted); font-style: italic; }
        .err-text { font-size: 15px; color: #b34040; text-align: center; margin-top: 16px; }
        .chat-wrap { display: flex; flex-direction: column; height: calc(100vh - 96px); max-width: 660px; margin: 0 auto; }
        .chat-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
        .msg { max-width: 80%; margin-bottom: 12px; padding: 12px 16px; font-size: 16px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
        .msg.u { margin-left: auto; background: var(--user-bg); color: var(--user-text); border-radius: 16px 16px 4px 16px; }
        .msg.a { margin-right: auto; background: var(--bot-bg); color: var(--bot-text); border-radius: 16px 16px 16px 4px; }
        .chat-bar { padding: 12px 24px 16px; display: flex; gap: 8px; border-top: 1px solid var(--border); background: var(--bg); }
        .chat-in { flex: 1; padding: 12px 16px; border: 1.5px solid var(--border); border-radius: 8px; font-family: 'Crimson Pro', serif; font-size: 16px; background: var(--card); color: var(--text); outline: none; }
        .chat-in:focus { border-color: var(--accent); }
        .chat-in::placeholder { color: var(--muted); }
        .chat-send { padding: 12px 20px; border: none; border-radius: 8px; background: var(--accent); color: #fff; font-family: 'Crimson Pro', serif; font-size: 15px; cursor: pointer; }
        .chat-send:disabled { opacity: 0.35; cursor: default; }
        .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; padding: 40px; }
        .chat-empty h2 { font-size: 22px; font-weight: 400; }
        .chat-empty p { font-size: 14px; color: var(--muted); max-width: 350px; line-height: 1.6; }
        .dots { display: inline-flex; gap: 4px; padding: 4px 0; }
        .dots span { width: 5px; height: 5px; background: var(--muted); border-radius: 50%; animation: bk 1.4s infinite; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bk { 0%,80%,100%{opacity:0.25} 40%{opacity:1} }
      `}</style>

      <div className="app-header">
        <span style={{ fontSize: 22 }}>🇸🇪</span>
        <h1>Svensk<b>Daglig</b></h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "analyze" ? "on" : ""}`} onClick={() => setTab("analyze")}>Analysera</button>
        <button className={`tab ${tab === "tutor" ? "on" : ""}`} onClick={() => setTab("tutor")}>Samtala</button>
      </div>

      {tab === "analyze" && (
        <div className="container">
          {!sentences && !analyzing && (
            <>
              <textarea
                className="paste-area"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={"Klistra in valfri svensk text här...\n\nPaste any Swedish text — a news article, a book paragraph, a tweet. Every sentence will be analyzed."}
              />
              <div className="action-row">
                <button className="btn btn-primary" onClick={handleAnalyze} disabled={!inputText.trim()}>Analysera</button>
                <span className="char-count">{inputText.length} tecken</span>
              </div>
              {analyzeError && <div className="err-text">{analyzeError}</div>}
            </>
          )}
          {analyzing && (
            <div className="loading-wrap">
              <div className="spin" />
              <div className="load-text">Analyserar varje mening...</div>
            </div>
          )}
          {sentences && s && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>{sentences.length} meningar analyserade</span>
                <button className="btn-ghost" onClick={clearAnalysis}>← Ny text</button>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${((sentenceIdx + 1) / sentences.length) * 100}%` }} />
              </div>
              <div className="s-card" key={sentenceIdx}>
                <div className="s-sv">{s.sv}</div>
                <div className="s-en">{s.en}</div>
                {s.vocab && s.vocab.length > 0 && (
                  <div className="sec">
                    <div className="sec-label" style={{ color: "var(--accent)" }}>Vocabulary</div>
                    {s.vocab.map((v, i) => {
                      const lc = levelColor(v.level);
                      return (
                        <div className="v-row" key={i}>
                          <span className="v-word">{v.word}</span>
                          <span className="v-def">{v.def}</span>
                          <span className="v-level" style={{ background: lc.bg, color: lc.text }}>{v.level}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {s.grammar && (
                  <div className="g-card">
                    <div className="sec-label" style={{ color: "var(--gold)", marginBottom: 4 }}>Grammar</div>
                    {s.grammar}
                  </div>
                )}
                {s.phrases && s.phrases.length > 0 && (
                  <div className="p-card">
                    <div className="sec-label" style={{ color: "var(--blue)", marginBottom: 4 }}>Useful Phrases</div>
                    {s.phrases.map((p, i) => <div key={i}>{p}</div>)}
                  </div>
                )}
              </div>
              <div className="nav-row">
                <button className="nav-btn" onClick={() => setSentenceIdx(sentenceIdx - 1)} disabled={sentenceIdx === 0}>← Föregående</button>
                <span className="nav-count">{sentenceIdx + 1} / {sentences.length}</span>
                <button
                  className={`nav-btn ${sentenceIdx < sentences.length - 1 ? "g" : ""}`}
                  onClick={() => { if (sentenceIdx < sentences.length - 1) setSentenceIdx(sentenceIdx + 1); else clearAnalysis(); }}
                >
                  {sentenceIdx < sentences.length - 1 ? "Nästa →" : "Ny text ↻"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "tutor" && (
        <div className="chat-wrap">
          {!tutorStarted ? (
            <div className="chat-empty">
              <div style={{ fontSize: 44 }}>💬</div>
              <h2>Samtala på svenska</h2>
              <p>Chat freely in Swedish. You'll get gentle corrections and suggestions for more natural phrasing.</p>
              <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--muted)" }}>For speech practice, use Claude's speech mode.</p>
              <button className="btn btn-primary" onClick={startTutor}>Börja samtalet</button>
            </div>
          ) : (
            <>
              <div style={{ padding: "8px 24px", display: "flex", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
                <button className="btn-ghost" onClick={() => { setMessages([]); setTutorStarted(false); }}>Börja om</button>
              </div>
              <div className="chat-body">
                {messages.map((m, i) =>
                  i === 0 ? null : (
                    <div key={i} className={`msg ${m.role === "user" ? "u" : "a"}`}>{m.content}</div>
                  )
                )}
                {chatLoading && (
                  <div className="msg a">
                    <div className="dots"><span /><span /><span /></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-bar">
                <input
                  className="chat-in"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                  placeholder="Skriv på svenska..."
                  disabled={chatLoading}
                />
                <button className="chat-send" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Skicka</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
