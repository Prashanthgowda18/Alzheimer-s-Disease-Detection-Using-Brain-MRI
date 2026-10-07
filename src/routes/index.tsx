import { createFileRoute, Link } from '@tanstack/react-router';
import { getActiveUser } from '../lib/auth';
import type { UserSession } from '../lib/auth';

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const user = await getActiveUser();
      return { user };
    } catch {
      return { user: null };
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const { user } = Route.useLoaderData() as { user: UserSession | null };

  return (
    <main className="page-wrap px-4 pb-16 pt-10 sm:pt-16">
      {/* Hero Section */}
      <section className="island-shell rise-in relative overflow-hidden rounded-[2.5rem] px-6 py-12 sm:px-12 sm:py-20 text-center shadow-2xl">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.22),transparent_70%)]" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.18),transparent_70%)]" />

        <p className="island-kicker mb-3 font-bold text-blue-500 tracking-widest uppercase text-xs">Medical Diagnostic AI</p>
        <h1 className="display-title mb-6 max-w-4xl mx-auto text-4xl leading-[1.05] font-black tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Deep Learning Assisted Alzheimer's Classification
        </h1>
        <p className="mb-10 max-w-3xl mx-auto text-base text-[var(--sea-ink-soft)] sm:text-xl leading-relaxed">
          Upload brain MRI scans and receive immediate predictions with confidence level mappings across four stages (Non-Demented, Very Mild, Mild, and Moderate Demented), integrated with patient timelines and clinic reports.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="rounded-full bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white px-8 py-3.5 text-base font-bold shadow-lg hover:shadow-xl transition hover:-translate-y-0.5"
            >
              Access Doctor Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white px-8 py-3.5 text-base font-bold shadow-lg hover:shadow-xl transition hover:-translate-y-0.5"
            >
              Access Clinical Portal
            </Link>
          )}
          <a
            href="#features"
            className="rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-8 py-3.5 text-base font-bold text-[var(--sea-ink)] shadow transition hover:-translate-y-0.5 hover:bg-[var(--link-bg-hover)]"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mt-16">
        <div className="text-center mb-10">
          <h2 className="display-title text-3xl font-extrabold text-[var(--sea-ink)]">
            Clinical Features & Diagnostics
          </h2>
          <p className="text-[var(--sea-ink-soft)] mt-2">Built for professional clinical environments and doctor workflows</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'ResNet50 Stage Prediction',
              desc: 'Leverages advanced convolutional neural network classifiers to predict Alzheimer stages based on voxel intensity and cerebral structure.',
              icon: (
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )
            },
            {
              title: 'Patient Timelines & Files',
              desc: 'Store history of scan uploads and results, allowing doctors to trace longitudinal changes in patients over months and years.',
              icon: (
                <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            },
            {
              title: 'PDF Export with QR Verify',
              desc: 'Generate medical report PDFs detailing patient details, prediction values, model signature, and a QR code verifying the record online.',
              icon: (
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )
            },
            {
              title: 'Private Encrypted Storage',
              desc: 'Uses isolated Supabase Private Storage with strict folder-level Row-Level Security (RLS) to ensure HIPPA-friendly scan files.',
              icon: (
                <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )
            },
            {
              title: 'Administrative Oversight',
              desc: 'Administrative panels for analytics dashboarding, tracking AI latency health checks, audit logs, and managing users role assignments.',
              icon: (
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )
            },
            {
              title: 'Offline Demonstration Mode',
              desc: 'Runs out-of-the-box in mock database/prediction mode with no setup needed, allowing fully interactive diagnostic tests immediately.',
              icon: (
                <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )
            }
          ].map((item, idx) => (
            <article
              key={item.title}
              className="island-shell feature-card rise-in rounded-[1.75rem] p-6 text-left"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/15">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-[var(--sea-ink)]">{item.title}</h3>
              </div>
              <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Setup instructions block */}
      <section className="island-shell mt-16 rounded-[2rem] p-8 text-left bg-gradient-to-br from-blue-500/5 to-transparent">
        <h2 className="text-xl font-extrabold text-[var(--sea-ink)] mb-4">Clinical Portal Setup Guidelines</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-[var(--sea-ink-soft)]">
          <div>
            <h4 className="font-bold text-[var(--sea-ink)] mb-2">1. Local Mock Run (Instant)</h4>
            <p>Access the portal by clicking <strong>Clinical Portal</strong>, then use the <strong>Quick Demo Login</strong> options to authenticate instantly as a Doctor or Admin.</p>
          </div>
          <div>
            <h4 className="font-bold text-[var(--sea-ink)] mb-2">2. Production Connection</h4>
            <p>Define `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `ML_API_URL` environment variables in your deployment settings to activate live PostgreSQL RLS database and CNN model inference.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
