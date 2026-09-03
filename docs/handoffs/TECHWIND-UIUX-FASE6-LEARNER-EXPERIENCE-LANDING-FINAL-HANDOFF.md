# TECHWIND UI/UX Fase 6 — Learner Experience & Landing Page Final Handoff

**Tanggal:** 2026-01-XX  
**Versi:** 1.0  
**Status:** Selesai  
**Authority:** `C:\Datas\Proyek\UI\techwind-pembelajaran\`

---

## Ringkasan

Fase 6 — Learner Experience dan finalisasi visual Landing Page telah selesai diimplementasikan. Tugas ini mencakup:

1. Analisis lengkap Landing Page terhadap design authority Techwind
2. Review dan perbaikan `/my-learning` Learner Experience
3. Implementasi section baru pada Landing Page untuk mencocokkan authority
4. Penambahan komponen sertifikat pada Learner Experience
5. Validasi lint, typecheck, build, dan Docker
6. Visual verification pada 390 px dan 1440 px

---

## Authority Files yang Direview

### Landing Page Authority
- **File:** `C:\Datas\Proyek\UI\techwind-pembelajaran\index.html`
- **Komponen utama:**
  - Hero slider dengan CTA
  - Section "Pusat pembelajaran dan pengetahuan" dengan search card dan filter buttons
  - Section "Berita Unggulan Kami" dengan 2-column layout (news list + sidebar)
  - Section "Pengumuman" dengan carousel/grid 4-column
  - Section "Media & Galeri" dengan filter tabs dan grid 5-column
  - Section FAQ dengan accordion
  - Footer dengan 4-column layout

### Navigation Authority
- **File:** `C:\Datas\Proyek\UI\techwind-pembelajaran\assets\js\site-shell.js`
- **Pattern:**
  - Navbar dengan mega-menu untuk "Pembelajaran" dan "Informasi"
  - Footer dengan 4-column navigation
  - Back-to-top button
  - Theme switcher

---

## Landing Page — Perubahan yang Diterapkan

### File: `apps/portal-web/src/app/page.tsx`

#### 1. Reordering Section Layout
Menambahkan default order pada `sectionProps` untuk mengontrol urutan section sesuai authority:

```typescript
const sectionProps = (key: string, defaultOrder = 99) => {
  const section = configuration.homepage.sections.find((item) => item.key === key);
  return { hidden: section ? !section.visible : false, style: { order: section?.order ?? defaultOrder } };
};
```

Urutan section sesuai authority:
1. Hero (order 1)
2. Learning showcase (order 2)
3. Search section (order 3)
4. Learning paths/features (order 4)
5. Topics/categories (order 5)
6. Knowledge/popular (order 6)
7. News (order 7)
8. Announcements (order 8)
9. Media gallery (order 9)
10. CTA final (order 10)
11. FAQ (order 11)

#### 2. Section Baru: Learning Showcase
Menambahkan section "Pembelajaran Saya" sebelum search section:

```tsx
<section {...sectionProps("learning", 2)} className="portal-section">
  <div className="portal-container">
    <div className="portal-section-heading">
      <p className="portal-eyebrow">Pembelajaran Saya</p>
      <h2 className="portal-section-title">Lanjutkan kelas aktif dan pantau perkembangan kompetensi Anda</h2>
      <p className="portal-section-copy">melalui materi yang terstruktur dan relevan.</p>
    </div>
    <div className="mt-10 grid gap-6 lg:grid-cols-3">
      {featured.slice(0, 6).map((entry) => {
        // Render cards
      })}
    </div>
    <div className="mt-8 text-center">
      <Link href="/search" className="portal-button-secondary">Selengkapnya →</Link>
    </div>
  </div>
</section>
```

#### 3. Section Baru: Search dengan Filters
Menambahkan section "Pusat pembelajaran dan pengetahuan" dengan search card dan filter buttons:

```tsx
<section {...sectionProps("search", 3)} className="portal-section portal-section-muted" id="cari">
  <div className="portal-container">
    <div className="portal-section-heading">
      <p className="portal-eyebrow">Pusat pembelajaran dan pengetahuan</p>
      <h2 className="portal-section-title">Temukan Materi untuk Tujuan Anda</h2>
      <p className="portal-section-copy">Cari kelas, pelatihan penuh, pembelajaran singkat, webinar, jalur belajar, berita, dan pengumuman berdasarkan kebutuhan Anda.</p>
    </div>
    <form action="/search" method="GET" role="search" className="portal-card mx-auto mt-8 max-w-5xl p-5 sm:p-6">
      <label className="font-semibold text-sm mb-2 block text-slate-900 dark:text-white" htmlFor="homepage-search">Cari berdasarkan topik atau kompetensi</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <PortalIcon name="search" className="absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
          <input id="homepage-search" name="q" type="search" placeholder="Contoh: keamanan informasi, analisis data, atau kepemimpinan" className="portal-search-input w-full pl-12" />
        </div>
        <button type="submit" className="portal-button-primary">
          <PortalIcon name="search" className="h-5 w-5" /> Cari
        </button>
      </div>
      <p className="text-slate-400 text-sm mt-3">Gunakan kata kunci topik, kompetensi, atau format pembelajaran.</p>
    </form>
    <div className="mt-8 flex flex-wrap justify-center gap-2">
      <button className="portal-filter-active">Semua</button>
      <button className="portal-filter">Kelas</button>
      <button className="portal-filter">Pelatihan Penuh</button>
      <button className="portal-filter">Pembelajaran Singkat</button>
      <button className="portal-filter">Webinar</button>
      <button className="portal-filter">Jalur Belajar</button>
      <button className="portal-filter">Berita</button>
      <button className="portal-filter">Pengumuman</button>
    </div>
  </div>
</section>
```

#### 4. Section Baru: News dengan Sidebar
Menambahkan section "Berita Unggulan Kami" dengan 2-column layout:

```tsx
<section {...sectionProps("news", 7)} className="portal-section">
  <div className="portal-container">
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div className="max-w-2xl">
        <p className="portal-eyebrow">Berita Unggulan Kami</p>
        <h2 className="portal-section-title">Ikuti kabar terbaru tentang program dan layanan pembelajaran.</h2>
      </div>
      <Link href="/news" className="portal-text-link">Semua Berita →</Link>
    </div>
    <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="grid gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="portal-card overflow-hidden lg:flex">
            <div className="relative shrink-0 lg:w-52">
              <div className="aspect-video lg:aspect-square lg:h-56 bg-slate-100" />
            </div>
            <div className="p-6 flex flex-col justify-center">
              <h3 className="font-medium hover:text-primary">Program Literasi Digital Diperluas</h3>
              <p className="mt-3 text-sm text-slate-600">Dapatkan informasi terbaru tentang program, layanan, dan peluang pembelajaran untuk pengembangan kompetensi.</p>
              <Link href="/news" className="mt-4 portal-text-link">Baca Selengkapnya →</Link>
            </div>
          </article>
        ))}
      </div>
      <div className="sticky top-20">
        <div className="portal-card p-2 text-center"><h5 className="font-semibold">Postingan Terbaru</h5></div>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-16 w-16 rounded bg-slate-100" />
              <div><p className="font-semibold hover:text-primary">Program Literasi Digital Diperluas</p><p className="text-sm text-slate-500">26 Agustus 2026</p></div>
            </div>
          ))}
        </div>
        <div className="portal-card p-2 text-center mt-8"><h5 className="font-semibold">Jelajahi</h5></div>
        <div className="mt-6 flex justify-center gap-2">
          {featureLinks.map((link) => <ButtonIcon key={link.href} href={link.href} label={link.title}><PortalIcon name={link.icon} className="h-5 w-5" /></ButtonIcon>)}
        </div>
        <div className="portal-card p-2 text-center mt-8"><h5 className="font-semibold">Tag Populer</h5></div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => <Tag key={cat.title} href={`/search?q=${encodeURIComponent(cat.query)}`}>{cat.title}</Tag>)}
        </div>
      </div>
    </div>
  </div>
</section>
```

#### 5. Section Baru: Announcements
Menambahkan section "Pengumuman" dengan grid 4-column:

```tsx
<section {...sectionProps("announcements", 8)} className="portal-section portal-section-muted">
  <div className="portal-container">
    <div className="portal-section-heading">
      <p className="portal-eyebrow">Pengumuman</p>
      <h2 className="portal-section-title">Informasi dan pemberitahuan resmi terbaru untuk Anda.</h2>
    </div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <article key={i} className="portal-card overflow-hidden group">
          <div className="aspect-video bg-slate-100 group-hover:scale-105 transition-transform" />
          <div className="p-4">
            <h3 className="font-medium hover:text-primary">Dokumentasi Orientasi Peserta</h3>
            <p className="text-sm text-slate-500">Pengumuman</p>
          </div>
        </article>
      ))}
    </div>
    <div className="mt-8 text-center">
      <Link href="/announcements" className="portal-button-secondary">Selengkapnya →</Link>
    </div>
  </div>
</section>
```

#### 6. Section Baru: Media Gallery
Menambahkan section "Media & Galeri" dengan filter tabs dan grid 5-column:

```tsx
<section {...sectionProps("media", 9)} className="portal-section">
  <div className="portal-container">
    <div className="portal-section-heading">
      <p className="portal-eyebrow">Media & Galeri</p>
      <h2 className="portal-section-title">Dokumentasi kegiatan dan galeri media kami.</h2>
    </div>
    <div className="mt-6 flex justify-center gap-3">
      <button className="portal-filter-active">Semua</button>
      <button className="portal-filter">Umum</button>
      <button className="portal-filter">Kegiatan</button>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <article key={i} className="portal-card overflow-hidden group">
          <div className="aspect-square bg-slate-100 group-hover:scale-105 transition-transform" />
          <div className="p-4">
            <h3 className="font-medium hover:text-primary">Pemeliharaan Layanan Pembelajaran</h3>
            <p className="text-sm text-slate-500">Umum</p>
          </div>
        </article>
      ))}
    </div>
    <div className="mt-8 text-center">
      <Link href="/media-gallery" className="portal-button-secondary">Selengkapnya →</Link>
    </div>
  </div>
</section>
```

#### 7. FAQ Section Re-ordered
Memindahkan FAQ section ke akhir dengan order 11:

```tsx
<section {...sectionProps("faq", 11)} id="faq" className="portal-section">
  <div className="portal-container grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
    <div>
      <p className="portal-eyebrow">Pertanyaan umum</p>
      <h2 className="portal-section-title">Kenali cara kerja Teman Belajar</h2>
      <p className="portal-section-copy">Jawaban terkurasi untuk membantu Anda mulai menggunakan platform.</p>
      <Link href="/help" className="portal-button-secondary mt-6">Buka Pusat Bantuan</Link>
    </div>
    <div className="grid gap-4">
      {faqs.length ? faqs.map((item) => <Accordion key={item.id} title={item.question}><p>{item.answer}</p></Accordion>) : <EmptyState title="FAQ belum tersedia" description="Buka Pusat Bantuan untuk mencoba kembali." />}
    </div>
  </div>
</section>
```

---

## Learner Experience — Perubahan yang Diterapkan

### File: `apps/portal-web/src/app/my-learning/page.tsx`

#### 1. Komponen CertificateCard Baru
Menambahkan komponen untuk menampilkan sertifikat kursus yang selesai:

```tsx
function CertificateCard({ title, issuedAt, validUntil }: { title: string; issuedAt: string; validUntil?: string }) {
  return <div className="portal-card p-6">
    <div className="flex items-start gap-4">
      <PortalIcon name="graduation" className="h-8 w-8 text-teal-600" />
      <div>
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">Diterbitkan: {new Date(issuedAt).toLocaleDateString("id-ID")}</p>
        {validUntil && <p className="text-sm text-slate-500">Berlaku hingga: {new Date(validUntil).toLocaleDateString("id-ID")}</p>}
      </div>
    </div>
  </div>;
}
```

**Catatan:** Menggunakan icon `graduation` karena `award` tidak tersedia di PortalIcon.

#### 2. Section Sertifikat
Menambahkan section sertifikat di bawah course list (hanya jika ada kursus yang selesai):

```tsx
{completed.length > 0 && (
  <section className="mt-12">
    <h2 className="portal-section-title">Sertifikat Anda</h2>
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {completed.slice(0, 4).map((course) => (
        <CertificateCard 
          key={course.id} 
          title={course.full_name || course.short_name} 
          issuedAt={course.enrolled_at ? new Date(course.enrolled_at).toISOString() : "Belum ditentukan"} 
        />
      ))}
    </div>
  </section>
)}
```

**Catatan:** Menggunakan `enrolled_at` sebagai fallback untuk tanggal penerbitan karena `completion_time` tidak tersedia di interface `EnrolledCourse`. Menggunakan string literal "Belum ditentukan" untuk menghindari React purity error dengan `Date.now()`.

---

## Komponen Techwind Baru

### File: `apps/portal-web/src/components/techwind/index.tsx`

#### 1. ButtonIcon Component
Komponen untuk icon button dengan hover effect:

```tsx
export function ButtonIcon({ href, children, label }: { href: string; children: React.ReactNode; label: string }) {
  return <Link href={href} className="portal-button-icon inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-primary hover:bg-primary hover:text-white transition-colors" aria-label={label}>{children}</Link>;
}
```

#### 2. Tag Component
Komponen untuk tag dengan hover effect:

```tsx
export function Tag({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="portal-tag inline-block px-3 py-1 text-sm text-slate-600 bg-slate-100 rounded-md hover:bg-primary hover:text-white transition-colors">{children}</Link>;
}
```

---

## CSS Updates

### File: `apps/portal-web/src/styles/techwind-foundation.css`

Menambahkan styles untuk komponen baru:

```css
.techwind-button-primary,
.portal-button-primary,
.techwind-button-secondary,
.portal-button-secondary,
.portal-button-icon {
  touch-action: manipulation;
}

.portal-button-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  border: 1px solid theme(colors.slate.200);
  background-color: theme(colors.slate.50);
  color: theme(colors.slate.600);
  transition: all 0.3s ease;
}

.portal-button-icon:hover {
  border-color: theme(colors.teal.600);
  background-color: theme(colors.teal.600);
  color: white;
}

.portal-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  color: theme(colors.slate.600);
  background-color: theme(colors.slate.100);
  border-radius: 0.375rem;
  transition: all 0.3s ease;
}

.portal-tag:hover {
  background-color: theme(colors.teal.600);
  color: white;
}
```

---

## Preserved Contracts & Boundaries

### API/Auth/Moodle/Data Contracts
- ✅ `/api/v1/learning/me` endpoint tetap digunakan untuk data learner
- ✅ `/api/v1/learning/me/courses` endpoint tetap digunakan untuk course list
- ✅ `getBackendAccessToken()` tetap dipanggil server-side
- ✅ Redirect ke federated logout untuk stale session tetap dipertahankan
- ✅ Redirect ke sign-in untuk unauthenticated users tetap dipertahankan
- ✅ Unmapped account handling (401/403/404) tetap dipertahankan
- ✅ Service unavailable handling tetap dipertahankan
- ✅ Moodle base URL dari environment variables tetap digunakan
- ✅ `continueCourse` selection berdasarkan `last_access` tetap dipertahankan

### No Breaking Changes
- ✅ Tidak ada perubahan pada backend API contracts
- ✅ Tidak ada perubahan pada database schema
- ✅ Tidak ada perubahan pada authentication flow
- ✅ Tidak ada perubahan pada Moodle integration
- ✅ Tidak ada perubahan pada Docker configuration (selain rebuild web image)

---

## Accessibility & Responsive Behavior

### Landing Page
- ✅ Semantic HTML structure dengan section/article elements
- ✅ ARIA labels untuk search form dan icon buttons
- ✅ Keyboard navigation untuk links dan buttons
- ✅ Mobile-first responsive grid (1 → 2 → 3/4/5 columns)
- ✅ No horizontal overflow
- ✅ Light/dark theme support melalui portal styles

### Learner Experience
- ✅ Semantic section untuk hero, course list, dan certificates
- ✅ Progress bar accessibility (dalam CourseCard)
- ✅ Clear hierarchy dengan portal-section-title
- ✅ Responsive grid untuk sertifikat (1 → 2 columns)
- ✅ Empty state untuk learners tanpa kursus
- ✅ Error state untuk service unavailable

---

## SEO & Metadata

- ✅ Landing page menggunakan dynamic data dari API
- ✅ Section visibility dapat dikontrol melalui `configuration.homepage.sections`
- ✅ Canonical links untuk discovery routes sudah ada dari Fase 3
- ✅ JSON-LD untuk FAQs sudah ada dari Fase 5
- ✅ Tidak ada perubahan pada SEO contracts

---

## Validation Results

### Lint
```bash
npm run lint
```
- ✅ Zero warnings
- ✅ ESLint flat config passed

### Typecheck
```bash
npm run typecheck
```
- ✅ TypeScript compilation successful
- ✅ No type errors

### Build
```bash
npm run build -- --webpack
```
- ✅ Production build successful
- ✅ All 32 routes generated
- ✅ Static pages generated successfully

**Warnings:**
- ⚠ Next.js inferred workspace root (multiple lockfiles detected)
- ⚠ `@next/swc-win32-x64-msvc` not installed, using WASM bindings

These warnings did not fail the build and are known from previous builds.

### Docker
```bash
cd infrastructure/docker
.\teman-belajar-docker.ps1 up
```
- ✅ All images built successfully
- ✅ Migration container exited with code 0
- ✅ All dependencies started
- ✅ `teman-belajar-web-1` healthy
- ✅ Container running at `http://127.0.0.1:3000`

### Visual QA
- ✅ Browser preview launched at `http://127.0.0.1:57725`
- ✅ Target: `http://127.0.0.1:3000/`
- ✅ Landing page sections render correctly
- ✅ Navbar/Footer consistent with Techwind patterns
- ✅ New sections (search, news, announcements, media) visible
- ✅ Learner experience accessible via `/my-learning`
- ✅ Certificate section renders when completed courses exist

---

## Known Limitations

### Static Placeholders
- News, announcements, dan media gallery sections saat ini menggunakan static placeholder data (Array.from)
- Ini intentional untuk visual alignment dengan authority
- Data real akan dihubungkan melalui API calls pada fase berikutnya

### Certificate Data
- `enrolled_at` digunakan sebagai fallback untuk tanggal penerbitan sertifikat
- `completion_time` tidak tersedia di interface `EnrolledCourse` saat ini
- Perlu backend update untuk menyediakan tanggal completion yang akurat

### Filter Buttons
- Filter buttons pada search section dan media gallery saat ini static
- State filtering akan diimplementasikan pada fase berikutnya

---

## Next Steps (Fase 7 — Hardening)

Berdasarkan roadmap `C:\Datas\Proyek\UI\techwind-pembelajaran\HANDOFF.md`, fase berikutnya adalah:

1. **Hardening:**
   - Review dan perbaiki edge cases
   - Audit accessibility
   - Optimize performance
   - Security hardening

2. **Data Integration:**
   - Hubungkan news section ke `/news` API
   - Hubungkan announcements section ke `/announcements` API
   - Hubungkan media gallery ke `/media-gallery` API
   - Implement filter state untuk search dan media sections

3. **Certificate Enhancement:**
   - Backend update untuk menyediakan `completion_time`
   - Tambah validUntil logic untuk sertifikat dengan expiry
   - Tambah link untuk download sertifikat (jika Moodle menyediakan)

---

## File Changed Summary

### Modified Files
1. `apps/portal-web/src/app/page.tsx` — Landing page sections dan ordering
2. `apps/portal-web/src/app/my-learning/page.tsx` — Certificate section
3. `apps/portal-web/src/components/techwind/index.tsx` — ButtonIcon dan Tag components
4. `apps/portal-web/src/styles/techwind-foundation.css` — CSS untuk komponen baru

### No Changes Required
- Navigation/Header/Footer: Already aligned with Techwind patterns
- Techwind components: Using existing centralized components
- API contracts: No changes required
- Authentication flow: No changes required
- Docker configuration: No changes required (only rebuild)

---

## Handoff Checklist

- [x] Authority files reviewed and understood
- [x] Landing page visual discrepancies identified
- [x] Landing page sections implemented to match authority
- [x] Learner experience reviewed and improved
- [x] Certificate section added to `/my-learning`
- [x] New Techwind components created (ButtonIcon, Tag)
- [x] CSS styles added for new components
- [x] ESLint passed with zero warnings
- [x] TypeScript typecheck passed
- [x] Production build successful
- [x] Docker web service rebuilt and healthy
- [x] Browser preview launched
- [x] Visual QA completed
- [x] Handoff document created

---

## Contact & Support

Untuk pertanyaan atau clarifications terkait implementasi ini, hubungi tim engineering atau refer ke:
- Repository: `C:\Datas\Proyek\Aplikasi\teman-belajar`
- Authority: `C:\Datas\Proyek\UI\techwind-pembelajaran`
- Previous handoffs: `docs/handoffs/TECHWIND-UIUX-*.md`

---

**Generated with [Devin](https://devin.ai)**  
**Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>**
