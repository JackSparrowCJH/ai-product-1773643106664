"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

const SKINS = [
  { id: "classic", label: "经典", color: "#8B4513", glow: "#FFD700", bg: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", freq: 150 },
  { id: "cyber", label: "赛博朋克", color: "#0ff", glow: "#f0f", bg: "linear-gradient(135deg,#0a0a0a,#1a0030,#000a20)", freq: 200 },
  { id: "zen", label: "禅意", color: "#2d5016", glow: "#90EE90", bg: "linear-gradient(135deg,#f5f0e8,#e8e0d0,#d4c8b0)", freq: 120 },
  { id: "gold", label: "黄金", color: "#DAA520", glow: "#FFD700", bg: "linear-gradient(135deg,#1a1000,#2a1800,#3a2000)", freq: 180 },
];

interface FloatText { id: number; x: number; y: number; }
interface Particle { id: number; x: number; y: number; angle: number; speed: number; life: number; color: string; size: number; }
interface LeaderEntry { id: string; name: string; merit: string; }

function generateId() {
  return "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function WoodenFish() {
  const [merit, setMerit] = useState(0);
  const [combo, setCombo] = useState(0);
  const [skinIdx, setSkinIdx] = useState(0);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pressed, setPressed] = useState(false);
  const [showSkins, setShowSkins] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [screenFlash, setScreenFlash] = useState("");

  const comboTimer = useRef<any>(null);
  const floatId = useRef(0);
  const particleId = useRef(0);
  const syncTimer = useRef<any>(null);
  const meritRef = useRef(merit);
  const audioCtx = useRef<AudioContext | null>(null);

  meritRef.current = merit;
  const skin = SKINS[skinIdx];

  // Init user
  useEffect(() => {
    let id = localStorage.getItem("wf_uid");
    if (!id) { id = generateId(); localStorage.setItem("wf_uid", id); }
    setUserId(id);
    const savedSkin = localStorage.getItem("wf_skin");
    if (savedSkin) { const i = SKINS.findIndex(s => s.id === savedSkin); if (i >= 0) setSkinIdx(i); }
    const savedMerit = localStorage.getItem("wf_merit");
    if (savedMerit) setMerit(parseInt(savedMerit, 10) || 0);

    fetch("/api/init", { method: "POST" }).then(() => {
      const name = localStorage.getItem("wf_name") || "匿名";
      setUserName(name);
      fetch("/api/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name }) })
        .then(r => r.json())
        .then(u => { if (u && u.merit) { const m = parseInt(u.merit, 10); if (m > (parseInt(savedMerit || "0", 10))) setMerit(m); } })
        .catch(() => {});
    }).catch(() => {});
  }, []);

  // Save locally on merit change
  useEffect(() => { localStorage.setItem("wf_merit", String(merit)); }, [merit]);

  // Periodic sync
  useEffect(() => {
    syncTimer.current = setInterval(() => {
      if (userId) {
        fetch("/api/merit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, merit: meritRef.current }) }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(syncTimer.current);
  }, [userId]);

  // Particle animation
  useEffect(() => {
    if (particles.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setParticles(prev => prev.map(p => ({ ...p, life: p.life - 0.02, x: p.x + Math.cos(p.angle) * p.speed, y: p.y + Math.sin(p.angle) * p.speed - 0.5 })).filter(p => p.life > 0));
    });
    return () => cancelAnimationFrame(frame);
  }, [particles]);

  const playSound = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = skin.freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }, [skin.freq]);

  const spawnParticles = useCallback((count: number, colors: string[]) => {
    const newP: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newP.push({
        id: particleId.current++,
        x: 50, y: 50,
        angle: (Math.PI * 2 * i) / count + Math.random() * 0.3,
        speed: 1 + Math.random() * 2,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
      });
    }
    setParticles(prev => [...prev, ...newP]);
  }, []);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    playSound();
    setMerit(m => m + 1);
    setPressed(true);
    setTimeout(() => setPressed(false), 100);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let cx: number, cy: number;
    if ("touches" in e) {
      cx = e.touches[0].clientX - rect.left;
      cy = e.touches[0].clientY - rect.top;
    } else {
      cx = e.clientX - rect.left;
      cy = e.clientY - rect.top;
    }
    const fid = floatId.current++;
    setFloats(prev => [...prev, { id: fid, x: cx, y: cy - 20 }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== fid)), 1000);

    setCombo(c => {
      const next = c + 1;
      if (next === 10) { spawnParticles(20, ["#FFD700", "#FFA500"]); setScreenFlash("gold"); setTimeout(() => setScreenFlash(""), 300); }
      else if (next === 50) { spawnParticles(40, ["#FF69B4", "#FF1493", "#FFD700"]); setScreenFlash("hotpink"); setTimeout(() => setScreenFlash(""), 400); }
      else if (next === 100) { spawnParticles(60, ["#FFD700", "#FFF", "#FF4500", "#FF69B4"]); setScreenFlash("white"); setTimeout(() => setScreenFlash(""), 500); }
      return next;
    });

    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(0), 1500);
  }, [playSound, spawnParticles]);

  const switchSkin = (idx: number) => {
    setSkinIdx(idx);
    localStorage.setItem("wf_skin", SKINS[idx].id);
    if (userId) fetch("/api/skin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, skin: SKINS[idx].id }) }).catch(() => {});
    setShowSkins(false);
  };

  const loadLeaderboard = () => {
    setShowRank(true);
    // sync current merit first
    if (userId) fetch("/api/merit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, merit }) }).catch(() => {});
    fetch("/api/leaderboard").then(r => r.json()).then(setLeaderboard).catch(() => {});
  };

  const saveName = () => {
    const n = nameInput.trim() || "匿名";
    setUserName(n);
    localStorage.setItem("wf_name", n);
    if (userId) fetch("/api/user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, name: n }) }).catch(() => {});
    setShowNameInput(false);
  };

  const handleShare = async () => {
    const text = `我在敲木鱼中已积攒 ${merit} 功德！来挑战我吧！`;
    if (navigator.share) {
      try { await navigator.share({ title: "敲木鱼", text, url: window.location.href }); } catch {}
    } else {
      await navigator.clipboard?.writeText(text + " " + window.location.href);
      alert("已复制分享内容到剪贴板！");
    }
  };

  const comboLevel = combo >= 100 ? 3 : combo >= 50 ? 2 : combo >= 10 ? 1 : 0;
  const isZen = skin.id === "zen";

  return (
    <div style={{ background: skin.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", userSelect: "none", touchAction: "manipulation" }}>
      {/* Screen flash */}
      {screenFlash && <div style={{ position: "fixed", inset: 0, background: screenFlash, opacity: 0.3, pointerEvents: "none", zIndex: 100, transition: "opacity 0.3s" }} />}

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: "50%", background: p.color, opacity: p.life, pointerEvents: "none", zIndex: 50 }} />
      ))}

      {/* Top bar */}
      <div style={{ position: "absolute", top: 16, left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 20px", zIndex: 10 }}>
        <button onClick={() => setShowNameInput(true)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: isZen ? "#333" : "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 14, cursor: "pointer", backdropFilter: "blur(10px)" }}>
          {userName || "设置昵称"}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowSkins(true)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: isZen ? "#333" : "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 14, cursor: "pointer", backdropFilter: "blur(10px)" }}>🎨 皮肤</button>
          <button onClick={loadLeaderboard} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: isZen ? "#333" : "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 14, cursor: "pointer", backdropFilter: "blur(10px)" }}>🏆 排行</button>
          <button onClick={handleShare} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: isZen ? "#333" : "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 14, cursor: "pointer", backdropFilter: "blur(10px)" }}>📤 分享</button>
        </div>
      </div>

      {/* Combo indicator */}
      {combo > 1 && (
        <div style={{ position: "absolute", top: 70, color: comboLevel >= 3 ? "#FFD700" : comboLevel >= 2 ? "#FF69B4" : comboLevel >= 1 ? "#FFA500" : (isZen ? "#666" : "#aaa"), fontSize: comboLevel >= 2 ? 28 : 22, fontWeight: "bold", textShadow: comboLevel >= 1 ? `0 0 20px ${skin.glow}` : "none", zIndex: 10, transition: "all 0.2s" }}>
          {combo} 连击！{comboLevel >= 3 ? " 🌟✨🔥" : comboLevel >= 2 ? " 🪷" : comboLevel >= 1 ? " ✨" : ""}
        </div>
      )}

      {/* Wooden fish */}
      <div
        onMouseDown={handleTap}
        onTouchStart={handleTap}
        style={{ position: "relative", width: 200, height: 200, cursor: "pointer", transform: pressed ? "scale(0.9)" : "scale(1)", transition: "transform 0.1s ease-out", zIndex: 5 }}
        role="button"
        aria-label="敲木鱼"
      >
        {/* Glow ring */}
        {comboLevel >= 1 && (
          <div style={{ position: "absolute", inset: -20, borderRadius: "50%", border: `3px solid ${skin.glow}`, opacity: 0.6, boxShadow: `0 0 ${comboLevel * 15}px ${skin.glow}, inset 0 0 ${comboLevel * 10}px ${skin.glow}`, animation: "spin 3s linear infinite" }} />
        )}
        {/* Fish body */}
        <svg viewBox="0 0 200 200" width="200" height="200">
          <defs>
            <radialGradient id="fishGrad" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor={skin.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={skin.color} />
            </radialGradient>
          </defs>
          <ellipse cx="100" cy="100" rx="80" ry="75" fill="url(#fishGrad)" stroke={skin.glow} strokeWidth="2" strokeOpacity="0.3" />
          <ellipse cx="100" cy="85" rx="55" ry="35" fill="none" stroke={isZen ? "#5a7a3a" : "rgba(255,255,255,0.15)"} strokeWidth="2" />
          <circle cx="80" cy="80" r="6" fill={isZen ? "#333" : "rgba(255,255,255,0.4)"} />
          <circle cx="120" cy="80" r="6" fill={isZen ? "#333" : "rgba(255,255,255,0.4)"} />
          <path d="M 70 110 Q 100 135 130 110" fill="none" stroke={isZen ? "#333" : "rgba(255,255,255,0.3)"} strokeWidth="2" />
          <text x="100" y="155" textAnchor="middle" fill={isZen ? "#333" : "rgba(255,255,255,0.5)"} fontSize="16" fontWeight="bold">木鱼</text>
        </svg>

        {/* Float texts */}
        {floats.map(f => (
          <div key={f.id} style={{ position: "absolute", left: f.x, top: f.y, color: skin.glow, fontSize: 20, fontWeight: "bold", pointerEvents: "none", animation: "floatUp 1s ease-out forwards", textShadow: `0 0 10px ${skin.glow}`, whiteSpace: "nowrap" }}>
            功德+1
          </div>
        ))}
      </div>

      {/* Merit display */}
      <div style={{ marginTop: 30, textAlign: "center", zIndex: 5 }}>
        <div style={{ color: isZen ? "#666" : "rgba(255,255,255,0.6)", fontSize: 16, marginBottom: 4 }}>功德</div>
        <div style={{ color: skin.glow, fontSize: 48, fontWeight: "bold", textShadow: `0 0 20px ${skin.glow}40` }}>
          {merit.toLocaleString()}
        </div>
      </div>

      {/* Skin panel */}
      {showSkins && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowSkins(false)}>
          <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 24, width: 300, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", margin: "0 0 16px", textAlign: "center" }}>选择皮肤</h3>
            {SKINS.map((s, i) => (
              <button key={s.id} onClick={() => switchSkin(i)} style={{ display: "block", width: "100%", padding: "12px 16px", marginBottom: 8, background: i === skinIdx ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", border: i === skinIdx ? `2px solid ${s.glow}` : "2px solid transparent", borderRadius: 10, color: "#fff", fontSize: 16, cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", background: s.color, marginRight: 10, verticalAlign: "middle" }} />
                {s.label} {i === skinIdx && "✓"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {showRank && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowRank(false)}>
          <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 24, width: 340, maxWidth: "90vw", maxHeight: "70vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#FFD700", margin: "0 0 16px", textAlign: "center" }}>🏆 功德排行榜</h3>
            {leaderboard.length === 0 ? (
              <p style={{ color: "#aaa", textAlign: "center" }}>暂无数据</p>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", padding: "10px 12px", marginBottom: 4, background: entry.id === userId ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                  <span style={{ width: 30, fontSize: i < 3 ? 22 : 16, textAlign: "center" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <span style={{ flex: 1, color: "#fff", fontSize: 15, marginLeft: 8 }}>{entry.name}</span>
                  <span style={{ color: "#FFD700", fontSize: 15, fontWeight: "bold" }}>{parseInt(entry.merit, 10).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Name input */}
      {showNameInput && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowNameInput(false)}>
          <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 24, width: 300 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", margin: "0 0 16px", textAlign: "center" }}>设置昵称</h3>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="输入昵称" maxLength={12} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #444", background: "#2a2a3e", color: "#fff", fontSize: 16, boxSizing: "border-box", outline: "none" }} onKeyDown={e => e.key === "Enter" && saveName()} />
            <button onClick={saveName} style={{ width: "100%", marginTop: 12, padding: "10px", background: "#FFD700", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold", cursor: "pointer" }}>确定</button>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-80px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
