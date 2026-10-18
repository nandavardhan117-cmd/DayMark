import {
  CalendarDays,
  CheckCircle2,
  Flame,
  ListTodo,
  Plus,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { BarChart } from '@/components/stats/BarChart'
import { StatCard } from '@/components/stats/StatCard'
import { WeekStrip } from '@/components/stats/WeekStrip'
import { TaskList } from '@/components/tasks/TaskList'
import { useTaskDialogs } from '@/components/tasks/useTaskDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { addDays, formatLongDay, todayKey, weekdayOf } from '@/lib/dateUtils'
import { tasksForDate } from '@/lib/recurrence'
import {
  challengeProgress,
  formatPercent,
  rollingCompletion,
  series,
  statForDate,
  streaks,
} from '@/lib/stats'
import { useStore } from '@/lib/store'

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function greetingFor(hour: number): string {
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { data, ready } = useStore()
  const navigate = useNavigate()
  const { openCreate, openEdit, requestDelete, dialog, confirm } = useTaskDialogs()

  if (!ready || !data) return <DashboardSkeleton />

  const today = todayKey()
  const hour = new Date().getHours()
  const weekStartsOn = data.settings.weekStartsOn
  const activeTasks = data.tasks.filter((task) => !task.archivedAt)

  const scheduled = tasksForDate(activeTasks, today, weekStartsOn)
  const stat = statForDate(data, today)
  const streak = streaks(data)
  const week = rollingCompletion(data, 7)
  const month = rollingCompletion(data, 30)

  const weekDays: string[] = []
  for (let i = 6; i >= 0; i--) weekDays.push(addDays(today, -i))
  const weekStats = weekDays.map((day) => statForDate(data, day))

  const last14 = series(data, addDays(today, -13), today).map((s) => ({
    key: s.date,
    label: WEEKDAY_SHORT[weekdayOf(s.date)] ?? '',
    value: s.ratio,
    highlight: s.perfect,
    title: `${s.date}: ${s.completed}/${s.scheduled}`,
  }))

  const challenges = data.challenges
    .map((challenge) => challengeProgress(data, challenge))
    .filter((progress) => !progress.ended)
    .slice(0, 3)

  const name = data.settings.userName.trim()

  return (
    <>
      <PageHeader
        eyebrow={formatLongDay(today)}
        title={`${greetingFor(hour)}${name ? `, ${name}` : ''}`}
        description={
          stat.scheduled === 0
            ? 'Nothing is scheduled for today yet. Add a task to get moving.'
            : stat.perfect
              ? 'Everything scheduled for today is done. Nicely handled.'
              : `${stat.scheduled - stat.completed} ${
                  stat.scheduled - stat.completed === 1 ? 'task' : 'tasks'
                } left to finish today.`
        }
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
            New task
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={formatPercent(stat.ratio)}
          caption={`${stat.completed} of ${stat.scheduled} done`}
          icon={CheckCircle2}
          tone={stat.perfect ? 'success' : 'brand'}
        />
        <StatCard
          label="Current streak"
          value={streak.current}
          caption={streak.current > 0 ? 'days in a row' : 'start one today'}
          icon={Flame}
          tone={streak.current > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Last 7 days"
          value={formatPercent(week.ratio)}
          caption={`${week.completed}/${week.scheduled} completions`}
          icon={TrendingUp}
          tone={week.ratio >= 0.8 ? 'success' : 'brand'}
        />
        <StatCard
          label="Active tasks"
          value={activeTasks.length}
          caption={`${data.categories.length} categories`}
          icon={ListTodo}
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Today's tasks"
            description={formatLongDay(today)}
            action={
              <div className="flex items-center gap-2">
                <Link
                  to="/tasks"
                  className="text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
                >
                  Manage
                </Link>
                <Button size="sm" variant="soft" onClick={() => navigate('/today')}>
                  Open day
                </Button>
              </div>
            }
          />

          {scheduled.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="A clear day"
              description="No tasks are scheduled for today. Create one and pick how often it should repeat."
              action={
                <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
                  Create your first task
                </Button>
              }
            />
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <ProgressBar
                  value={stat.ratio}
                  className="flex-1"
                  tone={stat.perfect ? 'success' : 'brand'}
                />
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-2">
                  {stat.completed}/{stat.scheduled}
                </span>
              </div>
              <TaskList
                tasks={scheduled}
                date={today}
                onEdit={openEdit}
                onDelete={requestDelete}
                label="Today's tasks"
              />
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="This week"
              description="Tap a day to open it."
              action={
                <Link to="/calendar" className="text-[13px] font-medium text-ink-3 hover:text-ink">
                  Calendar
                </Link>
              }
            />
            <WeekStrip
              stats={weekStats}
              onSelectDay={(day) => navigate(`/today?date=${day}`)}
            />
          </Card>

          <Card>
            <CardHeader
              title="Completion trend"
              description="Last 14 days."
              action={
                <Link to="/statistics" className="text-[13px] font-medium text-ink-3 hover:text-ink">
                  Stats
                </Link>
              }
            />
            <BarChart data={last14} height={132} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <MiniStat label="7-day rate" value={formatPercent(week.ratio)} />
              <MiniStat label="30-day rate" value={formatPercent(month.ratio)} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Challenges"
              action={
                <Link to="/settings" className="text-[13px] font-medium text-ink-3 hover:text-ink">
                  Manage
                </Link>
              }
            />
            {challenges.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-ink-3">
                Group a few tasks into a personal challenge — like a 30-day fitness push — from
                the Settings page.
              </p>
            ) : (
              <div className="space-y-3.5">
                {challenges.map(({ challenge, ratio, percent, active }) => (
                  <div key={challenge.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-ink">{challenge.name}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {active ? <Badge tone="success">Active</Badge> : null}
                        <span className="text-[12px] tabular-nums text-ink-3">{percent}%</span>
                      </div>
                    </div>
                    <ProgressBar value={ratio} tone={active ? 'brand' : 'warning'} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Shortcuts" />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction
                icon={CalendarDays}
                label="History"
                onClick={() => navigate('/calendar')}
              />
              <QuickAction icon={Target} label="New task" onClick={openCreate} />
            </div>
          </Card>
        </div>
      </div>

      {dialog}
      {confirm}
    </>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <p className="mt-0.5 text-[17px] font-bold tracking-tight text-ink">{value}</p>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof CalendarDays
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-all hover:border-line-strong hover:bg-surface-2 hover:text-ink"
    >
      <Icon size={15} className="text-ink-3" />
      {label}
    </button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 w-72 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card h-96 lg:col-span-2" />
        <div className="card h-96" />
      </div>
    </div>
  )
}
