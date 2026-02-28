import React, { useState, useEffect } from "react";
import {
    Eye, PlayCircle, Clock, CheckCircle, FileText, Users,
    AlertTriangle, RefreshCw
} from "lucide-react";
import { Header } from "./EntrepreneurDashboard";
import Step4_Results from "./Step4_Results";
import { api } from "../api";

export default function InvestorDashboard({ user, apiOnline, onLogout }) {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(null); // app_id being analyzed
    const [viewingResult, setViewingResult] = useState(null); // full result object
    const [error, setError] = useState("");

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const apps = await api.getInvestorApplications(user._id);
            setApplications(apps);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchApplications(); }, [user._id]);

    const handleAnalyze = async (appId) => {
        setAnalyzing(appId);
        setError("");
        try {
            const result = await api.analyzeApplication(appId);
            setViewingResult(result);
            await fetchApplications(); // Refresh status
        } catch (err) {
            setError(err.message);
        } finally {
            setAnalyzing(null);
        }
    };

    const handleViewResult = (app) => {
        if (app.analysis_result) {
            setViewingResult(app.analysis_result);
        }
    };

    if (viewingResult) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
                <Header user={user} apiOnline={apiOnline} onLogout={onLogout} />
                <main className="container" style={{ flex: 1, padding: "2rem 2rem 4rem" }}>
                    <Step4_Results
                        result={viewingResult}
                        onReset={() => setViewingResult(null)}
                    />
                </main>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Header user={user} apiOnline={apiOnline} onLogout={onLogout} />

            <main className="container" style={{ flex: 1, padding: "2rem 2rem 4rem" }}>
                <div className="animate-fadeUp">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <div>
                            <h2 style={{ fontSize: "1.8rem", marginBottom: "0.3rem" }}>Startup Applications</h2>
                            <p style={{ color: "var(--warm-gray)" }}>
                                Review and assess startups that applied to you.
                            </p>
                        </div>
                        <button className="btn" onClick={fetchApplications} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                            <RefreshCw size={15} /> Refresh
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                        <StatCard label="Total" value={applications.length} icon={<Users size={18} />} bg="var(--bg-elevated)" />
                        <StatCard label="Pending" value={applications.filter(a => a.status === "pending").length}
                            icon={<Clock size={18} />} bg="var(--warning-bg)" />
                        <StatCard label="Analyzed" value={applications.filter(a => a.status === "analyzed").length}
                            icon={<CheckCircle size={18} />} bg="var(--success-bg)" />
                    </div>

                    {error && (
                        <div style={{
                            padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)",
                            background: "var(--danger-bg)", color: "var(--terracotta-dark)",
                            fontSize: "0.9rem", marginBottom: "1rem"
                        }}>{error}</div>
                    )}

                    {/* Analyzing overlay */}
                    {analyzing && (
                        <div className="card animate-scaleIn" style={{
                            textAlign: "center", padding: "3rem", marginBottom: "1.5rem",
                            background: "var(--bg-elevated)"
                        }}>
                            <div style={{
                                width: 80, height: 80, margin: "0 auto 1.5rem",
                                borderRadius: "50%", border: "4px solid var(--light-border)",
                                borderTopColor: "var(--terracotta)",
                                animation: "rotateGeo 1s linear infinite"
                            }} />
                            <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Running AI Analysis</h3>
                            <p style={{ color: "var(--warm-gray)" }}>
                                Extracting profiles, running simulations, and generating the investment memo…
                            </p>
                        </div>
                    )}

                    {/* Applications List */}
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "var(--warm-gray)" }}>Loading…</div>
                    ) : applications.length === 0 ? (
                        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
                            <FileText size={48} color="var(--light-border)" style={{ marginBottom: "1rem" }} />
                            <p style={{ color: "var(--warm-gray)", fontSize: "1.1rem" }}>No applications yet.</p>
                            <p style={{ color: "var(--warm-gray)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                                Entrepreneurs will appear here once they apply to you.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {applications.map(app => (
                                <div key={app._id} className="card" style={{ padding: "1.25rem 1.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                <div style={{
                                                    width: 38, height: 38, borderRadius: "50%",
                                                    background: "var(--bg-elevated)", display: "flex",
                                                    alignItems: "center", justifyContent: "center",
                                                    fontWeight: 700, fontSize: "0.9rem",
                                                    color: "var(--charcoal)"
                                                }}>
                                                    {app.company_name?.charAt(0) || "?"}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{app.company_name}</div>
                                                    <div style={{ fontSize: "0.8rem", color: "var(--warm-gray)" }}>
                                                        by {app.entrepreneur_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                            <span className={`badge ${app.status === "analyzed" ? "badge--green" : "badge--yellow"}`}>
                                                {app.status === "analyzed" ? <><CheckCircle size={12} /> Analyzed</> : <><Clock size={12} /> Pending</>}
                                            </span>

                                            {app.status === "pending" ? (
                                                <button className="btn btn--accent" onClick={() => handleAnalyze(app._id)}
                                                    disabled={analyzing !== null}
                                                    style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
                                                    <PlayCircle size={15} /> Assess
                                                </button>
                                            ) : (
                                                <button className="btn" onClick={() => handleViewResult(app)}
                                                    style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
                                                    <Eye size={15} /> View Report
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, icon, bg }) {
    return (
        <div className="card" style={{
            padding: "1.25rem 1.5rem", display: "flex",
            alignItems: "center", gap: "1rem", background: bg
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)", display: "flex",
                alignItems: "center", justifyContent: "center",
                boxShadow: "var(--shadow-xs)"
            }}>{icon}</div>
            <div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--warm-gray)" }}>{label}</div>
            </div>
        </div>
    );
}
