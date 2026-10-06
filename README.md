# DeadlineRadar

DeadlineRadar adalah aplikasi pelacak tugas dan tenggat waktu perkuliahan yang dirancang dengan prinsip minimalis, fungsional, dan berpusat pada data. Aplikasi ini beroperasi 100% secara luring untuk memastikan privasi pengguna melalui penyimpanan lokal (local storage), tanpa memerlukan koneksi ke server, basis data eksternal, atau pembuatan akun.

## Fitur Utama

- **Manajemen Tugas Sederhana:** Tambah, perbarui, dan tandai tugas selesai dengan cepat. Tenggat waktu diproses secara presisi menggunakan format waktu lokal.
- **Penyimpanan Lokal:** Seluruh data disimpan dengan aman di peramban pengguna menggunakan `localStorage` dengan kunci `deadlineradar:tasks:v1`.
- **Dasbor Analitik:** Menampilkan metrik urgensi tugas, grafik beban kerja mingguan, dan persentase progres penyelesaian per mata kuliah.
- **Pencarian dan Filter Cerdas:** Filter tugas berdasarkan status, mata kuliah, serta pengurutan berdasarkan tenggat waktu terdekat.
- **Pencadangan Data (Impor/Ekspor):** Memungkinkan pengguna untuk mengamankan data dengan mengekspor seluruh tugas ke format JSON dan mengimpornya kembali ke perangkat lain.
- **Desain Murni Fungsional:** Antarmuka berbahasa Indonesia yang bersih, tanpa ornamen berlebih (tanpa gradien/bayangan berlebih), menggunakan aksen warna tunggal (Teal - `#0F766E`).

## Tumpukan Teknologi

Proyek ini dibangun tanpa *router* atau sistem *backend*, berfokus pada kecepatan dan kesederhanaan eksekusi sisi klien (client-side).

- **Framework:** React 19 + Vite JS (JavaScript murni)
- **Styling:** Tailwind CSS
- **Ikon:** Lucide React (satu-satunya dependensi eksternal untuk UI)
- **Pengujian:** Vitest + React Testing Library

## Panduan Instalasi Lokal

Pastikan Anda telah menginstal Node.js di sistem Anda.

1. Klon repositori ini ke mesin lokal Anda.
2. Buka terminal di direktori proyek dan instal dependensi:
   ```bash
   npm install