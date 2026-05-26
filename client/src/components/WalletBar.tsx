import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { cbWalletConnector } from "@/lib/wagmi";

export function WalletBar({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <div ref={dropRef} style={{ position: "relative", display: "inline-block" }}>
      <style>{`
        .wbar-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: ${compact ? "7px 14px" : "10px 20px"};
          font-family: 'Fredoka One', 'Inter', sans-serif;
          font-size: ${compact ? "13px" : "15px"};
          font-weight: 600;
          letter-spacing: 0.5px;
          border-radius: 100px;
          border: 1.5px solid rgba(255,255,255,0.45);
          cursor: pointer;
          outline: none;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
        }

        /* ---- DISCONNECTED: 3D glass white ---- */
        .wbar-btn.disconnected {
          background: linear-gradient(145deg,
            rgba(255,255,255,0.85) 0%,
            rgba(220,230,245,0.75) 40%,
            rgba(190,210,240,0.6) 100%
          );
          box-shadow:
            0 2px 0 rgba(255,255,255,0.9) inset,
            0 -2px 0 rgba(180,200,230,0.6) inset,
            0 8px 32px rgba(100,140,220,0.25),
            0 2px 8px rgba(0,0,0,0.15),
            0 4px 0 rgba(160,190,230,0.5);
          color: #1a2a4a;
          text-shadow: 0 1px 0 rgba(255,255,255,0.9);
        }
        .wbar-btn.disconnected::before {
          content: '';
          position: absolute;
          top: 2px; left: 10%; right: 10%;
          height: 40%;
          background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%);
          border-radius: 100px;
          pointer-events: none;
        }
        .wbar-btn.disconnected:hover {
          transform: translateY(-2px);
          box-shadow:
            0 2px 0 rgba(255,255,255,0.9) inset,
            0 -2px 0 rgba(180,200,230,0.6) inset,
            0 14px 40px rgba(100,140,220,0.35),
            0 4px 12px rgba(0,0,0,0.18),
            0 6px 0 rgba(160,190,230,0.5);
        }
        .wbar-btn.disconnected:active {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.9) inset,
            0 -1px 0 rgba(180,200,230,0.6) inset,
            0 2px 8px rgba(100,140,220,0.2),
            0 1px 0 rgba(160,190,230,0.5);
        }

        /* ---- CONNECTED: 3D glass green ---- */
        .wbar-btn.connected {
          background: linear-gradient(145deg,
            rgba(52,211,153,0.95) 0%,
            rgba(16,185,129,0.9) 40%,
            rgba(5,150,105,0.85) 100%
          );
          box-shadow:
            0 2px 0 rgba(110,255,195,0.7) inset,
            0 -2px 0 rgba(4,100,70,0.5) inset,
            0 8px 32px rgba(16,185,129,0.4),
            0 2px 8px rgba(0,0,0,0.2),
            0 4px 0 rgba(4,120,80,0.6);
          border-color: rgba(110,255,195,0.4);
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,80,40,0.5);
        }
        .wbar-btn.connected::before {
          content: '';
          position: absolute;
          top: 2px; left: 10%; right: 10%;
          height: 40%;
          background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%);
          border-radius: 100px;
          pointer-events: none;
        }
        .wbar-btn.connected:hover {
          transform: translateY(-2px);
          box-shadow:
            0 2px 0 rgba(110,255,195,0.7) inset,
            0 -2px 0 rgba(4,100,70,0.5) inset,
            0 14px 40px rgba(16,185,129,0.5),
            0 4px 12px rgba(0,0,0,0.22),
            0 6px 0 rgba(4,120,80,0.6);
        }
        .wbar-btn.connected:active {
          transform: translateY(2px);
        }

        /* Green pulse dot */
        .wbar-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #86efac;
          box-shadow: 0 0 6px 2px rgba(134,239,172,0.7);
          animation: wbar-pulse 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes wbar-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }

        /* Dropdown */
        .wbar-drop {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 8px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          z-index: 999;
          animation: wbar-drop-in 0.15s ease;
        }
        @keyframes wbar-drop-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .wbar-addr {
          font-family: 'Inter', monospace;
          font-size: 11px;
          color: rgba(134,239,172,0.9);
          padding: 8px 12px 6px;
          letter-spacing: 0.5px;
        }
        .wbar-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin: 4px 0;
        }
        .wbar-action {
          display: block;
          width: 100%;
          padding: 9px 12px;
          text-align: left;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #ef4444;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .wbar-action:hover {
          background: rgba(239,68,68,0.12);
        }
      `}</style>

      {isConnected ? (
        <button
          className="wbar-btn connected"
          onClick={() => setOpen((v) => !v)}
          id="wallet-connected-btn"
        >
          <span className="wbar-dot" />
          {shortAddr}
        </button>
      ) : (
        <button
          className="wbar-btn disconnected"
          onClick={() => connect({ connector: cbWalletConnector })}
          id="wallet-connect-btn"
        >
          🔗 Connect Wallet
        </button>
      )}

      {open && isConnected && (
        <div className="wbar-drop">
          <div className="wbar-addr">{address}</div>
          <div className="wbar-divider" />
          <button
            className="wbar-action"
            onClick={() => { disconnect(); setOpen(false); }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
