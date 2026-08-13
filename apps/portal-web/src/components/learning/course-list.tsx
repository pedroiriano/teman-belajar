"use client";

import { useState } from "react";
import Link from "next/link";
import { CourseDetailDrawer } from "./course-detail-drawer";

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

  if (!courses || courses.length === 0) {
    return (
      <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="font-extrabold text-slate-800">Anda belum mengikuti kursus apapun</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Silakan jelajahi katalog pembelajaran untuk menemukan kursus yang relevan.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-800">
          Jelajahi Katalog Pembelajaran
        </Link>
      </section>
    );
  }


  return (
    <>
      {continueCourse && (
        <section aria-labelledby="continue-learning" className="mt-10">
          <div>
            <p className="portal-eyebrow">Lanjutkan</p>
            <h2 id="continue-learning" className="mt-2 text-2xl font-black">Lanjutkan Pembelajaran</h2>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{continueCourse.full_name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Terakhir diakses: {continueCourse.last_access ? new Date(continueCourse.last_access * 1000).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
            <a 
              href={`${moodleBaseUrl}/course/view.php?id=${continueCourse.id}`} 
              target="_blank" rel="noopener noreferrer"
              className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-800"
            >
              Lanjutkan →
            </a>
          </div>
        </section>
      )}

      <section aria-labelledby="my-courses" className="mt-12">
        <h2 id="my-courses" className="text-2xl font-black">Daftar Kursus Saya</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="portal-card flex flex-col p-6">
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                course.completed 
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              }`}>
                {course.completed ? "Selesai" : "Sedang Berjalan"}
              </span>
              <h3 className="mt-4 text-lg font-extrabold leading-6 text-slate-900 dark:text-white line-clamp-2">
                {course.full_name}
              </h3>
              
              {typeof course.progress === "number" && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>Progres</span>
                    <span>{Math.round(course.progress)}%</span>
                  </div>
                  <div 
                    className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
                    role="progressbar" 
                    aria-valuenow={Math.round(course.progress)} 
                    aria-valuemin={0} 
                    aria-valuemax={100}
                    aria-label={`Progres ${course.full_name}`}
                  >
                    <div 
                      className="h-full bg-teal-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, course.progress))}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 flex items-center justify-between">
                <button 
                  onClick={() => setSelectedCourseId(course.id.toString())}
                  className="text-sm font-bold text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400"
                >
                  Lihat Detail
                </button>
                <a 
                  href={`${moodleBaseUrl}/course/view.php?id=${course.id}`} 
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm font-bold text-teal-700 hover:text-teal-800"
                >
                  Mulai / Buka →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CourseDetailDrawer 
        courseId={selectedCourseId} 
        onClose={() => setSelectedCourseId(null)} 
      />
    </>
  );
}
