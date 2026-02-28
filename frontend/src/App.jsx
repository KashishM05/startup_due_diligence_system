import React, { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import EntrepreneurDashboard from "./components/EntrepreneurDashboard";
import InvestorDashboard from "./components/InvestorDashboard";
import { api } from "./api";

function App() {
  const [user, setUser] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    api.health()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const handleLogout = () => setUser(null);

  if (!user) {
    return <LoginPage onLogin={setUser} apiOnline={apiOnline} />;
  }

  if (user.role === "entrepreneur") {
    return <EntrepreneurDashboard user={user} apiOnline={apiOnline} onLogout={handleLogout} />;
  }

  return <InvestorDashboard user={user} apiOnline={apiOnline} onLogout={handleLogout} />;
}

export default App;
