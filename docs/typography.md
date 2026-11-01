# Tipografi Nana

Situs menggunakan dua keluarga font untuk menjaga konsistensi visual. Definisi token berada di `src/app/globals.css` dan berlaku global.

| Peran | Font | Penggunaan |
| --- | --- | --- |
| Heading / display | Manrope | H1–H6, judul halaman, judul buku, nama brand |
| Body / UI | DM Sans | Subtitle, paragraf/deskripsi, metadata, navigasi, tombol, label, input, dan teks antarmuka lain |

Gunakan `var(--font-heading)` untuk heading dan `var(--font-body)` untuk teks selain heading. Jangan menambahkan font keluarga ketiga atau deklarasi serif dekoratif tanpa keputusan desain baru. Bobot, ukuran, line-height, dan jarak tetap ditentukan komponen/layout masing-masing; aturan keluarga font ini tidak dengan sendirinya mengubah skala tipografi.
