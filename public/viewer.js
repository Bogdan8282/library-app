document.addEventListener("DOMContentLoaded", function () {
  const pdfContainer = document.getElementById("pdf-container");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const pageNumSpan = document.getElementById("page-num");
  const goToPageInput = document.getElementById("go-to-page-input");
  const goToPageBtn = document.getElementById("go-to-page-btn");
  const zoomOutBtn = document.getElementById("zoom-out");
  const zoomInBtn = document.getElementById("zoom-in");

  let pdfDoc = null;
  let pageNum = 1;
  let scale = 1.0;

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
  }

  async function loadPDF(url) {
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    renderPage(pageNum);
    pageNumSpan.textContent = `Сторінка ${pageNum} з ${pdfDoc.numPages}`;
  }

  prevPageBtn.addEventListener("click", () => {
    if (pageNum > 1) {
      pageNum--;
      renderPage(pageNum);
      pageNumSpan.textContent = `Сторінка ${pageNum} з ${pdfDoc.numPages}`;
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (pageNum < pdfDoc.numPages) {
      pageNum++;
      renderPage(pageNum);
      pageNumSpan.textContent = `Сторінка ${pageNum} з ${pdfDoc.numPages}`;
    }
  });

  goToPageBtn.addEventListener("click", () => {
    const targetPage = parseInt(goToPageInput.value);
    if (targetPage >= 1 && targetPage <= pdfDoc.numPages) {
      pageNum = targetPage;
      renderPage(pageNum);
      pageNumSpan.textContent = `Сторінка ${pageNum} з ${pdfDoc.numPages}`;
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

  const urlParams = new URLSearchParams(window.location.search);
  const pdfFile = window.pdfFilePath;

  if (pdfFile) {
    loadPDF(pdfFile);
  } else {
    pdfContainer.innerHTML = "<p>Помилка: Файл не вказано</p>";
  }
});
