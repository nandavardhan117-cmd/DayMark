import { Award, BarChart3, CalendarCheck2, Flame, Target, Trophy, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { BarChart } from '@/components/stats/BarChart'
import { StatCard } from '@/components/stats/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  addDays,
  formatMedium,
  todayKey,
  weekdayOf,
} from '@/lib/dateUtils'
import {
  challengeProgress,
  formatPercent,
  rollingCompletion,
  series,
  streaks,
  taskPerformance,
} from '@/lib/stats'
import { useStore } from '@/lib/store'

type Range = '7' | '30' | '90'

const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function StatisticsPage() {
  const { data, ready } = useStore()
  const [range, setRange] = useState<Range>('30')

  if (!ready || !data) return <StatsSkeleton />

  const today = todayKey()
  const days = Number(range)
  const from = addDays(today, -(days - 1))

  const stats = series(data, from, today)
  const withData = stats.filter((s) => s.hasTasks)
  const perfect = withData.filter((s) => s.perfect)
  const overall = rollingCompletion(data, days)
  const streak = streaks(data)

  const allCategories = data.categories
    .map((category) => {
      const scoped = {
        ...data,
        tasks: data.tasks.filter((task) => task.categoryId === category.id),
      }
      const result = rollingCompletion(scoped, days)
      return { category, ...result }
    })
    .filter((entry) => entry.scheduled > 0)
    .sort((a, b) => b.ratio - a.ratio)

  const performance = taskPerformance(data, from, today).slice(0, 12)
  const tasksById = new Map(data.tasks.map((task) => [task.id, task]))
  const categoriesById = new Map(data.categories.map((c) => [c.id, c]))

  const chart = stats.map((s) => ({
    key: s.date,
    label: days <= 14 ? (WEEKDAY_SHORT[weekdayOf(s.date)] ?? '') : s.date.slice(8, 10),
    value: s.ratio,
    highlight: s.perfect,
    title: `${formatMedium(s.date)}: ${s.completed}/${s.scheduled} done`,
  }))

  // Average completion for days that actually had tasks.
  const average =
    withData.length === 0 ? 0 : withData.reduce((sum, s) => sum + s.ratio, 0) / withData.length

  const challenges = data.challenges.map((challenge) => challengeProgress(data, challenge))

  const bestWeekday = bestWeekdayFor(stats)

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Statistics"
        description="How you have been doing over time. Percentages only count days that had tasks."
        actions={
          <div className="w-full sm:w-72">
            <SegmentedControl<Range>
              value={range}
              options={RANGES}
              onChange={setRange}
              ariaLabel="Select date range"
            />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`${days}-day rate`}
          value={formatPercent(overall.ratio)}
          caption={`${overall.completed} of ${overall.scheduled} completions`}
          icon={TrendingUp}
          tone={overall.ratio >= 0.8 ? 'success' : 'brand'}
        />
        <StatCard
          label="Perfect days"
          value={perfect.length}
          caption={`out of ${withData.length} active days`}
          icon={CalendarCheck2}
          tone={perfect.length > 0 ? 'success' : 'neutral'}
        />
        <StatCard
          label="Current streak"
          value={streak.current}
          caption={streak.todayPending ? 'today still in progress' : 'days in a row'}
          icon={Flame}
          tone={streak.current > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Longest streak"
          value={streak.longest}
          caption="personal best"
          icon={Trophy}
          tone={streak.longest > 0 ? 'success' : 'neutral'}
        />
      </div>

      {withData.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Not enough history yet"
          description="Tick off a few tasks and your trends will start to appear here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Daily completion"
              description="Green = every scheduled task was finished."
              action={
                <Badge tone="brand">
                  Average {formatPercent(average)}
                </Badge>
              }
            />
            <BarChart data={chart} height={200} />
          </Card>

          <Card>
            <CardHeader title="By category" description="Performance over this range." />
            {allCategories.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-3">
                Assign tasks to categories to see this breakdown.
              </p>
            ) : (
              <div className="space-y-3">
                {allCategories.map((entry) => (
                  <div key={entry.category.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="inline-flex items-center gap-1.5 truncate font-medium text-ink-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.category.color }}
                        />
                        {entry.category.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-3">
                        {entry.completed}/{entry.scheduled}
                      </span>
                    </div>
                    <ProgressBar
                      value={entry.ratio}
                      tone={entry.ratio >= 0.8 ? 'success' : 'brand'}
                      height="h-1.5"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-xl bg-surface-2 p-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
                <Award size={13} className="text-warning" />
                Best weekday
              </p>
              {bestWeekday ? (
                <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                  You complete most on{' '}
                  <span className="font-semibold text-ink">{bestWeekday.label}</span> at{' '}
                  {formatPercent(bestWeekday.ratio)}.
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-ink-3">Keep going to find out.</p>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Task performance"
              description="Lowest completion rate first — the list to focus on."
            />
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-3">
                    <th className="pb-2 pr-3 font-semibold">Task</th>
                    <th className="pb-2 pr-3 font-semibold">Schedule</th>
                    <th className="pb-2 pr-3 text-right font-semibold">Done</th>
                    <th className="pb-2 font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((row) => {
                    const task = tasksById.get(row.taskId)
                    if (!task) return null
                    const category = task.categoryId ? categoriesById.get(task.categoryId) : null
                    return (
                      <tr key={row.taskId} className="border-b border-line last:border-0">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            {category ? (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            ) : null}
                            <span className="truncate text-[13px] font-medium text-ink">
                              {task.title}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-[12.5px] text-ink-3">
                          {task.recurrence.type === 'daily'
                            ? 'Daily'
                            : task.recurrence.weekdays.length > 0
                              ? task.recurrence.weekdays
                                  .map((d) => WEEKDAY_SHORT[d])
                                  .join(' ')
                              : 'Custom'}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[12.5px] tabular-nums text-ink-2">
                          {row.completed}/{row.scheduled}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar
                              value={row.ratio}
                              height="h-1.5"
                              className="w-16"
                              tone={row.ratio >= 0.8 ? 'success' : row.ratio >= 0.5 ? 'brand' : 'warning'}
                            />
                            <span className="w-10 text-right text-[12.5px] tabular-nums text-ink-2">
                              {formatPercent(row.ratio)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Challenges"
              description="Progress inside each challenge window."
              action={<Target size={16} className="text-ink-3" />}
            />
            {challenges.length === 0 ? (
              <p className="py-6 text-center text-[13px] leading-relaxed text-ink-3">
                No challenges yet. Create one in Settings to group tasks under a shared goal.
              </p>
            ) : (
              <div className="space-y-4">
                {challenges.map((progress) => (
                  <div key={progress.challenge.id} className="rounded-xl border border-line p-3.5">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {progress.challenge.name}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-3">
                          {formatMedium(progress.challenge.startDate)} →{' '}
                          {formatMedium(progress.challenge.endDate)}
                        </p>
                      </div>
                      <Badge tone={progress.active ? 'success' : progress.ended ? 'neutral' : 'warning'}>
                        {progress.active ? 'Active' : progress.ended ? 'Ended' : 'Upcoming'}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={progress.ratio}
                      tone={progress.active ? 'brand' : 'warning'}
                    />
                    <div className="mt-2 flex items-center justify-between text-[12px] text-ink-3">
                      <span>
                        {progress.completed}/{progress.scheduled} tasks
                      </span>
                      <span className="font-semibold text-ink-2">{progress.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[12.5px] leading-relaxed text-ink-3">
                A <span className="font-medium text-ink-2">perfect day</span> means every task
                scheduled that day was completed. Days with no tasks are excluded from streaks and
                averages.
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 px-0"
                onClick={() => setRange('90')}
              >
                Show 90 days
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

/** Which weekday has the highest average completion. */
function bestWeekdayFor(
  stats: { date: string; ratio: number; hasTasks: boolean }[],
): { label: string; ratio: number } | null {
  const buckets = new Map<number, { total: number; count: number }>()

  for (const stat of stats) {
    if (!stat.hasTasks) continue
    const day = weekdayOf(stat.date)
    const bucket = buckets.get(day) ?? { total: 0, count: 0 }
    bucket.total += stat.ratio
    bucket.count += 1
    buckets.set(day, bucket)
  }

  let best: { label: string; ratio: number } | null = null
  for (const [day, bucket] of buckets) {
    if (bucket.count === 0) continue
    const ratio = bucket.total / bucket.count
    if (!best || ratio > best.ratio) {
      best = { label: WEEKDAY_SHORT[day] ?? '', ratio }
    }
  }
  return best
}

function StatsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-52 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-72" />
    </div>
  )
}
