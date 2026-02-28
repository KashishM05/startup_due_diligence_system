const API_BASE_URL = window.location.origin === "http://localhost:5173"
    ? "http://localhost:8000" // For local dev server
    : window.location.origin;

export const api = {
    health: async () => {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (!res.ok) throw new Error("API Offline");
        return res.json();
    },

    extractProfile: async (pitchDeck, financials, founderProfile) => {
        const fd = new FormData();
        fd.append("pitch_deck", pitchDeck);
        fd.append("financials", financials);
        fd.append("founder_profile", founderProfile);

        const res = await fetch(`${API_BASE_URL}/extract-profile`, {
            method: "POST",
            body: fd,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },

    analyze: async (pitchDeck, financials, founderProfile, portfolioConfig) => {
        const fd = new FormData();
        fd.append("pitch_deck", pitchDeck);
        fd.append("financials", financials);
        fd.append("founder_profile", founderProfile);
        fd.append("portfolio", JSON.stringify(portfolioConfig));

        const res = await fetch(`${API_BASE_URL}/analyze`, {
            method: "POST",
            body: fd,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },
};
