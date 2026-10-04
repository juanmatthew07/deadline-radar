import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile, readFileAsText } from '../download.js'

// The anchor click is spied on, so jsdom never follows the download link. The
// anchor the click ran on is kept, because it is what the click was checked on.
function spyOnAnchorClick() {
  const state = { anchor: null }
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function track() {
    state.anchor = this
  })
  return state
}

beforeEach(() => {
  // jsdom has no object URL support, so the browser pair is stubbed here as well.
  URL.createObjectURL = vi.fn(() => 'blob:deadline-radar')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// Only the download needs the clock: the object URL is revoked one tick after the
// click, and FileReader needs real timers to finish.
describe('downloadTextFile', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('creates one object URL from a Blob', () => {
    spyOnAnchorClick()
    downloadTextFile('cadangan.json', '{"version":1}')

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const [blob] = URL.createObjectURL.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
  })

  it('clicks an anchor that carries the file name', () => {
    const click = spyOnAnchorClick()
    downloadTextFile('cadangan.json', '{}')

    expect(click.anchor.download).toBe('cadangan.json')
    expect(click.anchor.getAttribute('href')).toContain('blob:deadline-radar')
  })

  it('leaves no anchor in the document', () => {
    spyOnAnchorClick()
    downloadTextFile('cadangan.json', '{}')

    expect(document.querySelector('a')).toBeNull()
  })

  it('revokes the object URL after the click was handled', () => {
    spyOnAnchorClick()
    downloadTextFile('cadangan.json', '{}')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:deadline-radar')
  })
})

describe('readFileAsText', () => {
  it('resolves with the text of the file', async () => {
    const file = new File(['{"version":1}'], 'cadangan.json', { type: 'application/json' })
    await expect(readFileAsText(file)).resolves.toBe('{"version":1}')
  })

  it('rejects when the reader fails', async () => {
    const file = new File(['{}'], 'cadangan.json', { type: 'application/json' })
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function fail() {
      this.onerror(new Error('gagal'))
    })

    await expect(readFileAsText(file)).rejects.toThrowError('Gagal membaca berkas.')
  })
})
