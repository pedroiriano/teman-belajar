"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import type { CreateScheduleInput, ScheduleEvent, ScheduleModule } from "@/types/schedule";

// Curated baseline schedule events reflecting the Cuba prototype fixtures
const baselineEvents: ScheduleEvent[] = [
  {
    id: "SCH-001",
    title: "Literasi Digital untuk ASN",
    module: "Pelatihan",
    targetDate: "2026-09-01",
    targetTime: "09:00",
    status: "scheduled",
    statusLabel: "Terjadwal",
    owner: "Dewi Anggraini",
    cohortLabel: "Batch 1 - Gelombang A",
    participantsCount: 124,
    hasConflict: true,
    conflictDetails: "Dua publikasi menggunakan slot Selasa 09.00 WIB.",
    description: "Pelatihan mandiri literasi digital untuk aparatur sipil negara.",
  },
  {
    id: "SCH-002",
    title: "Surat Edaran Pembelajaran Digital",
    module: "Pengumuman",
    targetDate: "2026-09-01",
    targetTime: "09:00",
    status: "needs_review",
    statusLabel: "Konflik Slot",
    owner: "Biro Kepegawaian",
    hasConflict: true,
    conflictDetails: "Dua publikasi menggunakan slot Selasa 09.00 WIB.",
    description: "Pengumuman serentak aktivasi akun pembelajaran semester ganjil.",
  },
  {
    id: "SCH-003",
    title: "Etika Komunikasi Publik",
    module: "Microlearning",
    targetDate: "2026-09-01",
    targetTime: "11:30",
    status: "needs_review",
    statusLabel: "Perlu revisi",
    owner: "Rani Wulandari",
    description: "Pemeriksaan akhir modul kartu baca ringkas etika komunikasi publik.",
  },
  {
    id: "SCH-004",
    title: "Kelas Pengadaan Dasar",
    module: "Pelatihan",
    targetDate: "2026-09-01",
    targetTime: "14:00",
    status: "ready",
    statusLabel: "Siap",
    owner: "Bagas Pratama",
    cohortLabel: "Cohort Kelas Virtual",
    participantsCount: 124,
    description: "Sesi tatap muka virtual pengadaan barang dan jasa pemerintah.",
  },
  {
    id: "SCH-005",
    title: "Etika Komunikasi & Layanan",
    module: "Microlearning",
    targetDate: "2026-09-02",
    targetTime: "10:00",
    status: "needs_review",
    statusLabel: "Perlu revisi",
    owner: "Rani Wulandari",
  },
  {
    id: "SCH-006",
    title: "Kelas Pengadaan Tingkat Pertama",
    module: "Pelatihan",
    targetDate: "2026-09-04",
    targetTime: "09:00",
    status: "ready",
    statusLabel: "Siap",
    owner: "Bagas Pratama",
    cohortLabel: "Batch 2",
    participantsCount: 86,
  },
  {
    id: "SCH-007",
    title: "Panduan Keamanan Informasi",
    module: "Pengetahuan",
    targetDate: "2026-09-09",
    targetTime: "13:00",
    status: "scheduled",
    statusLabel: "Terjadwal",
    owner: "Tim Siber Sandi",
  },
  {
    id: "SCH-008",
    title: "Pelayanan Inklusif Ramah Disabilitas",
    module: "Pelatihan",
    targetDate: "2026-09-15",
    targetTime: "08:30",
    status: "ready",
    statusLabel: "Siap",
    owner: "Puslatbang",
    cohortLabel: "Cohort Nasional",
    participantsCount: 72,
  },
  {
    id: "SCH-009",
    title: "Manajemen Risiko Organisasi",
    module: "Microlearning",
    targetDate: "2026-09-22",
    targetTime: "14:00",
    status: "needs_review",
    statusLabel: "Perlu revisi",
    owner: "Arif Setiawan",
  },
  {
    id: "SCH-010",
    title: "Pembaharuan Kurikulum Kepemimpinan",
    module: "Berita",
    targetDate: "2026-09-25",
    targetTime: "10:00",
    status: "published",
    statusLabel: "Terbit",
    owner: "Humas Teman Belajar",
  },
];

let inMemoryEvents: ScheduleEvent[] = [...baselineEvents];

export type GetScheduleEventsResult =
  | { success: true; data: ScheduleEvent[]; conflictCount: number }
  | { success: false; error: string; status?: number };

export async function getScheduleEventsAction(
  month?: string,
  selectedModule?: ScheduleModule | "all"
): Promise<GetScheduleEventsResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Unauthorized", status: 401 };
  }

  try {
    let events = [...inMemoryEvents];

    if (month) {
      events = events.filter((e) => e.targetDate.startsWith(month));
    }

    if (selectedModule && selectedModule !== "all") {
      events = events.filter((e) => e.module === selectedModule);
    }

    // Identify conflicts dynamically: same date and time
    const slotMap = new Map<string, string[]>();
    for (const event of events) {
      const slotKey = `${event.targetDate}_${event.targetTime}`;
      const existing = slotMap.get(slotKey) || [];
      existing.push(event.id);
      slotMap.set(slotKey, existing);
    }

    let conflictCount = 0;
    const finalEvents = events.map((event) => {
      const slotKey = `${event.targetDate}_${event.targetTime}`;
      const conflictIds = slotMap.get(slotKey) || [];
      const hasConflict = conflictIds.length > 1;
      if (hasConflict) conflictCount++;
      return {
        ...event,
        hasConflict,
        conflictDetails: hasConflict
          ? `Konflik jadwal: slot ${event.targetDate} pukul ${event.targetTime} WIB digunakan lebih dari satu publikasi.`
          : undefined,
      };
    });

    return {
      success: true,
      data: finalEvents,
      conflictCount,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat jadwal publikasi";
    return { success: false, error: message };
  }
}

export type CreateScheduleResult =
  | { success: true; data: ScheduleEvent }
  | { success: false; error: string };

export async function createScheduleEventAction(
  input: CreateScheduleInput
): Promise<CreateScheduleResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  if (!input.title || input.title.trim().length < 5) {
    return { success: false, error: "Judul jadwal minimal 5 karakter" };
  }
  if (!input.targetDate) {
    return { success: false, error: "Tanggal publikasi wajib dipilih" };
  }
  if (!input.targetTime) {
    return { success: false, error: "Waktu publikasi wajib dipilih" };
  }

  const newEvent: ScheduleEvent = {
    id: `SCH-${Date.now().toString().slice(-4)}`,
    title: input.title.trim(),
    module: input.module,
    targetDate: input.targetDate,
    targetTime: input.targetTime,
    status: "scheduled",
    statusLabel: "Terjadwal",
    owner: input.owner || session.user?.name || "Editor",
    cohortLabel: input.cohortLabel?.trim() || undefined,
    participantsCount: input.participantsCount,
    description: input.description?.trim() || undefined,
  };

  inMemoryEvents.unshift(newEvent);

  return { success: true, data: newEvent };
}
