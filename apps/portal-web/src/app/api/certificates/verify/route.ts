import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code")?.trim() || "";

  if (!code) {
    return NextResponse.json(
      { valid: false, message: "Kode sertifikat wajib diisi." },
      { status: 400 }
    );
  }

  if (code.length > 64) {
    return NextResponse.json(
      { valid: false, message: "Kode sertifikat melebihi batas maksimal 64 karakter." },
      { status: 400 }
    );
  }

  const apiBase = process.env.PORTAL_API_INTERNAL_URL || "http://127.0.0.1:8180";

  try {
    const res = await fetch(`${apiBase}/api/v1/certificates/verify?code=${encodeURIComponent(code)}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data) {
      return NextResponse.json(data, { status: 200 });
    }

    if (res.status === 404) {
      return NextResponse.json(
        data || { valid: false, message: "Sertifikat dengan kode tersebut tidak ditemukan atau tidak valid." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      data || { valid: false, message: "Terjadi kesalahan pada layanan verifikasi." },
      { status: res.status || 500 }
    );
  } catch {
    return NextResponse.json(
      { valid: false, message: "Gagal terhubung ke layanan verifikasi sertifikat." },
      { status: 503 }
    );
  }
}
