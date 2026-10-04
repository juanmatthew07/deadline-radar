import './WorkloadChart.css'

const TITLE = 'Beban 7 hari ke depan'
const DAYS_TEXT = '7 hari ke depan'
const TODAY_LABEL = 'Hari ini'
// Read out after the number, so the height is never the only signal.
const COUNT_HIDDEN = ' tugas jatuh tempo'

const weekdayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })

// The shortest bar that still reads as a bar.
const MIN_BAR_PERCENT = 8

// Used when no day is handed in, so the card still says what it is about.
const NO_DAYS = []

function dayLabel(date, index) {
  if (index === 0) return TODAY_LABEL
  return `${weekdayFormatter.format(date)} ${date.getDate()}`
}

// Seven columns, one per day, each with the count above its bar. The height of a
// bar is the only value that comes from the data, so it is the one inline style
// of the chart. Every count is printed next to its bar.
export function WorkloadChart({ days = NO_DAYS }) {
  const total = days.reduce((sum, day) => sum + day.count, 0)
  // The busiest day is the full height, so the bars stay comparable.
  const maxCount = Math.max(1, ...days.map((day) => day.count))

  return (
    <section className="card workload-chart">
      <h3 className="workload-chart__title">{TITLE}</h3>
      <p className="workload-chart__summary">
        {total === 0
          ? `Tidak ada tugas jatuh tempo dalam ${DAYS_TEXT}`
          : `${total} tugas jatuh tempo dalam ${DAYS_TEXT}`}
      </p>

      <ol className="workload-chart__days">
        {days.map((day, index) => (
          <li key={day.key} className="workload-chart__day">
            <span className="workload-chart__count">
              {day.count}
              <span className="visually-hidden">{COUNT_HIDDEN}</span>
            </span>
            <div className="workload-chart__track">
              {day.count === 0 ? null : (
                <div
                  className="workload-chart__fill"
                  style={{
                    height: `${Math.max(MIN_BAR_PERCENT, Math.round((day.count / maxCount) * 100))}%`,
                  }}
                />
              )}
            </div>
            <span
              className={
                index === 0
                  ? 'workload-chart__label workload-chart__label--today'
                  : 'workload-chart__label'
              }
            >
              {dayLabel(day.date, index)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default WorkloadChart