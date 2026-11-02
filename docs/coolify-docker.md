# Deploy Pikso ke Coolify dengan Dockerfile

## Konfigurasi aplikasi

1. Buat resource aplikasi dari repository dengan **Build Pack: Dockerfile**.
2. Base directory `/`; Dockerfile location `/Dockerfile`; build context root repository.
3. Port internal **3000** (HTTP); arahkan domain HTTPS ke port ini lewat proxy Coolify. Tidak perlu publish port host 3000 atau menjalankan custom start command.
4. Gunakan **satu replica/proses**, satu host. Resumable upload memakai lock dalam proses dan disk lokal; jangan gunakan beberapa replica atau overlapping rolling deployment untuk trafik upload.
5. Isi environment **runtime** berikut di Coolify (bukan Docker build arguments):

| Variable | Nilai |
|---|---|
| `DATABASE_URL` | URL PostgreSQL yang dapat dijangkau dari network container |
| `BETTER_AUTH_URL` | Origin HTTPS publik sebenarnya, misalnya `https://pikso.example.com` |
| `BETTER_AUTH_SECRET` | Secret acak minimal 32 karakter; pertahankan nilainya antar-redeploy |
| `STORAGE_DIR` | `/app/storage` |

`PORT=3000`, `HOSTNAME=0.0.0.0`, `NODE_ENV=production` sudah diset dalam image. Jangan gunakan `localhost` untuk hostname database kecuali DB benar-benar berada dalam container yang sama (tidak dianjurkan). Gunakan alamat internal service PostgreSQL/network Coolify; URL-encode karakter khusus pada password. Ikuti kebutuhan TLS provider database.

Generate secret sendiri pada terminal tepercaya: `openssl rand -hex 32`. Jangan kirim nilainya ke chat atau Git. Mengganti secret dapat membatalkan sesi admin dan bukti akses cerita yang tersimpan.

Tidak ada credential produksi yang dibutuhkan saat build. `.dockerignore` mengecualikan `.env*` nyata, Git, `storage`, dependency lokal dan output build lokal. File contoh environment bukan rahasia. Jangan menyisipkan secrets melalui build arguments atau menonaktifkan ignore ini.

## Persistent storage (wajib)

Di **Persistent Storage** Coolify, tambahkan named volume dengan destination **`/app/storage`**. Path ini mencakup `books`, `covers`, dan `upload-sessions`. Jangan mount di `/app` atau `public`; jangan expose storage langsung dari proxy.

Image berjalan sebagai user `node` (**UID/GID 1000:1000**). Pastikan volume/bind mount dapat ditulis oleh UID/GID tersebut. Untuk bind mount atau volume existing, Owner/operator perlu menyiapkan ownership sesuai pada direktori target yang benar; jangan gunakan `chmod 777`. Direktori buku/sesi dibuat privat oleh aplikasi.

Redeploy tidak mengimpor buku lama otomatis. Migrasi host perlu memindahkan DB **dan** `books`/`covers` beserta metadata yang sesuai, dengan backup, penghentian penulisan dan prosedur yang disetujui. Volume kosong dengan DB lama akan menyebabkan file buku tidak ditemukan. Backup database dan volume secara konsisten, lalu uji restore. Jangan menyalin PDF produksi ke dalam image/Git.

## Database dan admin: bootstrap otomatis

Container menjalankan bootstrap otomatis **sebelum web server setiap kali container start**: migration `001-initial`, `002-book-categories`, `003-book-access-codes`, lalu `scripts/create-admin.ts`. Jika koneksi/migration/seed gagal, entrypoint berhenti dan server tidak menerima trafik. Migration memakai PostgreSQL advisory lock dan membaca `schema_migrations`, jadi startup berulang atau concurrent startup tidak menerapkan file yang sama dua kali. Seed memakai advisory lock sendiri: membuat admin hanya bila belum ada; jika akun admin dengan kredensial sudah ada, menjadi no-op dan **tidak mengganti password**.

Bootstrap memerlukan runtime `DATABASE_URL` dan `BETTER_AUTH_SECRET` valid sejak startup. Build image tidak mengakses DB, tidak menjalankan migration/seed, dan tidak membutuhkan production secrets.

**Peringatan kredensial:** script seed existing tetap memakai kredensial bootstrap lemah sebagaimana sebelumnya diminta Owner; password ini mudah ditebak. Akun tersebut hanya pantas untuk lingkungan terkendali/internal. Untuk deployment publik, sebelum startup pertama, ubah `ADMIN_EMAIL`, `ADMIN_NAME`, dan `ADMIN_PASSWORD` di `scripts/create-admin.ts`, gunakan kredensial rahasia yang kuat, lalu rebuild/deploy image. Bila akun bootstrap sudah dibuat, mengganti nilai dalam script **tidak merotasi password akun existing**; rotasi harus dilakukan terpisah sebelum akses publik.

Startup container menulis schema pada DB yang ditunjuk `DATABASE_URL` dan dapat membuat akun admin. Pastikan target database benar, backup tersedia, dan Tuan mengotorisasi deployment sebelum menautkan aplikasi ke database yang akan digunakan. Jangan arahkan container ke target yang salah.

## Healthcheck dan verifikasi setelah deploy

Dockerfile menyertakan HTTP liveness check `GET /` pada port internal. Jika Coolify memakai healthcheck sendiri, atur HTTP port `3000`, path `/`, status `200`. Ini hanya membuktikan proses hidup, **bukan** koneksi/schema DB atau volume sehat—katalog mempunyai fallback saat DB gagal.

Sebelum cutover publik, verifikasi:
- `/`, `/books`, `/characters`, `/about`, `/admin/login` serta aset CSS dan `/pdf.worker.min.mjs` dapat dimuat;
- login admin, pembacaan katalog/DB dan pembacaan PDF existing;
- upload PDF, pembuatan cover, simpan draft/publish sesuai otorisasi; pastikan file tetap ada setelah redeploy;
- kode akses cerita, PDF GET/HEAD/range, dan draft tidak dapat dibaca tanpa izin;
- proxy mendukung range/streaming dan body limits yang memadai (chunk upload 1 MiB; route multipart kompatibilitas maksimal 56 MiB); timeout finalisasi perlu cukup untuk render cover.

Tidak ada perubahan proxy, provisioning volume, atau deployment Coolify yang dilakukan hanya dengan menambahkan file ini.

## Build/smoke lokal opsional

```sh
docker build -t pikso:local .
docker run --rm --name pikso-local \
  --env-file /secure/path/pikso-runtime.env \
  -e STORAGE_DIR=/app/storage \
  -v pikso_local_storage:/app/storage \
  -p 127.0.0.1:3100:3000 pikso:local
```

Gunakan DB/volume pengujian yang terisolasi. Untuk mode Dockerfile Coolify cukup isi environment dan persistent storage pada panel; Docker Compose tidak diperlukan.
