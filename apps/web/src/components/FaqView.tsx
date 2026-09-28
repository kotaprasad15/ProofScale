import React, { useState } from "react";
import { HomeNavbar } from "./HomeView";
import { MinimalFooter } from "./home/MinimalFooter";
import { SceneBackground } from "./home/SceneBackground";
import { ThemeProvider } from "./home/ThemeContext";
import { ChevronDown, ArrowRight } from "lucide-react";

interface FaqViewProps {
  onSignIn: () => void;
  onSignUp: () => void;
  isLoggedIn?: boolean;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  userEmail?: string;
  onGoHome: () => void;
  onNavigate: (path: string) => void;
}

const FAQS = [
  {
    id: "q1",
    question: "What is ProofScale?",
    answer: "ProofScale is a readiness and safety platform designed to help engineering teams run controlled, authorized performance assessments. It converts observed application behavior into evidence-backed reports that can be shared and defended responsibly."
  },
  {
    id: "q2",
    question: "Who is ProofScale designed for?",
    answer: "ProofScale is built for engineering teams, QA professionals, and stakeholders who need to validate application capacity and reliability. It provides a structured, defensive approach to load testing without requiring deep performance engineering expertise."
  },
  {
    id: "q3",
    question: "What does a ProofScale readiness score mean?",
    answer: "The readiness score (0-100) is a deterministic metric based on observed reliability, latency, capacity behavior, stability, and hygiene during a test run. It is not an unconditional guarantee of performance, but rather an empirical measurement of behavior under a specifically declared test envelope."
  },
  {
    id: "q4",
    question: "What is a test envelope?",
    answer: "A test envelope defines the strict boundaries and parameters of an assessment. It includes the target endpoint, virtual users (VUs), duration, ramp behavior, request mix, and safety caps. Results are always conditional on this envelope."
  },
  {
    id: "q5",
    question: "What are VUs, duration, ramp behavior, and RPS?",
    answer: "VUs (Virtual Users) are concurrent agents executing requests. Duration is the total length of the test. Ramp behavior describes how VUs are introduced over time. RPS (Requests Per Second) measures the throughput of successfully processed requests."
  },
  {
    id: "q6",
    question: "Can I run assessments against a production environment?",
    answer: "Yes, but production testing requires explicit authorization and additional safety considerations. ProofScale enforces safety guardrails and recommends starting with a conservative staging environment before applying aggressive load to production."
  },
  {
    id: "q7",
    question: "What is the difference between an organization owner, project owner, and tester?",
    answer: "Organization Owners manage members, global guardrails, and projects. Project Owners define targets, construct test plans, and manage project details. Testers can execute approved plans and view reports, but cannot bypass safety settings or modify targets."
  },
  {
    id: "q8",
    question: "How should I interpret p95 latency and throughput?",
    answer: "p95 latency indicates the time within which 95% of your requests completed, highlighting outlier slowdowns. Throughput (RPS) shows the sheer volume of successful requests your application handled. Together, they demonstrate capacity behavior under stress."
  },
  {
    id: "q9",
    question: "Why might two assessments produce different scores?",
    answer: "Scores differ if the test envelope changes—such as altering the workload, request mix, or thresholds—or if the target environment's performance degrades. Valid comparisons require identical test plans and execution parameters."
  },
  {
    id: "q10",
    question: "How does ProofScale help keep assessments safe and authorized?",
    answer: "ProofScale mandates domain ownership verification, bounded workload caps, role-based access controls, and adherence to predefined test plans. A built-in kill switch and hard safety caps prevent runaway concurrency and protect infrastructure."
  }
];

export function FaqView(props: FaqViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <ThemeProvider>
      <div className="bg-[var(--color-bg)] min-h-screen text-text-primary relative overflow-x-hidden transition-colors duration-300">
        <SceneBackground />
        
        <HomeNavbar {...props} />

        <main className="relative z-10 max-w-4xl mx-auto px-6 sm:px-12 pt-32 pb-24 space-y-16">
          
          <header className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black font-raleway tracking-tight text-text-primary">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-text-muted leading-relaxed max-w-2xl mx-auto">
              Clear, technically accurate answers about ProofScale’s testing methodology, scoring system, and safety principles.
            </p>
          </header>

          <div className="space-y-4">
            {FAQS.map((faq) => {
              const isOpen = openId === faq.id;
              
              return (
                <div 
                  key={faq.id} 
                  className="glass-panel overflow-hidden transition-all duration-300 rounded-xl"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${faq.id}`}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-indigo"
                  >
                    <span className="font-bold font-raleway text-lg text-text-primary">
                      {faq.question}
                    </span>
                    <ChevronDown 
                      className={`w-5 h-5 text-signal-indigo transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} 
                    />
                  </button>
                  
                  <div 
                    id={`faq-answer-${faq.id}`}
                    role="region"
                    aria-hidden={!isOpen}
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6 pt-2 text-text-muted text-sm leading-relaxed border-t border-white/[0.04]">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-12 border-t border-white/[0.08] flex flex-col items-center justify-center text-center space-y-6">
            <h2 className="text-2xl font-bold font-raleway text-text-primary">Ready to start testing?</h2>
            <p className="text-text-muted text-sm">Review the full documentation or jump into your workspace.</p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={() => props.onNavigate("/docs")}
                className="btn-glass-secondary py-3 px-6 cursor-pointer flex items-center justify-center gap-2"
              >
                Read Documentation
              </button>
              {props.isLoggedIn ? (
                <button
                  onClick={props.onGoToDashboard}
                  className="btn-solid-primary py-3 px-6 cursor-pointer flex items-center justify-center gap-2"
                >
                  Open Workspace <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={props.onSignUp}
                  className="btn-solid-primary py-3 px-6 cursor-pointer flex items-center justify-center gap-2"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </main>

        <MinimalFooter onSignIn={props.onSignIn} />
      </div>
    </ThemeProvider>
  );
}
