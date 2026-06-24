export interface TrainingCertificate {
  id: string
  level: string
  status: "en_cours" | "disponible"
  issuedAt?: string
}

export interface CertificatesProvider {
  getEnrolledLevel(): Promise<string>
  setEnrolledLevel(level: string): Promise<void>
  getAll(): Promise<TrainingCertificate[]>
  getForStudent(): Promise<TrainingCertificate[]>
}

