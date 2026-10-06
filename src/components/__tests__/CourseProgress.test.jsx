import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getCompletion, getCourseProgress } from '../../utils/stats.js'
import { CourseProgress } from '../CourseProgress.jsx'

describe('CourseProgress', () => {
  it('renders the empty state with no tasks', () => {
    const courses = getCourseProgress([])
    const completion = getCompletion([])
    render(<CourseProgress courses={courses} completion={completion} />)

    expect(screen.getByText('Progres per mata kuliah')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('renders the course names and progress for the given tasks', () => {
    const tasks = [
      { id: '1', course: 'Math', status: 'done' },
      { id: '2', course: 'Math', status: 'todo' },
      { id: '3', course: 'Physics', status: 'done' },
    ]
    const courses = getCourseProgress(tasks)
    const completion = getCompletion(tasks)
    render(<CourseProgress courses={courses} completion={completion} />)

    expect(screen.getByText('Math')).toBeInTheDocument()
    expect(screen.getByText('Physics')).toBeInTheDocument()
  })
})