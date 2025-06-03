document.addEventListener("DOMContentLoaded", function () {
  const pdfContainer = document.getElementById("pdf-container");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const pageNumSpan = document.getElementById("page-num");
  const goToPageInput = document.getElementById("go-to-page-input");
  const goToPageBtn = document.getElementById("go-to-page-btn");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomInBtn = document.getElementById("zoom-in");
  const bookmarkBtn = document.getElementById("bookmark-btn");
  const removeBookmarkBtn = document.getElementById("remove-bookmark-btn");

  let pdfDoc = null;
  let pageNum = 1;
  let scale = 1.0;

  const pdfFile = window.pdfFilePath;
  const bookmarkKey = `bookmark_${pdfFile}`;

  function updatePageDisplay() {
    pageNumSpan.textContent = `Сторінка ${pageNum} з ${pdfDoc.numPages}`;
  }

  async function renderPage(num) {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement("canvas");
    const canvasContext = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    pdfContainer.innerHTML = "";
    pdfContainer.appendChild(canvas);
    const renderContext = {
      canvasContext,
      viewport,
    };
    await page.render(renderContext);
    updatePageDisplay();
    updateBookmarkButtons();
  }

  async function loadPDF(url) {
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;

    const savedBookmark = parseInt(localStorage.getItem(bookmarkKey));
    if (
      savedBookmark &&
      savedBookmark >= 1 &&
      savedBookmark <= pdfDoc.numPages
    ) {
      pageNum = savedBookmark;
    }

    renderPage(pageNum);
  }

  function updateBookmarkButtons() {
    const currentBookmark = parseInt(localStorage.getItem(bookmarkKey));
    if (currentBookmark === pageNum) {
      bookmarkBtn.style.display = "none";
      removeBookmarkBtn.style.display = "inline-block";
    } else {
      bookmarkBtn.style.display = "inline-block";
      removeBookmarkBtn.style.display = "none";
    }
  }

  prevPageBtn.addEventListener("click", () => {
    if (pageNum > 1) {
      pageNum--;
      renderPage(pageNum);
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (pageNum < pdfDoc.numPages) {
      pageNum++;
      renderPage(pageNum);
    }
  });

  goToPageBtn.addEventListener("click", () => {
    const targetPage = parseInt(goToPageInput.value);
    if (targetPage >= 1 && targetPage <= pdfDoc.numPages) {
      pageNum = targetPage;
      renderPage(pageNum);
    }
  });

  zoomOutBtn.addEventListener("click", () => {
    if (scale > 0.25) {
      scale -= 0.25;
      renderPage(pageNum);
    }
  });

  zoomInBtn.addEventListener("click", () => {
    if (scale < 3) {
      scale += 0.25;
      renderPage(pageNum);
    }
  });

  bookmarkBtn.addEventListener("click", () => {
    localStorage.setItem(bookmarkKey, pageNum);
    updateBookmarkButtons();
  });

  removeBookmarkBtn.addEventListener("click", () => {
    localStorage.removeItem(bookmarkKey);
    updateBookmarkButtons();
  });

  if (pdfFile) {
    loadPDF(pdfFile);
  } else {
    pdfContainer.innerHTML = "<p>Помилка: Файл не вказано</p>";
  }
});
