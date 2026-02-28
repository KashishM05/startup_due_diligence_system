import React, { useState } from "react";
import { Activity, LogIn, UserPlus, Mail, Lock, User, Briefcase, ChevronRight } from "lucide-react";
import { api } from "../api";

export default function LoginPage({ onLogin, apiOnline }) {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [role, setRole] = useState("entrepreneur");
    const [form, setForm] = useState({ email: "", password: "", name: "" });
    const [investorFields, setInvestorFields] = useState({
        investor_type: "EARLY_VC",
        sectors: "fintech, saas",
        stages: "seed, Series A",
        geographies: "India, US",
        check_size_min: 100000,
        check_size_max: 1000000,
        total_investments: 0,
        max_sector_concentration_pct: 30,
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "login") {
                const user = await api.login(form.email, form.password);
                onLogin(user);
            } else {
                const data = {
                    email: form.email,
                    password: form.password,
                    name: form.name,
                    role,
                };
                if (role === "investor") {
                    data.investor_type = investorFields.investor_type;
                    data.sectors = investorFields.sectors.split(",").map(s => s.trim()).filter(Boolean);
                    data.stages = investorFields.stages.split(",").map(s => s.trim()).filter(Boolean);
                    data.geographies = investorFields.geographies.split(",").map(s => s.trim()).filter(Boolean);
                    data.check_size_range_usd = [Number(investorFields.check_size_min), Number(investorFields.check_size_max)];
                    data.total_investments = Number(investorFields.total_investments);
                    data.max_sector_concentration_pct = Number(investorFields.max_sector_concentration_pct);
                }
                const user = await api.register(data);
                onLogin(user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--bg-canvas)",
            backgroundImage: "radial-gradient(circle, var(--light-border) 1px, transparent 1px)",
            backgroundSize: "24px 24px"
        }}>
            <div className="animate-fadeUp" style={{ width: "100%", maxWidth: 480, padding: "2rem" }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: "var(--radius-md)",
                        background: "var(--charcoal)", display: "inline-flex",
                        alignItems: "center", justifyContent: "center",
                        boxShadow: "var(--shadow-md)", marginBottom: "1rem"
                    }}>
                        <Activity size={28} color="#FAF7F2" />
                    </div>
                    <h1 style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>Due Diligence Engine</h1>
                    <p style={{ color: "var(--warm-gray)", fontSize: "0.9rem" }}>AI-Powered Investment Evaluation</p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: "2rem" }}>
                    {/* Tab Toggle */}
                    <div style={{
                        display: "flex", background: "var(--bg-elevated)",
                        borderRadius: "var(--radius-full)", padding: "4px",
                        marginBottom: "1.75rem"
                    }}>
                        {["login", "register"].map((m) => (
                            <button key={m} onClick={() => { setMode(m); setError(""); }}
                                style={{
                                    flex: 1, padding: "0.55rem", border: "none",
                                    borderRadius: "var(--radius-full)", cursor: "pointer",
                                    fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 600,
                                    background: mode === m ? "var(--bg-card)" : "transparent",
                                    color: mode === m ? "var(--charcoal)" : "var(--warm-gray)",
                                    boxShadow: mode === m ? "var(--shadow-sm)" : "none",
                                    transition: "all 0.2s ease",
                                    textTransform: "capitalize"
                                }}>
                                {m === "login" ? <><LogIn size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Sign In</> : <><UserPlus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />Register</>}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Role Selector (register only) */}
                        {mode === "register" && (
                            <div style={{ marginBottom: "1.25rem" }}>
                                <label>I am a</label>
                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                    {["entrepreneur", "investor"].map((r) => (
                                        <button key={r} type="button" onClick={() => setRole(r)}
                                            style={{
                                                flex: 1, padding: "0.65rem",
                                                border: `2px solid ${role === r ? "var(--terracotta)" : "var(--light-border)"}`,
                                                borderRadius: "var(--radius-sm)",
                                                background: role === r ? "var(--terracotta-light)" : "var(--bg-card)",
                                                color: role === r ? "var(--terracotta-dark)" : "var(--warm-gray)",
                                                cursor: "pointer", fontFamily: "var(--font-body)",
                                                fontSize: "0.9rem", fontWeight: 600,
                                                transition: "all 0.2s ease",
                                                textTransform: "capitalize", display: "flex",
                                                alignItems: "center", justifyContent: "center", gap: "0.4rem"
                                            }}>
                                            {r === "entrepreneur" ? <Briefcase size={16} /> : <User size={16} />}
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mode === "register" && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label>Full Name</label>
                                <input type="text" placeholder="John Doe"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: "1rem" }}>
                            <label>Email</label>
                            <input type="email" placeholder="you@company.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: "1.25rem" }}>
                            <label>Password</label>
                            <input type="password" placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>

                        {/* Investor-specific fields */}
                        {mode === "register" && role === "investor" && (
                            <div style={{
                                padding: "1.25rem", background: "var(--bg-elevated)",
                                borderRadius: "var(--radius-sm)", marginBottom: "1.25rem",
                                border: "1px solid var(--light-border)"
                            }}>
                                <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--terracotta)", marginBottom: "1rem" }}>
                                    Investor Profile
                                </p>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <div>
                                        <label>Investor Type</label>
                                        <select value={investorFields.investor_type}
                                            onChange={(e) => setInvestorFields({ ...investorFields, investor_type: e.target.value })}>
                                            <option value="ANGEL">Angel</option>
                                            <option value="EARLY_VC">Early VC</option>
                                            <option value="ACCELERATOR">Accelerator</option>
                                            <option value="COMMITTEE">Committee</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Total Investments</label>
                                        <input type="number" min="0"
                                            value={investorFields.total_investments}
                                            onChange={(e) => setInvestorFields({ ...investorFields, total_investments: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ gridColumn: "span 2" }}>
                                        <label>Sectors (comma-separated)</label>
                                        <input type="text" value={investorFields.sectors}
                                            onChange={(e) => setInvestorFields({ ...investorFields, sectors: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label>Stages</label>
                                        <input type="text" value={investorFields.stages}
                                            onChange={(e) => setInvestorFields({ ...investorFields, stages: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label>Geographies</label>
                                        <input type="text" value={investorFields.geographies}
                                            onChange={(e) => setInvestorFields({ ...investorFields, geographies: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{
                                padding: "0.65rem 1rem", marginBottom: "1rem",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--danger-bg)", border: "1px solid var(--terracotta-light)",
                                color: "var(--terracotta-dark)", fontSize: "0.85rem"
                            }}>{error}</div>
                        )}

                        <button type="submit" className="btn btn--primary"
                            disabled={loading}
                            style={{ width: "100%", padding: "0.8rem", fontSize: "0.95rem" }}>
                            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
                            {!loading && <ChevronRight size={18} />}
                        </button>
                    </form>
                </div>

                {/* API Status */}
                <div style={{
                    textAlign: "center", marginTop: "1.5rem",
                    fontSize: "0.75rem", color: "var(--warm-gray)"
                }}>
                    API Status:
                    <span style={{
                        marginLeft: "0.4rem", fontWeight: 700,
                        color: apiOnline ? "var(--olive)" : "var(--terracotta)"
                    }}>{apiOnline ? "● Connected" : "● Offline"}</span>
                </div>
            </div>
        </div>
    );
}
