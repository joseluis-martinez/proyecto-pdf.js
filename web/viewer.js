/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RenderingStates, ScrollMode, SpreadMode } from "./ui_utils.js";
import { AppOptions } from "./app_options.js";
import { LinkTarget } from "./pdf_link_service.js";
import { PDFViewerApplication } from "./app.js";

const AppConstants =
  typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
    ? { LinkTarget, RenderingStates, ScrollMode, SpreadMode }
    : null;

window.PDFViewerApplication = PDFViewerApplication;
window.PDFViewerApplicationConstants = AppConstants;
window.PDFViewerApplicationOptions = AppOptions;

/* ========== CONFIGURACIÓN INDEXEDDB ========== */
const DB_NAME = "PDFCommentsDB";
const DB_VERSION = 1;
let db = null;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('comments')) {
        db.createObjectStore('comments', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("Error al abrir IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
};

async function showCommentDialog(initialText = "") {
  return new Promise((resolve) => {
    // 1. Estructura del modal
    const wrapper = document.createElement("div");
    wrapper.id = "commentDialog";
    wrapper.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 2000;
    `;
    wrapper.innerHTML = `
      <div style="
        background:#fff; padding:16px; border-radius:6px;
        max-width:90%; width:400px; box-shadow:0 2px 8px rgba(0,0,0,.3);
      ">
        <textarea id="commentInput" rows="6" style="width:100%;resize:vertical;">${initialText}</textarea>
        <div style="text-align:right; margin-top:8px;">
          <button id="commentCancel">Cancelar</button>
          <button id="commentOk">Aceptar</button>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    const $ok = wrapper.querySelector("#commentOk");
    const $cancel = wrapper.querySelector("#commentCancel");
    const $input = wrapper.querySelector("#commentInput");
    $input.focus();

    // 2. handlers
    const close = (val) => {
      document.body.removeChild(wrapper);
      resolve(val);          // puede ser string o null
    };
    $ok.addEventListener("click", () => close($input.value.trim() || null));
    $cancel.addEventListener("click", () => close(null));
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter" && e.ctrlKey) close($input.value.trim() || null);
    });
  });
}

async function saveComment(comment) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('comments', 'readwrite');
    const store = tx.objectStore('comments');
    const request = store.put(comment);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getAllComments() {
  const tx = db.transaction('comments', 'readonly');
  const store = tx.objectStore('comments');
  return new Promise((resolve) => {
    store.getAll().onsuccess = (event) => resolve(event.target.result || []);
  });
}

async function getCommentById(id) {
  const tx = db.transaction('comments', 'readonly');
  const store = tx.objectStore('comments');
  return new Promise((resolve) => {
    store.get(id).onsuccess = (event) => resolve(event.target.result);
  });
}

async function updateComment(comment) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('comments', 'readwrite');
    const store = tx.objectStore('comments');
    const request = store.put(comment); // <- "put" es para editar

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function deleteComment(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('comments', 'readwrite');
    const store = tx.objectStore('comments');
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// fin database

function getViewerConfiguration() {
  return {
    appContainer: document.body,
    principalContainer: document.getElementById("mainContainer"),
    mainContainer: document.getElementById("viewerContainer"),
    viewerContainer: document.getElementById("viewer"),
    toolbar: {
      container: document.getElementById("toolbarContainer"),
      numPages: document.getElementById("numPages"),
      pageNumber: document.getElementById("pageNumber"),
      scaleSelect: document.getElementById("scaleSelect"),
      customScaleOption: document.getElementById("customScaleOption"),
      previous: document.getElementById("previous"),
      next: document.getElementById("next"),
      zoomIn: document.getElementById("zoomInButton"),
      zoomOut: document.getElementById("zoomOutButton"),
      print: document.getElementById("printButton"),
      editorFreeTextButton: document.getElementById("editorFreeTextButton"),
      editorFreeTextParamsToolbar: document.getElementById(
        "editorFreeTextParamsToolbar"
      ),
      editorHighlightButton: document.getElementById("editorHighlightButton"),
      editorHighlightParamsToolbar: document.getElementById(
        "editorHighlightParamsToolbar"
      ),
      editorHighlightColorPicker: document.getElementById(
        "editorHighlightColorPicker"
      ),
      editorInkButton: document.getElementById("editorInkButton"),
      editorInkParamsToolbar: document.getElementById("editorInkParamsToolbar"),
      editorStampButton: document.getElementById("editorStampButton"),
      editorStampParamsToolbar: document.getElementById(
        "editorStampParamsToolbar"
      ),
      editorSignatureButton: document.getElementById("editorSignatureButton"),
      editorSignatureParamsToolbar: document.getElementById(
        "editorSignatureParamsToolbar"
      ),
      download: document.getElementById("downloadButton"),
    },
    secondaryToolbar: {
      toolbar: document.getElementById("secondaryToolbar"),
      toggleButton: document.getElementById("secondaryToolbarToggleButton"),
      presentationModeButton: document.getElementById("presentationMode"),
      openFileButton:
        typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")
          ? document.getElementById("secondaryOpenFile")
          : null,
      printButton: document.getElementById("secondaryPrint"),
      downloadButton: document.getElementById("secondaryDownload"),
      viewBookmarkButton: document.getElementById("viewBookmark"),
      firstPageButton: document.getElementById("firstPage"),
      lastPageButton: document.getElementById("lastPage"),
      pageRotateCwButton: document.getElementById("pageRotateCw"),
      pageRotateCcwButton: document.getElementById("pageRotateCcw"),
      cursorSelectToolButton: document.getElementById("cursorSelectTool"),
      cursorHandToolButton: document.getElementById("cursorHandTool"),
      scrollPageButton: document.getElementById("scrollPage"),
      scrollVerticalButton: document.getElementById("scrollVertical"),
      scrollHorizontalButton: document.getElementById("scrollHorizontal"),
      scrollWrappedButton: document.getElementById("scrollWrapped"),
      spreadNoneButton: document.getElementById("spreadNone"),
      spreadOddButton: document.getElementById("spreadOdd"),
      spreadEvenButton: document.getElementById("spreadEven"),
      imageAltTextSettingsButton: document.getElementById(
        "imageAltTextSettings"
      ),
      imageAltTextSettingsSeparator: document.getElementById(
        "imageAltTextSettingsSeparator"
      ),
      documentPropertiesButton: document.getElementById("documentProperties"),
    },
    sidebar: {
      // Divs (and sidebar button)
      outerContainer: document.getElementById("outerContainer"),
      sidebarContainer: document.getElementById("sidebarContainer"),
      toggleButton: document.getElementById("sidebarToggleButton"),
      resizer: document.getElementById("sidebarResizer"),
      // Buttons
      thumbnailButton: document.getElementById("viewThumbnail"),
      outlineButton: document.getElementById("viewOutline"),
      attachmentsButton: document.getElementById("viewAttachments"),
      layersButton: document.getElementById("viewLayers"),
      // Views
      thumbnailView: document.getElementById("thumbnailView"),
      outlineView: document.getElementById("outlineView"),
      attachmentsView: document.getElementById("attachmentsView"),
      layersView: document.getElementById("layersView"),
      // View-specific options
      currentOutlineItemButton: document.getElementById("currentOutlineItem"),
    },
    findBar: {
      bar: document.getElementById("findbar"),
      toggleButton: document.getElementById("viewFindButton"),
      findField: document.getElementById("findInput"),
      highlightAllCheckbox: document.getElementById("findHighlightAll"),
      caseSensitiveCheckbox: document.getElementById("findMatchCase"),
      matchDiacriticsCheckbox: document.getElementById("findMatchDiacritics"),
      entireWordCheckbox: document.getElementById("findEntireWord"),
      findMsg: document.getElementById("findMsg"),
      findResultsCount: document.getElementById("findResultsCount"),
      findPreviousButton: document.getElementById("findPreviousButton"),
      findNextButton: document.getElementById("findNextButton"),
    },
    passwordOverlay: {
      dialog: document.getElementById("passwordDialog"),
      label: document.getElementById("passwordText"),
      input: document.getElementById("password"),
      submitButton: document.getElementById("passwordSubmit"),
      cancelButton: document.getElementById("passwordCancel"),
    },
    documentProperties: {
      dialog: document.getElementById("documentPropertiesDialog"),
      closeButton: document.getElementById("documentPropertiesClose"),
      fields: {
        fileName: document.getElementById("fileNameField"),
        fileSize: document.getElementById("fileSizeField"),
        title: document.getElementById("titleField"),
        author: document.getElementById("authorField"),
        subject: document.getElementById("subjectField"),
        keywords: document.getElementById("keywordsField"),
        creationDate: document.getElementById("creationDateField"),
        modificationDate: document.getElementById("modificationDateField"),
        creator: document.getElementById("creatorField"),
        producer: document.getElementById("producerField"),
        version: document.getElementById("versionField"),
        pageCount: document.getElementById("pageCountField"),
        pageSize: document.getElementById("pageSizeField"),
        linearized: document.getElementById("linearizedField"),
      },
    },
    altTextDialog: {
      dialog: document.getElementById("altTextDialog"),
      optionDescription: document.getElementById("descriptionButton"),
      optionDecorative: document.getElementById("decorativeButton"),
      textarea: document.getElementById("descriptionTextarea"),
      cancelButton: document.getElementById("altTextCancel"),
      saveButton: document.getElementById("altTextSave"),
    },
    newAltTextDialog: {
      dialog: document.getElementById("newAltTextDialog"),
      title: document.getElementById("newAltTextTitle"),
      descriptionContainer: document.getElementById(
        "newAltTextDescriptionContainer"
      ),
      textarea: document.getElementById("newAltTextDescriptionTextarea"),
      disclaimer: document.getElementById("newAltTextDisclaimer"),
      learnMore: document.getElementById("newAltTextLearnMore"),
      imagePreview: document.getElementById("newAltTextImagePreview"),
      createAutomatically: document.getElementById(
        "newAltTextCreateAutomatically"
      ),
      createAutomaticallyButton: document.getElementById(
        "newAltTextCreateAutomaticallyButton"
      ),
      downloadModel: document.getElementById("newAltTextDownloadModel"),
      downloadModelDescription: document.getElementById(
        "newAltTextDownloadModelDescription"
      ),
      error: document.getElementById("newAltTextError"),
      errorCloseButton: document.getElementById("newAltTextCloseButton"),
      cancelButton: document.getElementById("newAltTextCancel"),
      notNowButton: document.getElementById("newAltTextNotNow"),
      saveButton: document.getElementById("newAltTextSave"),
    },
    altTextSettingsDialog: {
      dialog: document.getElementById("altTextSettingsDialog"),
      createModelButton: document.getElementById("createModelButton"),
      aiModelSettings: document.getElementById("aiModelSettings"),
      learnMore: document.getElementById("altTextSettingsLearnMore"),
      deleteModelButton: document.getElementById("deleteModelButton"),
      downloadModelButton: document.getElementById("downloadModelButton"),
      showAltTextDialogButton: document.getElementById(
        "showAltTextDialogButton"
      ),
      altTextSettingsCloseButton: document.getElementById(
        "altTextSettingsCloseButton"
      ),
      closeButton: document.getElementById("altTextSettingsCloseButton"),
    },
    addSignatureDialog: {
      dialog: document.getElementById("addSignatureDialog"),
      panels: document.getElementById("addSignatureActionContainer"),
      typeButton: document.getElementById("addSignatureTypeButton"),
      typeInput: document.getElementById("addSignatureTypeInput"),
      drawButton: document.getElementById("addSignatureDrawButton"),
      drawSVG: document.getElementById("addSignatureDraw"),
      drawPlaceholder: document.getElementById("addSignatureDrawPlaceholder"),
      drawThickness: document.getElementById("addSignatureDrawThickness"),
      imageButton: document.getElementById("addSignatureImageButton"),
      imageSVG: document.getElementById("addSignatureImage"),
      imagePlaceholder: document.getElementById("addSignatureImagePlaceholder"),
      imagePicker: document.getElementById("addSignatureFilePicker"),
      imagePickerLink: document.getElementById("addSignatureImageBrowse"),
      description: document.getElementById("addSignatureDescription"),
      clearButton: document.getElementById("clearSignatureButton"),
      saveContainer: document.getElementById("addSignatureSaveContainer"),
      saveCheckbox: document.getElementById("addSignatureSaveCheckbox"),
      errorBar: document.getElementById("addSignatureError"),
      errorCloseButton: document.getElementById("addSignatureErrorCloseButton"),
      cancelButton: document.getElementById("addSignatureCancelButton"),
      addButton: document.getElementById("addSignatureAddButton"),
    },
    editSignatureDialog: {
      dialog: document.getElementById("editSignatureDescriptionDialog"),
      description: document.getElementById("editSignatureDescription"),
      editSignatureView: document.getElementById("editSignatureView"),
      cancelButton: document.getElementById("editSignatureCancelButton"),
      updateButton: document.getElementById("editSignatureUpdateButton"),
    },
    annotationEditorParams: {
      editorFreeTextFontSize: document.getElementById("editorFreeTextFontSize"),
      editorFreeTextColor: document.getElementById("editorFreeTextColor"),
      editorInkColor: document.getElementById("editorInkColor"),
      editorInkThickness: document.getElementById("editorInkThickness"),
      editorInkOpacity: document.getElementById("editorInkOpacity"),
      editorStampAddImage: document.getElementById("editorStampAddImage"),
      editorSignatureAddSignature: document.getElementById(
        "editorSignatureAddSignature"
      ),
      editorFreeHighlightThickness: document.getElementById(
        "editorFreeHighlightThickness"
      ),
      editorHighlightShowAll: document.getElementById("editorHighlightShowAll"),
    },
    printContainer: document.getElementById("printContainer"),
    editorUndoBar: {
      container: document.getElementById("editorUndoBar"),
      message: document.getElementById("editorUndoBarMessage"),
      undoButton: document.getElementById("editorUndoBarUndoButton"),
      closeButton: document.getElementById("editorUndoBarCloseButton"),
    },
  };
}

function webViewerLoad() {
  const config = getViewerConfiguration();

  if (typeof PDFJSDev !== "undefined" && PDFJSDev.test("GENERIC")) {
    // Give custom implementations of the default viewer a simpler way to
    // set various `AppOptions`, by dispatching an event once all viewer
    // files are loaded but *before* the viewer initialization has run.
    const event = new CustomEvent("webviewerloaded", {
      bubbles: true,
      cancelable: true,
      detail: {
        source: window,
      },
    });
    try {
      // Attempt to dispatch the event at the embedding `document`,
      // in order to support cases where the viewer is embedded in
      // a *dynamically* created <iframe> element.
      parent.document.dispatchEvent(event);
    } catch (ex) {
      // The viewer could be in e.g. a cross-origin <iframe> element,
      // fallback to dispatching the event at the current `document`.
      console.error("webviewerloaded:", ex);
      document.dispatchEvent(event);
    }
  }
  PDFViewerApplication.run(config);
}

// Block the "load" event until all pages are loaded, to ensure that printing
// works in Firefox; see https://bugzilla.mozilla.org/show_bug.cgi?id=1618553
document.blockUnblockOnload?.(true);

if (
  document.readyState === "interactive" ||
  document.readyState === "complete"
) {
  webViewerLoad();
} else {
  document.addEventListener("DOMContentLoaded", webViewerLoad, true);
}

/* === MODO COMENTARIOS – estado global === */
let commentModeActive = false;

/* El botón de la toolbar debe tener id="toggleCommentMode" */
const commentButton = document.querySelector(".toggleCommentMode");

if (commentButton) {
  commentButton.addEventListener("click", () => {
    commentModeActive = !commentModeActive;                 // toggle
    commentButton.classList.toggle("toggled", commentModeActive);
  });
}



/* ========== LÓGICA DE COMENTARIOS ========== */
function highlightText(position, pageNumber) {
  // Limpiar resaltados anteriores
  document.querySelectorAll('.text-highlight').forEach(el => el.remove());

  const pageElement = document.querySelector(`.page[data-page-number="${pageNumber}"]`);
  if (!pageElement) return;

  const viewport = pageElement.querySelector('.canvasWrapper canvas')?.getContext('2d')?.canvas?.viewport;
  const scale = PDFViewerApplication.pdfViewer.currentScale; // escala actual del visor

  // Crear un resaltado tipo caja, con alto y ancho proporcional al zoom
  const highlight = document.createElement('div');
  highlight.className = 'text-highlight';
  Object.assign(highlight.style, {
    position: 'absolute',
    left: `${position.x * scale}px`,
    top: `${position.y * scale}px`,
    width: `${position.width * scale}px`,
    height: `${position.height * scale}px`, // ahora cubre toda la altura seleccionada
    backgroundColor: 'rgba(255, 230, 100, 0.4)',
    borderRadius: '3px',
    pointerEvents: 'none'
  });

  // Agregar resaltado al DOM
  const textLayer = pageElement.querySelector('.textLayer');
  if (textLayer) {
    textLayer.appendChild(highlight);
    setTimeout(() => highlight.remove(), 15000);
  }
}

async function renderCommentsList() {
  try {
    const comments = await getAllComments();
    const list = document.getElementById('commentsList');
    list.innerHTML = comments.map(comment => `
      <li data-id="${comment.id}">
        <strong>Pág. ${comment.pageNumber}:</strong> ${comment.text}
        <button class="edit-comment">Editar</button>
        <button class="delete-comment">Eliminar</button>
      </li>
    `).join('');

    list.querySelectorAll('li').forEach(item => {
      const commentId = parseInt(item.dataset.id);

      item.querySelector('.edit-comment').addEventListener('click', async () => {
        const originalComment = await getCommentById(commentId);
        const newText = await showCommentDialog(originalComment.text);
        if (newText && newText.trim() !== "") {
          originalComment.text = newText.trim();
          await updateComment(originalComment);
          renderCommentsList();
        }
      });

      item.querySelector('.delete-comment').addEventListener('click', async () => {
        const confirmed = confirm("¿Estás seguro de que querés eliminar este comentario?");
        if (confirmed) {
          await deleteComment(commentId);
          renderCommentsList();
        }
      });

      // Al hacer click en el comentario (no en los botones), ir al texto
      item.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-comment') || e.target.classList.contains('delete-comment')) return;

        const comment = await getCommentById(commentId);
        PDFViewerApplication.page = comment.pageNumber;

        setTimeout(() => {
          highlightText(comment.position, comment.pageNumber);
          const pageElement = document.querySelector(`.page[data-page-number="${comment.pageNumber}"]`);
          if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      });
    });
  } catch (error) {
    console.error("Error renderizando comentarios:", error);
  }
}

document.addEventListener('mouseup', async () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  if (!commentModeActive) return;   // IGNORAR si no está activo el modo comentario
  if (!selectedText) return;

  const range = selection.getRangeAt(0);
  const pageElement = range.startContainer.parentElement.closest('.page');
  if (!pageElement) return;

  const textLayer = pageElement.querySelector('.textLayer');
  const textLayerRect = textLayer.getBoundingClientRect();
  const rangeRect = range.getBoundingClientRect();

  const scale = pageElement.dataset.scale
    ? parseFloat(pageElement.dataset.scale)
    : PDFViewerApplication.pdfViewer._currentScale; // backup

  // Coordenadas relativas a la capa de texto y escala del PDF
  const position = {
    x: (rangeRect.left - textLayerRect.left) / scale,
    y: (rangeRect.top - textLayerRect.top) / scale,
    width: rangeRect.width / scale,
    height: rangeRect.height / scale
  };

  
  const commentText = await showCommentDialog();
  if (commentText) {
    await saveComment({
      id: Date.now(),
      text: commentText,
      pageNumber: parseInt(pageElement.dataset.pageNumber),
      position,
      selectedText
    });
    renderCommentsList();
  }
});

/* ===== TOGGLE PANEL DE COMENTARIOS ===== */
function setupCommentsPanelToggle() {
  const toggleButton = document.getElementById('toggleCommentsPanel');
  const commentsPanel = document.getElementById('comment-panel');

  // Estado inicial (oculto por defecto)
  let panelVisible = false;
  commentsPanel.classList.remove('open'); // Ocultamos por defecto

  toggleButton.addEventListener('click', () => {
    panelVisible = !panelVisible;
    if (panelVisible) {
      commentsPanel.classList.add('open');
      renderCommentsList(); // vuelve a renderizar los comentarios cuando se abre el panel
    } else {
      commentsPanel.classList.remove('open');
    }
    
    document.getElementById('outerContainer')
          .classList.toggle('withCommentsOpen', panelVisible);
    
  });

}

// Inicialización
PDFViewerApplication.initializedPromise.then(async () => {
  await initDB();
  renderCommentsList();
  setupCommentsPanelToggle();

  // 🧹 Limpiar comentarios previos cada vez que se recarga la página
  window.addEventListener("beforeunload", () => {
    const tx = db.transaction("comments", "readwrite");
    const store = tx.objectStore("comments");
    store.clear();
  });
  
  // 🔽 Agregar exportador de comentarios como JSON
  const exportBtn = document.getElementById("exportCommentsBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      const comments = await getAllComments();
      const blob = new Blob([JSON.stringify(comments, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "comentarios.pdf.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // 🔽 Agregar importador de comentarios desde JSON
  const importInput = document.getElementById("importCommentsInput");
  if (importInput) {
    importInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      let comments;
      try {
        comments = JSON.parse(text);
        if (!Array.isArray(comments)) throw new Error();
      } catch {
        alert("El archivo no contiene un formato de comentarios válido.");
        return;
      }

      const tx = db.transaction("comments", "readwrite");
      const store = tx.objectStore("comments");

      for (const comment of comments) {
        store.put(comment);
      }

      renderCommentsList();
      alert("Comentarios importados correctamente.");
    });
  }

});

// fin logica

export {
  PDFViewerApplication,
  AppConstants as PDFViewerApplicationConstants,
  AppOptions as PDFViewerApplicationOptions,
};

