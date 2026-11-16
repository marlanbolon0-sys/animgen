export default function Home() {
  const styles = ["Anime", "3D Render", "Realistic", "Cartoon", "Cyberpunk", "Watercolor"];
  const modes = [
    {
      title: "Text to Animation",
      desc: "Tulis prompt, AI ubah jadi video animasi",
    },
    {
      title: "Image to Animation",
      desc: "Upload gambar, AI gerakkan jadi video",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
          AI Video Generator
        </p>
        <h1 className="mt-3 text-5xl font-bold">
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            AnimGen
          </span>
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Ubah teks atau gambar jadi video pendek siap upload ke TikTok dan Reels.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {modes.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <h2 className="text-xl font-semibold">{m.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm font-semibold text-zinc-300">6 Gaya Animasi</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {styles.map((s) => (
              <span
                key={s}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm text-zinc-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-semibold text-zinc-300">Format dan Durasi</p>
          <p className="mt-2 text-sm text-zinc-400">
            Rasio 9:16 (vertikal), 1:1 (kotak), 16:9 (melebar). Durasi 5 detik =
            1 kredit, 10 detik = 2 kredit.
          </p>
        </div>

        <button
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-2xl bg-violet-600 px-6 py-4 text-lg font-semibold text-white opacity-60"
        >
          Mulai Generate (segera hadir)
        </button>

        <p className="mt-6 text-center text-xs text-zinc-500">
          AnimGen MVP - sedang dibangun, fitur dibuka bertahap
        </p>
      </div>
    </main>
  );
}