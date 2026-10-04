import './CourseProgress.css'

const TITLE = 'Progres per mata kuliah'
const OVERALL_CAPTION = 'Keseluruhan'
const OVERALL_BAR_LABEL = 'Progres keseluruhan'
// Six rows fit a phone and a laptop without a long scroll.
const MAX_COURSES = 6

// One bar of progress. The track carries the role and the numbers, and the width
// of the fill is the one value that comes from the data.
function ProgressBar({ label, percent }) {
  return (
    <div
      className="course-progress__track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      {percent === 0 ? null : (
        <div className="course-progress__fill" style={{ width: `${percent}%` }} />
      )}
    </div>
  )
}

// How much of every course is finished, the whole set first and then one row per
// course. Presentational: the numbers arrive sorted from the statistics helpers.
export function CourseProgress({ courses, completion }) {
  const shown = courses.slice(0, MAX_COURSES)
  const hidden = courses.length - shown.length

  return (
    <section className="card course-progress">
      <h3 className="course-progress__title">{TITLE}</h3>

      <div className="course-progress__overall">
        <div className="course-progress__line">
          <span className="course-progress__caption">{OVERALL_CAPTION}</span>
          <span className="course-progress__percent">{completion.percent}%</span>
        </div>
        <p className="course-progress__muted">
          {completion.done} dari {completion.total} tugas selesai
        </p>
        <ProgressBar label={OVERALL_BAR_LABEL} percent={completion.percent} />
      </div>

      {shown.length === 0 ? null : (
        <>
          <ul className="course-progress__courses">
            {shown.map((course) => (
              <li key={course.course} className="course-progress__course">
                <div className="course-progress__line">
                  <span className="course-progress__name">{course.course}</span>
                  <span className="course-progress__percent">{course.percent}%</span>
                </div>
                <p className="course-progress__muted">
                  {course.done} dari {course.total} selesai
                </p>
                <ProgressBar label={`Progres ${course.course}`} percent={course.percent} />
              </li>
            ))}
          </ul>
          {hidden === 0 ? null : (
            <p className="course-progress__more">dan {hidden} mata kuliah lainnya.</p>
          )}
        </>
      )}
    </section>
  )
}

export default CourseProgress