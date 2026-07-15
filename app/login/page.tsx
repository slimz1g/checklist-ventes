"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LOGO_SRC } from "@/lib/logo";

// Mêmes tokens de couleur que le reste du Sales Hub (home page, outbound, priorités)
// pour que la page de login ne détonne pas visuellement avec le reste de l'app.
const COLORS = {
  bg: "#F3F4F8",
  card: "#FFFFFF",
  border: "#E5E7EB",
  navy: "#101828",
  navySoft: "#475467",
  orange: "#F26B21",
  orangeSoft: "#FFF1E8",
  red: "#B42318",
  redSoft: "#FEF0EF",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || searchParams.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    signIn("google", { callbackUrl: next });
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Mot de passe incorrect.");
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mot de passe incorrect.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        background: COLORS.bg,
        padding: "24px",
      }}
    >
      <style>{FONT_IMPORT}</style>

      <div
        style={{
          background: COLORS.card,
          padding: "40px 36px 36px",
          borderRadius: "16px",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 4px 20px rgba(16,24,40,0.08)",
          width: "100%",
          maxWidth: "380px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <img src={LOGO_SRC} alt="LeadFox" style={{ height: 40 }} />
        </div>

        <h1
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: COLORS.navy,
            textAlign: "center",
            margin: "0 0 6px",
          }}
        >
          Sales Hub
        </h1>
        <p
          style={{
            color: COLORS.navySoft,
            fontSize: "13px",
            margin: "0 0 28px",
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          Connecte-toi avec ton compte Google Leadfox, ou utilise le mot de
          passe de l'équipe.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "11px 12px",
            borderRadius: "9px",
            border: `1px solid ${COLORS.border}`,
            background: "#FFFFFF",
            color: COLORS.navy,
            fontSize: "14px",
            fontWeight: 600,
            cursor: googleLoading ? "default" : "pointer",
            opacity: googleLoading ? 0.6 : 1,
            marginBottom: "24px",
            boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            transition: "box-shadow 0.15s ease, border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!googleLoading) {
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(16,24,40,0.08)";
              e.currentTarget.style.borderColor = "#D0D5DD";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(16,24,40,0.04)";
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          <GoogleLogo />
          {googleLoading ? "Redirection..." : "Continuer avec Google"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: "0 0 24px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: COLORS.border }} />
          <span style={{ fontSize: "12px", color: COLORS.navySoft, fontWeight: 600 }}>ou</span>
          <div style={{ flex: 1, height: "1px", background: COLORS.border }} />
        </div>

        <form onSubmit={handlePasswordSubmit}>
          <label
            style={{
              display: "block",
              fontSize: "12.5px",
              fontWeight: 600,
              color: COLORS.navySoft,
              marginBottom: "6px",
            }}
          >
            Mot de passe de l'équipe
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "9px",
              border: `1px solid ${COLORS.border}`,
              marginBottom: "12px",
              fontSize: "14px",
              fontFamily: "'Inter', sans-serif",
              color: COLORS.navy,
              boxSizing: "border-box",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                background: COLORS.redSoft,
                color: COLORS.red,
                fontSize: "13px",
                fontWeight: 500,
                borderRadius: "8px",
                padding: "8px 12px",
                marginBottom: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password.length === 0}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "9px",
              border: "none",
              background: COLORS.orange,
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading || password.length === 0 ? "default" : "pointer",
              opacity: loading || password.length === 0 ? 0.5 : 1,
              boxShadow: "0 1px 3px rgba(242,107,33,0.3)",
              transition: "opacity 0.15s ease",
            }}
          >
            {loading ? "Connexion..." : "Entrer"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
