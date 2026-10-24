import React from 'react';

function AboutPage() {
  return (
    <main className="demo-page px-4 py-8">
      <div className="demo-panel rise-in max-w-3xl mx-auto rounded-[2rem] p-6 sm:p-10 shadow-xl">
        <h1 className="demo-title text-3xl font-black mb-4">Clinical AI Model Documentation</h1>
        <p className="demo-muted text-sm mb-6">Alzheimer Stage Diagnostic Tool classification schema.</p>
        <div className="space-y-6 text-sm text-[var(--sea-ink-soft)] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[var(--sea-ink)] mb-2">1. Convolutional Neural Network (CNN)</h2>
            <p>
              The diagnosis prediction is processed using a <strong>ResNet50</strong> deep learning model trained on brain MRI and MRI scan slices. The model classifies scans into four discrete neurodegenerative stages representing the progression of Alzheimer's disease:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Non Demented:</strong> Healthy brain structures with no observable cortical atrophy.</li>
              <li><strong>Very Mild Demented:</strong> Early stage microvascular structures degeneration.</li>
              <li><strong>Mild Demented:</strong> Moderate ventricular enlargement and observable cognitive damage patterns.</li>
              <li><strong>Moderate Demented:</strong> Advanced cerebral atrophy with significant ventricular enlargement.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[var(--sea-ink)] mb-2">2. Diagnostic Confidence & Verification</h2>
            <p>
              Predictions are accompanied by a decimal probability array sum (validated to equal approximately 1.0) and mapped to a clinical confidence tier (High: &gt;90%, Moderate: 75%-90%, Low: &lt;75%).
              Each generated report contains a cryptographic verification URL mapped into a downloadable PDF QR code, linking directly back to the database record.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-[var(--sea-ink)] mb-2">3. Data Security & HIPAA Statement</h2>
            <p>
              In production mode, the application uses isolated user access containers. Storage access tokens are short-lived signed URLs (1 hour expiry) ensuring scan files are never public. Audit logs track all operations, and patients are identified by custom MRN strings rather than direct personal metadata.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default AboutPage;
