export interface VerifiedCertificate {
  code: string;
  recipient_name: string;
  course_name: string;
  certificate_name: string;
  issued_at: number;
  issuer: string;
  verification_url: string;
}

export interface CertificateVerificationResult {
  valid: boolean;
  certificate?: VerifiedCertificate;
  message?: string;
}

function getApiBase(): string {
  if (typeof window === "undefined") {
    // Server-side
    return process.env.PORTAL_API_INTERNAL_URL || "http://127.0.0.1:8180";
  }
  // Client-side goes through BFF
  return "";
}

export async function verifyCertificate(code: string): Promise<CertificateVerificationResult> {
  const cleanCode = code.trim();
  if (!cleanCode) {
    return {
      valid: false,
      message: "Kode sertifikat tidak boleh kosong.",
    };
  }

  if (cleanCode.length > 64) {
    return {
      valid: false,
      message: "Kode sertifikat melebihi batas maksimal 64 karakter.",
    };
  }

  try {
    const isServer = typeof window === "undefined";
    const url = isServer
      ? `${getApiBase()}/api/v1/certificates/verify?code=${encodeURIComponent(cleanCode)}`
      : `/api/certificates/verify?code=${encodeURIComponent(cleanCode)}`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        certificate: data.certificate,
      };
    }

    if (response.status === 404) {
      const errorData = await response.json().catch(() => null);
      return {
        valid: false,
        message: errorData?.message || "Sertifikat dengan kode tersebut tidak ditemukan atau tidak valid.",
      };
    }

    const errorData = await response.json().catch(() => null);
    return {
      valid: false,
      message: errorData?.detail || errorData?.message || "Terjadi kesalahan saat memverifikasi sertifikat.",
    };
  } catch {
    return {
      valid: false,
      message: "Gagal terhubung ke layanan verifikasi sertifikat. Silakan coba beberapa saat lagi.",
    };
  }
}
