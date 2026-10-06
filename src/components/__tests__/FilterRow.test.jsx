import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterRow } from '../FilterRow.jsx'

function makeFilters() {
  return {
    searchInput: '',
    setSearchInput: vi.fn(),
    status: 'all',
    setStatus: vi.fn(),
    course: 'all',
    setCourse: vi.fn(),
    sort: 'deadline_asc',
    setSort: vi.fn(),
    isDefault: false,
    reset: vi.fn(),
  }
}

describe('FilterRow', () => {
  it('renders the search input', () => {
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    expect(screen.getByRole('searchbox', { name: 'Cari tugas' })).toBeInTheDocument()
  })

  it('renders the status select', () => {
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument()
  })

  it('renders the course select', () => {
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    expect(screen.getByRole('combobox', { name: 'Mata kuliah' })).toBeInTheDocument()
  })

  it('renders the sort select', () => {
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    expect(screen.getByRole('combobox', { name: 'Urutkan' })).toBeInTheDocument()
  })

  it('calls setSearchInput when typing in the search field', async () => {
    const user = userEvent.setup()
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    await user.type(screen.getByRole('searchbox', { name: 'Cari tugas' }), 'Kimia')

    expect(filters.setSearchInput).toHaveBeenCalledWith('K')
    expect(filters.setSearchInput).toHaveBeenCalledWith('i')
    expect(filters.setSearchInput).toHaveBeenCalledWith('m')
    expect(filters.setSearchInput).toHaveBeenCalledWith('i')
    expect(filters.setSearchInput).toHaveBeenCalledWith('a')
  })

  it('calls setStatus when the status select changes', async () => {
    const user = userEvent.setup()
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'done')

    expect(filters.setStatus).toHaveBeenCalledWith('done')
  })

  it('calls setCourse when the course select changes', async () => {
    const user = userEvent.setup()
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math', 'Kimia']} effectiveCourse="all" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mata kuliah' }), 'Kimia')

    expect(filters.setCourse).toHaveBeenCalledWith('Kimia')
  })

  it('calls setSort when the sort select changes', async () => {
    const user = userEvent.setup()
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Math']} effectiveCourse="all" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Urutkan' }), 'deadline_desc')

    expect(filters.setSort).toHaveBeenCalledWith('deadline_desc')
  })

  it('lists the provided courses in the course select', () => {
    const filters = makeFilters()
    render(<FilterRow filters={filters} courses={['Matematika', 'Fisika']} effectiveCourse="all" />)

    const select = screen.getByRole('combobox', { name: 'Mata kuliah' })
    const options = within(select).getAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      'Semua mata kuliah',
      'Matematika',
      'Fisika',
    ])
  })
})