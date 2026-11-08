# Link Jual buku

Kolom opsional **Link Jual** disimpan pada buku dan dapat diatur saat tambah maupun edit. Nilai kosong diterima; nilai terisi harus URL absolut `http` atau `https` maksimal 2048 karakter. Link ditampilkan admin serta dialog kode akses hanya untuk cerita terkunci, dan selalu dibuka di tab baru dengan `noopener noreferrer`.

Migration `004-book-sales-link.sql` menambahkan kolom `sales_link` dengan nilai default kosong untuk data lama. Migration dimasukkan ke urutan `scripts/migrate.ts`; jalankan hanya melalui prosedur deployment yang berlaku.
