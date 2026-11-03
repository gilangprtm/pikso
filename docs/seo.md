# SEO publik Pikso

## Yang disediakan aplikasi

- Judul/deskripsi berbeda untuk beranda, katalog cerita, karakter, profil Nana dan setiap detail cerita.
- Self-canonical dan Open Graph/Twitter pada halaman publik yang dapat diindeks.
- `Organization` dan `WebSite` JSON-LD untuk identitas Pikso Studio.
- `/robots.txt` dan `/sitemap.xml`; sitemap membaca semua cerita `published`, bukan hanya 12 cerita pada halaman pertama. Detail draft dan URL pembaca tidak dimasukkan.
- Halaman admin/login dan reader noindex. Reader tetap dapat di-crawl agar Google dapat membaca instruksi noindex; konten PDF/reader tidak masuk sitemap.
- Favicon Pikso, Apple touch icon dan OG brand image.

Metadata, domain, robots dan sitemap memakai runtime config. Nilai build lokal dan forwarded `Host` header tidak menentukan identitas indexable.

## Production configuration (owner/operator)

Tuan telah mengonfirmasi domain resmi **pikso.my.id**. Origin canonical production adalah **https://pikso.my.id** (tanpa `www`). Konfirmasi ini menetapkan identitas domain, bukan bukti DNS/TLS atau deployment sudah siap.

Di runtime Coolify, setelah domain tersebut diarahkan ke deployment publik yang siap:

```env
SITE_URL=https://pikso.my.id
SITE_INDEXING=on
```

Jangan gunakan `pikso.com` dari screenshot atau domain development sebagai canonical production. `BETTER_AUTH_URL` tidak otomatis dijadikan canonical. `SITE_URL` harus hanya origin HTTPS tanpa user/password, path, query, atau fragment. `SITE_INDEXING=off` mematikan indexing tanpa mengubah auth.

Tanpa konfigurasi valid, aplikasi sengaja fail closed: meta robots `noindex`, `robots.txt` menolak semua crawler, structured data/canonical/social absolute URLs tidak diberikan, sitemap kosong. Ini mencegah host development/staging masuk indeks. Perubahan nilai `.env`/Coolify tidak termasuk perubahan source; atur dan verifikasi melalui otorisasi operasi yang berlaku. Jangan set `on` sampai domain resmi mengarah ke situs publik yang siap.

## Google Search Console

1. Verifikasi ownership domain atau URL-prefix property melalui Google Search Console. Verification token/property harus berasal dari akun Owner; belum ditambahkan ke source karena token/verifikasi tidak tersedia.
2. Setelah runtime memakai domain resmi dan `SITE_INDEXING=on`, periksa `https://pikso.my.id/robots.txt` dan `https://pikso.my.id/sitemap.xml` via HTTPS. Pastikan sitemap terbuka tanpa login/proxy challenge dan URL setiap halaman memakai origin resmi.
3. Kirim URL sitemap di Search Console. Gunakan URL inspection untuk beranda, katalog dan detail cerita terbit; pilih request indexing sesuai kebutuhan.
4. Gunakan Search Console Pages/Crawl stats untuk melihat status serta error; cek rendering/canonical melalui URL Inspection. Google menentukan sendiri apakah dan kapan URL tampil, judul/snippet dapat ditulis ulang.
5. Jangan ajukan deployment/dev origin atau mengirim token/verifikasi privat ke Git/chat.

Structured data memperjelas identitas, bukan menjamin rich result. Tidak ada klaim peningkatan ranking, jumlah impression, atau tanggal indexing.
