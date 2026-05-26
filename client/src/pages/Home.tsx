import { useLocation } from "wouter";
import { useScores } from "@/hooks/use-scores";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { data: scores } = useScores();

  const attempts = scores?.length || 0;
  const bestScore = scores?.reduce((max, s) => Math.max(max, s.score), 0) || 0;
  
  // Fake rank or if leaderboard existed we'd use it
  const rank = attempts > 0 ? "#1" : "-";
  
  // Last score for the accuracy meter
  const lastScore = scores && scores.length > 0 ? scores[scores.length - 1].score : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,600;1,9..40,300&display=swap');

        .home-root * { box-sizing: border-box; margin: 0; padding: 0; }

        .home-root {
          min-height: 100vh;
          background: #080c0a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          margin: 0;
          padding: 0;
        }

        .home-screen {
          width: 360px;
          min-height: 640px;
          background: #080c0a;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 24px 40px;
        }

        /* Grid background */
        .home-screen::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 255, 140, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 140, 0.04) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        /* Radial glow center */
        .home-screen::after {
          content: '';
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(0, 230, 118, 0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Top badge ── */
        .home-badge {
          margin-top: 40px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: #00e676;
          text-transform: uppercase;
          border: 1px solid rgba(0, 230, 118, 0.3);
          padding: 5px 14px;
          border-radius: 100px;
          background: rgba(0, 230, 118, 0.06);
          z-index: 1;
        }

        /* ── Canvas preview ── */
        .preview-wrap {
          margin-top: 28px;
          z-index: 1;
          position: relative;
        }

        .preview-canvas {
          width: 90px;
          height: 90px;
          border: 1.5px solid rgba(0, 230, 118, 0.5);
          background: transparent;
          position: relative;
        }

        /* Animated corner dots */
        .corner {
          position: absolute;
          width: 7px;
          height: 7px;
          background: #00e676;
          border-radius: 50%;
          animation: pulse-corner 2s ease-in-out infinite;
        }
        .corner.tl { top: -3.5px; left: -3.5px; }
        .corner.tr { top: -3.5px; right: -3.5px; animation-delay: 0.5s; }
        .corner.br { bottom: -3.5px; right: -3.5px; animation-delay: 1s; }
        .corner.bl { bottom: -3.5px; left: -3.5px; animation-delay: 1.5s; }

        .preview-canvas svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        @keyframes pulse-corner {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        /* Score row */
        .score-row {
          margin-top: 20px;
          display: flex;
          gap: 20px;
          z-index: 1;
        }
        .score-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .score-chip .val {
          font-family: 'Space Mono', monospace;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }
        .score-chip .lbl {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .divider-v {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          align-self: center;
        }

        /* ── Title area ── */
        .title-area {
          margin-top: 28px;
          text-align: center;
          z-index: 1;
        }

        .title-area h1 {
          font-family: 'DM Sans', sans-serif;
          font-size: 32px;
          font-weight: 300;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        .title-area h1 span {
          font-weight: 600;
          color: #00e676;
          display: block;
          font-size: 38px;
        }

        .subtitle {
          margin-top: 12px;
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          font-weight: 300;
          line-height: 1.6;
          max-width: 260px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ── Accuracy meter ── */
        .meter-wrap {
          margin-top: 28px;
          width: 100%;
          z-index: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 14px 18px;
        }

        .meter-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .meter-label span {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .meter-label strong {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: #00e676;
        }

        .meter-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 100px;
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          background: linear-gradient(90deg, #00c853, #00e676);
          border-radius: 100px;
          position: relative;
          animation: shimmer 2.5s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* ── CTA button ── */
        .cta-btn {
          margin-top: 28px;
          width: 100%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px;
          background: #00e676;
          color: #080c0a;
          border: none;
          border-radius: 12px;
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
        }

        .cta-btn:hover { background: #69f0ae; transform: translateY(-1px); }
        .cta-btn:active { transform: scale(0.97); }

        .play-icon {
          width: 0;
          height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 10px solid #080c0a;
        }


      `}</style>

      <div className="home-root">
        <div className="home-screen">

          <div className="home-badge">Precision Challenge</div>

          <div className="preview-wrap">
            <div className="preview-canvas">
              <div className="corner tl"></div>
              <div className="corner tr"></div>
              <div className="corner br"></div>
              <div className="corner bl"></div>
              <svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="45" y1="0" x2="45" y2="90" stroke="rgba(0,230,118,0.12)" strokeWidth="0.5"/>
                <line x1="0" y1="45" x2="90" y2="45" stroke="rgba(0,230,118,0.12)" strokeWidth="0.5"/>
                <line x1="0" y1="0" x2="90" y2="90" stroke="rgba(0,230,118,0.08)" strokeWidth="0.5"/>
                <line x1="90" y1="0" x2="0" y2="90" stroke="rgba(0,230,118,0.08)" strokeWidth="0.5"/>
              </svg>
            </div>
          </div>

          <div className="score-row">
            <div className="score-chip">
              <span className="val">{attempts}</span>
              <span className="lbl">Attempts</span>
            </div>
            <div className="divider-v"></div>
            <div className="score-chip">
              <span className="val">{bestScore}%</span>
              <span className="lbl">Best</span>
            </div>
            <div className="divider-v"></div>
            <div className="score-chip">
              <span className="val">{rank}</span>
              <span className="lbl">Rank</span>
            </div>
          </div>

          <div className="title-area">
            <h1>
              Draw the
              <span>Perfect Square</span>
            </h1>
            <p className="subtitle">Test your geometric precision. No tools. No rulers. Just your finger.</p>
          </div>

          {attempts > 0 && (
            <div className="meter-wrap">
              <div className="meter-label">
                <span>Last Score</span>
                <strong>{lastScore}%</strong>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${lastScore}%` }}></div>
              </div>
            </div>
          )}

          <button className="cta-btn" onClick={() => setLocation("/game")}>
            <div className="play-icon"></div>
            Start Drawing
          </button>



        </div>
      </div>
    </>
  );
}
