import type { HTMLAttributes } from "react";

export interface ImpactStatItem {
  id: string;
  value: string;
  label: string;
  description: string;
  iconName: string;
}

interface ImpactCounterSectionProps extends HTMLAttributes<HTMLElement> {
  stats?: ImpactStatItem[];
}

export function ImpactCounterSection({
  stats,
  ...props
}: ImpactCounterSectionProps) {
  const defaultStats: ImpactStatItem[] = [
    {
      id: "courses",
      value: "50+",
      label: "Program & Modul",
      description: "Pelatihan formal LMS, microlearning, dan jalur belajar terstruktur.",
      iconName: "ri-book-open-line",
    },
    {
      id: "learners",
      value: "1.250+",
      label: "Pembelajar Aktif",
      description: "Aparatur dan profesional yang terhubung dalam ekosistem belajar.",
      iconName: "ri-user-smile-line",
    },
    {
      id: "hours",
      value: "350+",
      label: "Jam Pembelajaran",
      description: "Materi video praktis, bacaan mendalam, dan sesi interaktif.",
      iconName: "ri-time-line",
    },
    {
      id: "satisfaction",
      value: "98.5%",
      label: "Tingkat Kepuasan",
      description: "Evaluasi positif dari pembelajar terhadap relevansi materi.",
      iconName: "ri-star-smile-line",
    },
  ];

  const displayStats = stats && stats.length > 0 ? stats : defaultStats;

  return (
    <section
      {...props}
      data-techwind-pattern="impact-counters"
      id="statistik-dampak"
      className="relative md:py-20 py-14 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800"
    >
      <div className="container relative">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-8">
          {displayStats.map((item) => (
            <div
              key={item.id}
              className="text-center p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:shadow-md transition-all duration-300 group"
            >
              <div className="size-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform">
                <i className={`${item.iconName} leading-none`} />
              </div>

              <div className="font-extrabold text-3xl lg:text-4xl text-slate-900 dark:text-white tracking-tight">
                {item.value}
              </div>

              <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-2">
                {item.label}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs mx-auto">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
