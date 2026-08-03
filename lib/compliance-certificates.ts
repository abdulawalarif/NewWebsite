export interface ComplianceCertificate {
  id: string;
  src: string;
  alt: string;
}

/** Germany/EU-relevant compliance badges — GDPR, ISO 27001, EU AI Act. */
export const COMPLIANCE_CERTIFICATES: ComplianceCertificate[] = [
  {
    id: "gdpr",
    src: "/images/compliance/gdpr.svg",
    alt: "GDPR / DSGVO compliance badge with EU stars.",
  },
  {
    id: "iso-27001",
    src: "/images/compliance/iso-27001.png",
    alt: "ISO 27001 Certified Information Security badge.",
  },
  {
    id: "eu-ai-act",
    src: "/images/compliance/eu-ai-act.svg",
    alt: "EU AI Act compliance badge.",
  },
];
