import { CloudUpload, HardDrive, ShieldQuestion } from 'lucide-react'

import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/**
 * Shown once when a brand-new cloud account is detected while this browser
 * already holds data from before sign-up.
 *
 * IMPORTANT: neither option deletes localStorage. Choosing "Start fresh" only
 * leaves the browser copy alone and seeds the cloud account. The local copy
 * remains until the user clears it themselves, so the decision is reversible.
 */
export function MigrationPrompt() {
  const { pendingMigration, resolveMigration } = useStore()

  if (!pendingMigration) return null

  const taskCount = pendingMigration.tasks.length
  const dayCount = Object.keys(pendingMigration.days).length

  return (
    <Modal
      open
      onClose={() => void resolveMigration('fresh')}
      title={
        <span className="inline-flex items-center gap-2">
          <ShieldQuestion size={17} className="text-brand" />
          Bring your local data?
        </span>
      }
      description="You signed in, but this browser already had DayMark data from before you created an account."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => void resolveMigration('fresh')}>
            Start fresh
          </Button>
          <Button
            variant="primary"
            icon={<CloudUpload size={16} />}
            onClick={() => void resolveMigration('upload')}
          >
            Upload to my account
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          This browser holds{' '}
          <span className="font-semibold text-ink">
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
          </span>{' '}
          and{' '}
          <span className="font-semibold text-ink">
            {dayCount} {dayCount === 1 ? 'day' : 'days'}
          </span>{' '}
          of completion history. Upload it so your account starts with everything you have done so
          far?
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            icon={<CloudUpload size={16} className="text-brand" />}
            title="Upload to my account"
            body="Copies your tasks, categories, challenges and every dated completion record into your private cloud space."
          />
          <OptionCard
            icon={<HardDrive size={16} className="text-ink-3" />}
            title="Start fresh"
            body="Begins your account with the sample starter set. Your local browser copy is left untouched as a backup."
          />
        </div>

        <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-3">
          Either way, nothing in this browser is deleted. You can still export a JSON backup from
          Settings at any time.
        </p>
      </div>
    </Modal>
  )
}

function OptionCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-line p-3.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        {icon}
        {title}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
    </div>
  )
}
