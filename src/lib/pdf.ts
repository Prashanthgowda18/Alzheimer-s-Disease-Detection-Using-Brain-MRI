import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface ReportData {
  patientName: string;
  patientMrn: string;
  patientDob: string;
  patientGender: string;
  doctorName: string;
  hospitalName: string;
  scanDate: string;
  stage: string;
  confidence: number;
  confidenceLevel: string;
  recommendation: string;
  modelName: string;
  modelVersion: string;
  resultUrl: string;
  scanImageUrl?: string; // Signed short-lived URL or local base64
}

// Helper to convert remote image URL to base64 for jsPDF embedding
const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const generateDiagnosticPdf = async (data: ReportData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Pages details
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Clinic Block
  doc.setFillColor(37, 99, 235); // Blue primary
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(data.hospitalName || 'Clinical Diagnostic Center', 15, 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Attending Physician: ${data.doctorName}`, 15, 24);
  doc.text(`Analysis Completed: ${new Date(data.scanDate).toLocaleString()}`, 15, 30);

  // Logo text icon
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Ψ', pageWidth - 25, 22);

  // 2. Patient Demographics Block
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PATIENT DEMOGRAPHICS', 15, 52);
  
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 54, pageWidth - 15, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Patient Name:`, 15, 62);
  doc.setFont('helvetica', 'bold');
  doc.text(data.patientName, 42, 62);

  doc.setFont('helvetica', 'normal');
  doc.text(`Clinical MRN:`, 15, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(data.patientMrn, 42, 68);

  doc.setFont('helvetica', 'normal');
  doc.text(`Date of Birth:`, pageWidth / 2, 62);
  doc.setFont('helvetica', 'bold');
  doc.text(data.patientDob, (pageWidth / 2) + 30, 62);

  doc.setFont('helvetica', 'normal');
  doc.text(`Gender:`, pageWidth / 2, 68);
  doc.setFont('helvetica', 'bold');
  doc.text(data.patientGender.toUpperCase(), (pageWidth / 2) + 30, 68);

  // 3. AI Inference Diagnostic Block
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('AI DIAGNOSTIC CLASSIFICATION', 15, 84);
  doc.line(15, 86, pageWidth - 15, 86);

  // Highlight Box for Stage Result
  doc.setFillColor(248, 250, 252); // Soft gray
  doc.rect(15, 92, pageWidth - 30, 26, 'F');
  
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Diagnosed Stage: ${data.stage}`, 20, 100);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Model Confidence: ${(data.confidence * 100).toFixed(1)}% (${data.confidenceLevel} Confidence)`, 20, 107);
  doc.text(`Inference Model: ${data.modelName} v${data.modelVersion}`, 20, 113);

  // 4. Diagnostic Recommendation
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CLINICAL RECOMMENDATION', 15, 130);
  doc.line(15, 132, pageWidth - 15, 132);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  
  // Wrap recommendation text to page width
  const splitRec = doc.splitTextToSize(data.recommendation || 'No specific diagnostic recommendation provided.', pageWidth - 30);
  doc.text(splitRec, 15, 139);

  // 5. Embed Scan Image (if provided)
  let scanImageHeightOffset = 158;
  if (data.scanImageUrl) {
    try {
      const base64 = await getBase64ImageFromUrl(data.scanImageUrl);
      if (base64) {
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('ANALYZED TOMOGRAPHY SCAN', 15, 158);
        doc.line(15, 160, pageWidth - 15, 160);

        // Render centered scan image
        const imgWidth = 70;
        const imgHeight = 70;
        const imgX = (pageWidth - imgWidth) / 2;
        doc.addImage(base64, 'JPEG', imgX, 165, imgWidth, imgHeight);
        scanImageHeightOffset = 240;
      }
    } catch (e) {
      console.error('Failed to embed scan image in PDF', e);
    }
  }

  // 6. Report Verification QR Code & Signature lines
  const footerY = pageHeight - 40;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, footerY, pageWidth - 15, footerY);

  // QR Code Generation
  try {
    const qrData = await QRCode.toDataURL(data.resultUrl || 'https://placeholder.org');
    doc.addImage(qrData, 'PNG', 15, footerY + 5, 25, 25);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('Scan QR code to verify this digital record online', 43, footerY + 12);
    doc.text('Report ID: ' + crypto.randomUUID().slice(0, 8).toUpperCase(), 43, footerY + 17);
  } catch (err) {
    console.error('Failed to write QR to PDF', err);
  }

  // Doctor Signature line
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - 75, footerY + 18, pageWidth - 15, footerY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Attending Physician Signature', pageWidth - 65, footerY + 23);

  // Save the PDF
  doc.save(`Diagnostic_Report_${data.patientMrn}_${data.stage.replace(/\s+/g, '_')}.pdf`);
};
