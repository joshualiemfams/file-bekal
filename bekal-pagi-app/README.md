# Bekal Pagi Mobile — Starter MVP

Starter project Next.js + Supabase untuk operasional member Bekal Pagi.

## Yang sudah disiapkan
- Dashboard UI responsif dengan contoh data (prototype/demo).
- Navigasi role Owner, Admin, Staff, Member untuk preview tampilan.
- Form konsep input barang masuk total per member.
- Form konsep input retur: pilih cabang, isi jumlah per menu, konfirmasi.
- Peringatan jika retur melebihi barang masuk, dengan pilihan konfirmasi.
- Preview dashboard member dengan retur dikelompokkan berdasarkan cabang.
- Preview hak member: Rp8.000/item + bonus Rp2.000 setiap kelipatan 5 item per hari.
- Halaman login email/password yang terhubung ke Supabase setelah env diisi.
- SQL schema awal termasuk 4 cabang, maksimal 4 menu/member, mapping menu-cabang, retur batch, keputusan Ambil Nanti/Sedekahkan, pembayaran, dan RLS.

## Penting — status saat ini
Ini adalah **starter/prototype**, belum aplikasi produksi. Dashboard utama masih memakai data contoh di browser; tombol simpan belum menulis data ke Supabase. Login sudah disiapkan tetapi butuh kredensial Supabase. Sebelum dipakai operasional, perlu menghubungkan seluruh form ke database, menerapkan autentikasi wajib, menguji RLS, dan melakukan uji hitung dengan data nyata.

## Menjalankan lokal
Butuh Node.js 20.9+ (disarankan Node 22 LTS atau lebih baru) dan npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000.

Isi `.env.local` dengan URL dan anon key dari Supabase project khusus aplikasi ini.

## Menyiapkan Supabase
1. Buat project Supabase baru.
2. Buka SQL Editor.
3. Jalankan seluruh isi `supabase/schema.sql`.
4. Buat akun Owner melalui Supabase Authentication.
5. Salin UUID user Owner dari Authentication > Users.
6. Jalankan SQL berikut dengan UUID yang benar:

```sql
update public.profiles
set role = 'owner'
where id = 'UUID-AKUN-OWNER';
```

7. Isi `.env.local` dengan Project URL dan anon/public key.

**Jangan pernah memasukkan service_role key ke frontend atau mengirimkannya ke siapa pun.**

## Aturan bisnis yang sudah dimasukkan ke rancangan
- Barang masuk: satu total per member per tanggal, tidak dirinci per menu.
- Barang kembali: per menu dan per cabang.
- Cabang: Pejanggik, Jempong, Ampenan, Abian Tubuh.
- Satu produk milik satu member dapat tersedia di banyak cabang.
- Maksimal 4 menu aktif per member.
- Retur yang dikonfirmasi otomatis terhubung ke member pemilik menu.
- Member dapat melihat retur per cabang.
- Keputusan retur: Menunggu keputusan, Ambil Nanti, Sedekahkan. Tidak ada status Sudah Diambil.
- Hak member: Rp8.000 per item terjual + bonus Rp2.000 untuk setiap kelipatan 5 item terjual per hari. Bonus direset setiap hari.
- Jika total retur lebih besar dari total bawaan, sistem meminta konfirmasi. Selisih tetap dapat disimpan untuk ditinjau.
- Tidak ada pencatatan omzet/kasir.
- Owner/Admin input barang masuk dan mencatat pembayaran. Owner/Admin/Staff dapat input retur.
- Staff tidak mendapat akses ke pembayaran member.

## Catatan logika pembayaran
Jika retur lebih besar dari bawaan, total terjual tetap negatif untuk transparansi selisih. Untuk hak pembayaran, jumlah unit dibatasi minimum nol agar sistem tidak menghasilkan hak pembayaran negatif. Kasus selisih harus diperiksa Owner.

## Deployment
Project dapat di-push ke GitHub lalu di-import ke Vercel. Tambahkan environment variables Supabase yang sama di Vercel. Jangan deploy untuk penggunaan nyata sebelum integrasi data dan pemeriksaan keamanan selesai.


Branding: the app uses the supplied Bekal Pagi logo in `public/bekal-pagi-logo.jpg` and a warm cream, egg-yellow, orange, and cocoa color palette.


## Rekap pembayaran member
Aplikasi menghitung total hak pembayaran per member dan menyediakan halaman Rekap Pembayaran yang dapat dicetak atau disimpan sebagai PDF melalui dialog cetak browser. Transfer bank dilakukan di luar aplikasi oleh admin menggunakan token bank; aplikasi tidak menyimpan token atau menjalankan transfer.


## Akun member (pendaftaran mandiri)
1. Jalankan `supabase/member-registration-migration.sql` di SQL Editor Supabase.
2. Di Authentication > URL Configuration, pastikan Site URL dan Redirect URLs memuat alamat aplikasi (misalnya `http://localhost:3000/**` untuk lokal).
3. Aktifkan verifikasi email sesuai kebijakan yang diinginkan.
4. Member membuka `/daftar`, mengisi nama sesuai data member, email, dan password.
5. Trigger database otomatis membuat profil dengan role `member` dan `member_id` kosong. Akun belum terhubung dan belum boleh melihat data operasional sampai Owner memasangkannya.

Penting: migrasi ini mengasumsikan tabel `profiles` memiliki kolom `user_id`, `full_name`, `role`, `member_id`, dan fungsi `public.is_owner_or_admin()` sudah ada. Cocokkan dengan skema aktif sebelum menjalankan.


## Menghubungkan akun member ke data member
1. Jalankan `supabase/member-account-linking-migration.sql` di SQL Editor Supabase setelah migrasi pendaftaran sebelumnya. Migrasi ini menambahkan email pada profil dan memastikan satu data member hanya dapat dipasangkan ke satu akun member.
2. Login sebagai Owner, buka **Data Member & Menu**.
3. Pada bagian **Akun member menunggu dihubungkan**, pilih data member yang cocok dengan nama pendaftar lalu klik **Hubungkan akun**.
4. Data member yang sudah memiliki akun tidak akan muncul lagi sebagai pilihan untuk akun lain.
5. Member dapat login menggunakan email dan password setelah Owner menghubungkan akunnya. Jika sudah login sebelum dihubungkan, member perlu keluar lalu login kembali agar profil terbaru dimuat.

Jangan bagikan `service_role` key ke aplikasi browser. Aplikasi hanya menggunakan Supabase publishable/anon key.


## Perubahan input barang masuk (versi terbaru)
- Barang masuk dicatat satu baris per member dengan jumlah untuk Pejanggik, Jempong, Ampenan, dan Abian Tubuh.
- Barang kembali tetap dicatat per menu dan cabang.
- Terjual dan pembayaran dihitung dari total barang masuk dikurangi total barang kembali.
- Sebelum deploy versi ini, jalankan `supabase/member-delivery-migration.sql` di Supabase SQL Editor.
- Migrasi mempertahankan transaksi lama. Pada tanggal/member yang sudah memiliki input baru, total cabang baru menggantikan total cabang lama per-menu; transaksi Online lama tetap dihitung.
