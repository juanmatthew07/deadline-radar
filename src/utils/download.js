// File helpers for the backup. No React and no storage here: a Blob and a
// FileReader are all the browser needs to hand a file to the user or take one
// back, so neither React nor a service belongs in this layer.
const DEFAULT_MIME_TYPE = 'application/json'

// Hands the text to the browser as a download. The anchor is only a carrier: it
// is added, clicked, and removed again, so nothing is left in the document.
export function downloadTextFile(filename, text, mimeType = DEFAULT_MIME_TYPE) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoked one tick later, because a browser that lost the URL before the click
  // was handled would cancel the download it just started.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// FileReader instead of file.text(), so the same code path runs in jsdom.
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'))
    reader.readAsText(file)
  })
}
