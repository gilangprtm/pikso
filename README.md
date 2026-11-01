# Nana — cerita kecil, imajinasi tanpa batas

Satu aplikasi full-stack Next.js dengan katalog cerita publik, pembaca flipbook, dan studio admin untuk mengelola buku.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS 4 + shadcn/ui (Base UI, preset Nova)
- Better Auth — email/password admin, tanpa pendaftaran publik
- PostgreSQL — data buku, akun, sesi
- PDF.js (`react-pdf`) + StPageFlip (`react-pageflip`)
- Penyimpanan file lokal privat di `storage/` (di luar `public/`)

## Persiapan

Prasyarat: Node.js 22.13+ atau 24+, PostgreSQL 15+ yang dapat dijangkau, dan filesystem server lokal yang persisten serta berkapasitas cukup.

Isi `.env` pada root project dengan `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` acak (≥32 karakter), dan `STORAGE_DIR`. Jangan salin kredensial database/auth ke chat.

```sh
npm ci
```

Inisialisasi schema secara eksplisit pada database yang memang dipilih:

```sh
npm run db:migrate
```

Atas permintaan Owner, kredensial bootstrap sementara ditetapkan langsung di `scripts/create-admin.ts`, bukan melalui `.env`. Password minimum aplikasi kini 6 karakter (maksimal 128). **Password bootstrap mudah ditebak: jangan gunakan di website production publik; ganti sebelum dibuka untuk umum.** Jalankan seed secara eksplisit:

```sh
npm run db:seed
# Alias: npm run admin:create
```

Seed membuat akun admin baru secara atomik dengan password hash. Jika email sudah terdaftar sebagai admin berkredensial, seed no-op tanpa mengganti password; akun lain dengan email tersebut ditolak. Pendaftaran publik tetap dimatikan. Admin masuk melalui `/admin/login`.

Jalankan aplikasi lokal:

```sh
npm run dev
```

Build lokal: `npm run build`; pemeriksaan: `npm run lint`, `npm run typecheck`, `npm test`.

## Komponen UI

Seluruh 64 komponen berkas pada registry resmi shadcn Base Nova tersedia di `src/components/ui/`, termasuk dialog, drawer, combobox, calendar, chart, sidebar, toast, dan Sonner. Entri registry `form` tidak menyediakan berkas tersendiri; gunakan komponen `Field` bersama elemen form dan validasi aplikasi.

Konfigurasi CLI ada di `components.json`; helper `cn` tetap memakai `src/lib/utils.ts`. Tema terhubung melalui `src/app/globals.css`, dengan Manrope/DM Sans dan palet Pikso tetap dipertahankan. Token `--public-muted` khusus warna teks publik dibedakan dari `--muted`, yaitu warna permukaan komponen shadcn. `TooltipProvider` sudah dipasang di root layout; provider opsional lain seperti `Toaster` atau `SidebarProvider` dipasang saat fitur tersebut dipakai.

```sh
# Sertakan tooling development meskipun NODE_ENV=production.
npm ci --include=dev
# Tinjau perubahan sebelum menimpa komponen yang telah disesuaikan.
npx shadcn add button --dry-run
```

Instalasi tidak otomatis mengganti seluruh UI aplikasi dengan komponen baru.

## Route

- `/` — hero, satu viewport
- `/books?page=1` — katalog publik terpaginasikan; hanya buku terbit
- `/books/[slug]` — detail cerita
- `/books/[slug]/read` — flipbook publik
- `/about` — satu layar tentang Nana
- `/admin/login` — login admin
- `/admin` — dashboard terlindungi
- `/admin/books` — kelola draft/terbit, edit, pratinjau, hapus
- `/admin/books/new` — unggah cerita

Tiap layar frontend/reader memakai tinggi viewport tanpa page scroll; reader memiliki navigasi internal, keyboard panah, zoom, PDF range requests, dan mode portrait satu halaman. Layout admin tetap satu viewport; jika viewport sempit, overflow tabel/form berada di dalam panel, bukan menghilangkan kontrol.

## File lokal dan keamanan

- Unggah hanya PDF cerita (maksimal 50 MiB / 52.428.800 byte, 1–500 halaman; total request multipart maksimal 56 MiB). Server membuat sampul WebP 900×900 dari halaman pertama menggunakan PDF.js dan `@napi-rs/canvas`; halaman nonpersegi diberi ruang putih tanpa dipotong atau diregangkan. Tidak ada upload/ganti sampul manual. Sampul buku lama tetap tersimpan tanpa konversi massal.
- Form admin memulai upload privat saat PDF dipilih: bagian berurutan 1 MiB, SHA-256 tiap bagian, dan retry terbatas hanya untuk PUT bagian yang idempotent. Jika koneksi terputus, gunakan **Lanjutkan upload**. Setelah refresh/pindah halaman, pilih kembali file yang sama untuk melanjutkan (browser tidak menyimpan isi PDF di localStorage; hanya ID sesi). Hash bagian yang sudah tersimpan diverifikasi sebelum melanjutkan. iOS dapat menghentikan transfer jika tab dibawa ke latar belakang.
- **Simpan cerita** mengirim JSON metadata dan ID sesi ke `/api/admin/books/finalize`, bukan PDF ulang. Validasi PDF, pembuatan cover, dan transaksi kategori tetap dilakukan server. ID sesi menjadi ID buku; pengulangan finalisasi merekonsiliasi hasil database, tidak membuat buku ganda. Route multipart lama tetap tersedia untuk kompatibilitas, tetapi tidak dipakai form baru.
- Sesi privat terikat akun admin, kedaluwarsa 24 jam, maksimum 3 sesi aktif per akun dan reservasi global 512 MiB. Bagian tersimpan pada `STORAGE_DIR/upload-sessions` (direktori 0700/berkas 0600); tidak ada URL publik. Pembatalan menghapus bagian; sesi kedaluwarsa dibersihkan saat admission baru dan tiap jam setelah upload pertama dalam proses. Saat proses mati, pembersihan berikutnya terjadi pada admission baru. Berkas hasil finalisasi dengan COMMIT tak pasti dipertahankan sampai rekonsiliasi DB tersedia; berkas buku yang sudah committed tidak dihapus.
- Implementasi upload ini khusus satu proses Node/satu host (lock bersama antar-route dalam proses dan storage persisten). Multi-replica memerlukan distributed locking/resumable object storage; bukan jaminan transfer berjalan saat browser ditutup. Tidak mengubah timeout atau konfigurasi proxy, dan bukan scan antivirus.
- Filename UUID dibuat server. Upload menolak PDF signature invalid, file encrypted/unreadable, MIME/ekstensi tak sesuai, ukuran melewati batas, serta kegagalan render sampul sebelum berkas disimpan. Jangan mengomit optional native packages canvas saat memasang dependency produksi.
- Berkas ada di `STORAGE_DIR/books` dan `STORAGE_DIR/covers`, permission direktori 0700/file 0600. Pastikan volume tetap ada sesudah restart dan termasuk backup privat.
- Jangan menautkan `storage/` langsung dari web server. PDF publik disajikan via route yang hanya mencari buku dengan status `published`; draft memerlukan sesi admin. Sampul draft juga privat.
- Set `STORAGE_DIR` absolut pada host jika working directory service tidak tetap. Jaga backup DB dan file dengan akses terbatas.
- `npm run db:migrate` menulis schema pada database target yang dipilih, berurutan dan atomik (`001-initial`, lalu `002-book-categories`). Migration yang sudah tercatat tidak dijalankan ulang. Pastikan target `DATABASE_URL` dan izin operasional sebelum menjalankannya; build tidak menerapkan migration.
- Upload disk lokal dirancang untuk satu host, bukan horizontal/serverless. Validasi format dan batas upload bukan antivirus; scan/isolasi malware dan worker pemrosesan belum disertakan.
- Public signup dinonaktifkan. `npm run admin:create` adalah alias seed bootstrap yang kredensial sementaranya ada di script sesuai instruksi Owner; rerun tidak mereset password akun existing.

## Kategori buku

Form tambah/edit menggunakan Combobox multi-select shadcn Base UI: tombol menampilkan kategori terpilih, sedangkan popup berisi pencarian dan daftar checkbox yang dapat digulir (hingga 240 px). Pencarian tetap di atas daftar, popup mengikuti lebar tombol dan ruang viewport, serta fokus kembali ke tombol saat ditutup. Ketik kategori baru lalu pilih **Tambahkan**; kategori baru beserta pilihan buku disimpan permanen ketika **Simpan cerita/Simpan perubahan** berhasil. Membatalkan form tidak membuat master kategori. Maksimal 20 kategori per buku, masing-masing 1–50 karakter; kategori bersifat opsional.

Migration `002-book-categories` membuat master `m_book_category` (unik tanpa membedakan huruf besar/kecil) dan relasi `tr_book_category`. Kategori lama dipisahkan berdasarkan koma lalu dihubungkan ke master; kolom teks lama tetap utuh untuk recovery, tetapi seluruh pembacaan kategori aktif menggunakan relasi. Kategori berisi koma yang dibuat melalui form baru tetap merupakan satu kategori, bukan dipecah lagi.

Buku, kategori baru, dan relasinya disimpan dalam satu transaksi. Melepas centang/hapus buku hanya menghapus relasi; master kategori tetap tersedia bagi buku berikutnya. Tidak ada endpoint penghapusan/rename master dalam lingkup ini. Akses tambah/edit tetap khusus admin dengan pemeriksaan origin existing.

**Aktivasi:** terapkan migration pada target yang telah diotorisasi sebelum menjalankan build ini sebagai server aktif. Jangan drop tabel kategori sebagai rollback setelah data baru ditulis. Jika perlu rollback aplikasi, ekspor master/relasi dan sinkronkan pilihan ke format legacy terlebih dahulu dengan prosedur operasional yang disetujui; kolom legacy hanya merekam data sebelum migration, bukan pilihan terbaru.

## Aset

Asset PNG yang ada dipertahankan sebagai file asli, dikelompokkan dalam `public/assets/{characters,controls,scenes}`. `docs/reference/index-original.html` menyimpan markup landing statis lama sebagai bahan referensi.

## Belum termasuk

Database/server/file backup production, akun admin nyata, deployment, scanning malware, impor bulk, pembaca PDF DRM, provisioning cloud storage, dan akun/progres pembaca.
