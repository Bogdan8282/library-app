document.addEventListener("DOMContentLoaded", function () {
  const bookList = document.getElementById("book-list");
  const searchInput = document.getElementById("search-input");

  let allFiles = [];

  const renderBooks = (files) => {
    if (files.length === 0) {
      bookList.innerHTML = "<p>Немає результатів за вашим запитом</p>";
      return;
    }

    const grouped = {};
    files.forEach((file) => {
      const genres = Array.isArray(file.genres)
        ? file.genres.map((g) => g.name).filter((name) => name && name.trim())
        : file.genres?.name
        ? [file.genres.name]
        : ["Інше"];

      if (genres.length === 0) {
        genres.push("Інше");
      }

      genres.forEach((genre) => {
        if (!grouped[genre]) {
          grouped[genre] = [];
        }
        grouped[genre].push(file);
      });
    });

    const genreSections = Object.entries(grouped)
      .map(([genre, books]) => {
        const booksHTML = books
          .map((file) => {
            const fileName = file.filename;
            const fileId = file._id;
            const cover = file.coverImagePath
              ? file.coverImagePath
              : "/default-cover.png";

            return `<div class="book-item rounded-lg">
                  <a class="book-link block h-full" href="/viewer/${encodeURIComponent(
                    fileId
                  )}">
                  <div class="flex flex-col px-2 py-4 justify-between h-full">
                    <img class="book-img mb-6 object-contain" src="${cover}" alt="cover" style="width:100%;height:auto;max-height:200px;">
                    <h3 class="book-title text-center my-auto">${fileName}</h3>
                  </div>
                  </a>
                </div>`;
          })
          .join("");

        return `
      <div class="genre-section w-full mb-12">
        <h2 class="text-2xl font-medium mb-4">${genre}</h2>
        <div class="book-grid w-full grid lg:grid-cols-5 md:grid-cols-4 sm:grid-cols-3 grid-cols-2 gap-6">
          ${booksHTML}
        </div>
      </div>`;
      })
      .join("");

    bookList.innerHTML = genreSections;
  };

  const filterBooks = (query) => {
    const words = query.trim().toLowerCase().split(/\s+/);
    const filtered = allFiles.filter((file) => {
      const title = file.filename?.toLowerCase() || "";
      const desc = file.description?.toLowerCase() || "";
      const author = file.author?.toLowerCase() || "";
      const genres = Array.isArray(file.genres)
        ? file.genres.map((g) => g.name.toLowerCase()).join(" ")
        : file.genres?.name?.toLowerCase() || "";

      return words.every(
        (word) =>
          title.includes(word) ||
          desc.includes(word) ||
          author.includes(word) ||
          genres.includes(word)
      );
    });
    renderBooks(filtered);
  };

  fetch("/api/uploads")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Не вдалося отримати список файлів");
      }
      return response.json();
    })
    .then((files) => {
      allFiles = files;
      renderBooks(allFiles);
    })
    .catch((error) => {
      console.error("Помилка:", error);
      bookList.innerHTML = `<p>Помилка завантаження списку файлів: ${error.message}</p>`;
    });

  searchInput.addEventListener("input", () => {
    filterBooks(searchInput.value);
  });
});
