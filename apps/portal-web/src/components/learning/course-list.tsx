"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CourseDetailDrawer } from "./course-detail-drawer";
import { PortalIcon } from "@/components/portal-icon";
import type { EnrolledCourse } from "@/lib/learning/types";

export function CourseList({ 
  courses, 
  continueCourse, 
  moodleBaseUrl 
}: { 
  courses: EnrolledCourse[];
  continueCourse?: EnrolledCourse;
  moodleBaseUrl: string;
}) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "in_progress" | "completed">("all");

  const inProgressCount = useMemo(() => courses.filter((c) => !c.completed).length, [courses]);
  const completedCount = useMemo(() => courses.filter((c) => c.completed).length, [courses]);

  const filteredCourses = useMemo(() => {
    if (activeFilter === "in_progress") return courses.filter((c) => !c.completed);
    if (activeFilter === "completed") return courses.filter((c) => c.completed);
    return courses;
  }, [courses, activeFilter]);

  if (!courses || courses.length === 0) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 mb-4">
          <PortalIcon name="graduation" className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Anda belum mengikuti kursus apapun</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Silakan jelajahi katalog pembelajaran untuk menemukan pelatihan dan kursus formal yang sesuai dengan tujuan belajar Anda.
        </p>
        <Link href="/training-programs" className="portal-button-primary mt-6 inline-flex items-center gap-2">
          Jelajahi Katalog Pelatihan
        </Link>
      </section>
    );
  }

  return (
    <>
      {continueCourse && (
        <section aria-labelledby="continue-learning" className="mt-10">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse" />
            <p className="portal-eyebrow !mb-0">Lanjutkan Pembelajaran</p>
          </div>
          <div className="portal-card portal-course-card mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 border-l-4 border-l-primary rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Kursus Aktif
              </span>
              <h3 className="mt-1 text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {continueCourse.full_name}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Terakhir diakses: {continueCourse.last_access ? new Date(continueCourse.last_access * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
              </p>
              {typeof continueCourse.progress === "number" ? (
                <div className="mt-3 max-w-xs">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>Progres Kursus</span>
                    <span>{Math.round(continueCourse.progress)}%</span>
                  </div>
                  <div 
                    className="portal-course-progress w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700"
                    role="progressbar" 
                    aria-valuenow={Math.round(continueCourse.progress)} 
                    aria-valuemin={0} 
                    aria-valuemax={100}
                    aria-label={`Progres ${continueCourse.full_name}`}
                  >
                    <span
                      className="block h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, continueCourse.progress))}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCourseId(continueCourse.id.toString())}
                className="portal-button-secondary py-2.5 px-4 text-sm"
              >
                Detail
              </button>
              <a 
                href={`${moodleBaseUrl}/course/view.php?id=${continueCourse.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="portal-button-primary py-2.5 px-5 text-sm inline-flex items-center gap-2 shadow-sm"
              >
                Lanjutkan di Moodle →
              </a>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="my-courses" className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <h2 id="my-courses" className="text-2xl font-bold text-slate-900 dark:text-white">
              Daftar Kursus Saya
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Kelola kelas yang terdaftar dan pantau kemajuan belajar Anda secara langsung.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Semua ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("in_progress")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeFilter === "in_progress"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Sedang Berjalan ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("completed")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeFilter === "completed"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Selesai ({completedCount})
            </button>
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-500">
              Tidak ada kursus pada status filter ini.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <div 
                key={course.id} 
                className="portal-card portal-course-card flex flex-col p-6 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    course.completed 
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                      : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                  }`}>
                    {course.completed ? "Selesai" : "Sedang Berjalan"}
                  </span>
                  {course.enrolled_at ? (
                    <span className="text-xs text-slate-400">
                      Mulai {new Date(course.enrolled_at).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-4 text-lg font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">
                  {course.full_name}
                </h3>
                
                {typeof course.progress === "number" && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      <span>Progres</span>
                      <span className="font-bold text-primary">{Math.round(course.progress)}%</span>
                    </div>
                    <div 
                      className="portal-course-progress w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800"
                      role="progressbar" 
                      aria-valuenow={Math.round(course.progress)} 
                      aria-valuemin={0} 
                      aria-valuemax={100}
                      aria-label={`Progres ${course.full_name}`}
                    >
                      <span
                        className={`block h-full transition-all duration-500 ${
                          course.completed ? "bg-emerald-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, course.progress))}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setSelectedCourseId(course.id.toString())}
                    className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                  >
                    Detail Nilai & Bab
                  </button>
                  <a 
                    href={`${moodleBaseUrl}/course/view.php?id=${course.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-bold text-primary hover:text-primary-700 transition-colors inline-flex items-center gap-1"
                  >
                    Buka Kelas →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CourseDetailDrawer 
        courseId={selectedCourseId} 
        onClose={() => setSelectedCourseId(null)} 
      />
    </>
  );
}
