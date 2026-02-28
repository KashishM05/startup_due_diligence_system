import React, { useState, useEffect } from "react";
import WizardLayout from "./components/WizardLayout";
import Step1_Upload from "./components/Step1_Upload";
import Step2_Config from "./components/Step2_Config";
import Step3_Analyzing from "./components/Step3_Analyzing";
import Step4_Results from "./components/Step4_Results";
import { api } from "./api";

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [apiOnline, setApiOnline] = useState(false);

  const [files, setFiles] = useState({
    pitchDeck: null,
    financials: null,
    founderProfile: null
  });

  const [portfolioConfig, setPortfolioConfig] = useState({
    investor_type: "EARLY_VC",
    portfolio_sectors: ["fintech", "saas", "healthtech", "edtech"],
    portfolio_stages: ["seed", "Series A"],
    portfolio_geographies: ["US", "Europe"],
    check_size_range_usd: [250000, 2000000],
    total_investments: 12,
    target_max_sector_concentration_pct: 30.0
  });

  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.health()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);
  const resetAll = () => {
    setFiles({ pitchDeck: null, financials: null, founderProfile: null });
    setAnalysisResult(null);
    setError(null);
    setCurrentStep(1);
  };

  const handleRunAnalysis = async () => {
    setCurrentStep(3);
    setError(null);
    try {
      const result = await api.analyze(
        files.pitchDeck,
        files.financials,
        files.founderProfile,
        portfolioConfig
      );
      setAnalysisResult(result);
      setCurrentStep(4);
    } catch (err) {
      setError(err.message);
      setCurrentStep(2); // Go back on error
    }
  };

  return (
    <WizardLayout currentStep={currentStep} apiOnline={apiOnline}>
      {currentStep === 1 && (
        <Step1_Upload
          files={files}
          setFiles={setFiles}
          onNext={handleNext}
        />
      )}
      {currentStep === 2 && (
        <Step2_Config
          config={portfolioConfig}
          setConfig={setPortfolioConfig}
          onBack={handleBack}
          onRun={handleRunAnalysis}
          error={error}
        />
      )}
      {currentStep === 3 && (
        <Step3_Analyzing />
      )}
      {currentStep === 4 && analysisResult && (
        <Step4_Results
          result={analysisResult}
          onReset={resetAll}
        />
      )}
    </WizardLayout>
  );
}

export default App;
