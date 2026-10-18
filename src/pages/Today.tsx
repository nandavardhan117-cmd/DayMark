import {
  ChevronLeft,
  ChevronRight,
  Flame,
  ListTodo,
  Plus,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { BarChart } from '@/components/stats/BarChart'
import { ProgressRing } from '@/components/stats/ProgressRing'
import { StatCard } from '@/components/stats/StatCard'
import { WeekStrip } from '@/components/stats/WeekStrip'
import { TaskList } from '@/components/tasks/TaskList'
import { useTaskDialogs } from '@/components/tasks/useTaskDialogs'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Form'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  addDays,
  formatLongDay,
  relativeDayLabel,
  todayKey,
  weekdayOf,
} from '@/lib/dateUtils'
import { tasksForDate } from '@/lib/recurrence'
import { formatPercent, series, statForDate, streaks } from '@/lib/stats'
import { useStore } from '@/lib/store'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function TodayPage() {
  const { data, ready } = useStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { openCreate, openEdit, requestDelete, dialog, confirm } = useTaskDialogs()

  const today = todayKey()
  const weekDays = useMemo(() => {
    const out: string[] = []
    for (let i = 6; i >= 0; i--) out.push(addDays(today, -i))
    return out
  }, [today])

  // Optional ?date=YYYY-MM-DD lets the calendar deep-link into history.
  const requested = searchParams.get('date')
  const date =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today

  if (!ready || !data) return <PageSkeleton />

  const weekStartsOn = data.settings.weekStartsOn
  const scheduled = tasksForDate(data.tasks, date, weekStartsOn)
  const stat = statForDate(data, date)
  const streak = streaks(data)
  const isFuture = date > today

  const weekStats = weekDays.map((day) => statForDate(data, day))
  const last14 = series(data, addDays(today, -13), today).map((s) => ({
    key: s.date,
    label: WEEKDAY_SHORT[weekdayOf(s.date)] ?? '',
    value: s.ratio,
    title: `${s.date}: ${s.completed}/${s.scheduled} done`,
    highlight: s.perfect,
  }))

  function goTo(next: string) {
    if (next === today) setSearchParams({})
    else setSearchParams({ date: next })
  }

  return (
    <>
      <PageHeader
        eyebrow={date === today ? 'Today' : 'Viewing history'}
        title={formatLongDay(date)}
        description={
          date === today
            ? 'One clear list for the day ahead. Tick things off as you go.'
            : `${relativeDayLabel(date, today)} — you can still correct past records.`
        }
        actions={
          <>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous day"
                onClick={() => goTo(addDays(date, -1))}
                className="h-8 w-8"
              >
                <ChevronLeft size={16} />
              </Button>
              <Input
                type="date"
                value={date}
                onChange={(event) => event.target.value && goTo(event.target.value)}
                className="h-8 w-[9.5rem] border-0 bg-transparent px-1 py-0 text-[13px] font-medium hover:border-0 focus:ring-0"
                aria-label="Pick a date"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Next day"
                disabled={addDays(date, 1) > today}
                onClick={() => goTo(addDays(date, 1))}
                className="h-8 w-8"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
              New task
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Completed"
          value={`${stat.completed}/${stat.scheduled}`}
          caption={stat.hasTasks ? 'tasks on this day' : 'nothing scheduled'}
          icon={ListTodo}
          tone={stat.perfect ? 'success' : 'brand'}
        />
        <StatCard
          label="Current streak"
          value={streak.current}
          caption={streak.current === 1 ? 'perfect day' : 'perfect days in a row'}
          icon={Flame}
          tone={streak.current > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Best streak"
          value={streak.longest}
          caption="longest run on record"
          icon={Trophy}
          tone={streak.longest > 0 ? 'success' : 'neutral'}
        />
        <StatCard
          label="Completion"
          value={formatPercent(stat.ratio)}
          caption={isFuture ? 'upcoming day' : 'of scheduled tasks'}
          icon={Sparkles}
          tone={stat.perfect ? 'success' : 'brand'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center gap-5 border-b border-line pb-5">
            <ProgressRing
              value={stat.ratio}
              label={formatPercent(stat.ratio)}
              sublabel="complete"
              tone={stat.perfect ? 'success' : 'brand'}
              size={96}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold tracking-tight text-ink">
                {date === today ? "Today's tasks" : 'Tasks on this day'}
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-2">
                {stat.scheduled === 0
                  ? 'Nothing is scheduled.'
                  : `${stat.completed} of ${stat.scheduled} completed`}
              </p>
              <ProgressBar
                value={stat.ratio}
                className="mt-3 max-w-md"
                tone={stat.perfect ? 'success' : 'brand'}
              />
            </div>
          </div>

          <TaskList
            tasks={scheduled}
            date={date}
            label={`Tasks for ${date}`}
            reorderable={date === today}
            allowToggle={!isFuture}
            onEdit={openEdit}
            onDelete={requestDelete}
            empty={
              <EmptyState
                icon={ListTodo}
                title={isFuture ? 'Nothing planned yet' : 'No tasks scheduled'}
                description={
                  isFuture
                    ? 'This day has no tasks on its schedule.'
                    : 'Add a task and choose how often it should repeat.'
                }
                action={
                  <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
                    Add a task
                  </Button>
                }
              />
            }
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Last 7 days"
              description="Fill height = completion rate."
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/calendar')}>
                  Calendar
                </Button>
              }
            />
            <WeekStrip stats={weekStats} />
          </Card>

          <Card>
            <CardHeader
              title="Last 14 days"
              description="Green bars are days where everything was done."
              action={
                <Button size="sm" variant="ghost" onClick={() => navigate('/statistics')}>
                  Details
                </Button>
              }
            />
            <BarChart data={last14} height={140} />
          </Card>

          <Card>
            <CardHeader title="Streak status" />
            <div className="space-y-3 text-[13px]">
              <Row
                label="Today"
                value={
                  !stat.hasTasks
                    ? 'Nothing scheduled'
                    : streak.todayComplete
                      ? 'Complete'
                      : streak.todayPending
                        ? 'In progress'
                        : 'Not started'
                }
                tone={
                  streak.todayComplete ? 'success' : streak.todayPending ? 'warning' : 'muted'
                }
              />
              <Row label="Current streak" value={`${streak.current} days`} />
              <Row label="Longest streak" value={`${streak.longest} days`} />
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-3">
                A day counts toward your streak when every scheduled task that day is completed.
                Days with nothing scheduled are skipped.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {dialog}
      {confirm}
    </>
  )
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'success' | 'warning' | 'muted'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'muted'
          ? 'text-ink-3'
          : 'text-ink'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
      <span className="text-ink-3">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-64 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-80" />
    </div>
  )
}
