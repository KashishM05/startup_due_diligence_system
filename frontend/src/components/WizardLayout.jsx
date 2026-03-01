import React from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";

const steps = ["Upload", "Configure", "Analyze", "Results"];

export default function WizardLayout({ currentStep, apiOnline, children }) {
    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <header style={{
                padding: "1.25rem 0",
                background: "rgba(250, 247, 242, 0.85)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid var(--light-border)",
                position: "sticky", top: 0, zIndex: 50
            }}>
                <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {/* Logo */}
                        <img src="/cynt-logo.png" alt="Cynt" style={{
                            width: 40, height: 40, borderRadius: "var(--radius-sm)",
                            boxShadow: "var(--shadow-sm)", objectFit: "contain"
                        }} />
                        <div>
                            <h1 style={{ fontSize: "1.15rem", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                                Cynt
                            </h1>
                            <span style={{
                                fontSize: "0.65rem", fontWeight: 600,
                                textTransform: "uppercase", letterSpacing: "0.12em",
                                color: "var(--warm-gray)"
                            }}>AI Engine</span>
                        </div>
                    </div>

                    {/* API Status Pill */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.35rem 0.85rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.78rem", fontWeight: 600,
                        background: apiOnline ? "var(--success-bg)" : "var(--danger-bg)",
                        color: apiOnline ? "var(--olive-dark)" : "var(--terracotta-dark)",
                        border: `1px solid ${apiOnline ? "var(--olive-light)" : "var(--terracotta-light)"}`
                    }}>
                        {apiOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                        {apiOnline ? "Connected" : "Offline"}
                    </div>
                </div>
            </header>

            {/* Step Progress */}
            <nav className="container" style={{ padding: "2rem 2rem 0" }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    maxWidth: "600px", margin: "0 auto"
                }}>
                    {steps.map((label, i) => {
                        const stepNum = i + 1;
                        const isActive = stepNum === currentStep;
                        const isDone = stepNum < currentStep;

                        return (
                            <React.Fragment key={label}>
                                <div style={{
                                    display: "flex", flexDirection: "column",
                                    alignItems: "center", gap: "0.4rem",
                                    transition: "all 0.3s ease"
                                }}>
                                    {/* Step Circle */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: "50%",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.8rem", fontWeight: 700,
                                        background: isActive ? "var(--charcoal)" : isDone ? "var(--terracotta)" : "var(--bg-elevated)",
                                        color: isActive || isDone ? "#fff" : "var(--warm-gray)",
                                        border: isActive ? "none" : isDone ? "none" : "2px solid var(--medium-border)",
                                        transition: "all 0.4s var(--ease-spring)",
                                        transform: isActive ? "scale(1.1)" : "scale(1)",
                                        boxShadow: isActive ? "0 4px 12px rgba(43,43,43,0.15)" : "none"
                                    }}>
                                        {isDone ? "✓" : stepNum}
                                    </div>
                                    <span style={{
                                        fontSize: "0.7rem", fontWeight: isActive ? 700 : 500,
                                        color: isActive ? "var(--charcoal)" : "var(--warm-gray)",
                                        textTransform: "uppercase", letterSpacing: "0.06em",
                                        transition: "all 0.3s ease"
                                    }}>{label}</span>
                                </div>

                                {/* Connector Line */}
                                {i < steps.length - 1 && (
                                    <div style={{
                                        flex: 1, height: 2, margin: "0 0.5rem",
                                        marginBottom: "1.2rem",
                                        borderRadius: 1,
                                        background: isDone
                                            ? "linear-gradient(90deg, var(--terracotta), var(--gold))"
                                            : "var(--light-border)",
                                        transition: "background 0.6s ease"
                                    }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </nav>

            {/* Content */}
            <main className="container" style={{ flex: 1, padding: "2rem 2rem 4rem" }}>
                {children}
            </main>

            {/* Footer */}
            <footer style={{
                padding: "1.5rem 0",
                borderTop: "1px solid var(--light-border)",
                textAlign: "center", fontSize: "0.75rem",
                color: "var(--warm-gray)", fontWeight: 500,
                background: "rgba(250, 247, 242, 0.6)"
            }}>
                Built with AI-Powered Analysis Engine &middot; Cynt Platform
            </footer>
        </div>
    );
}
