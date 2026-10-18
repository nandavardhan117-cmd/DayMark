import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function NotFoundPage() {
  return (
    <Card className="mx-auto mt-10 max-w-lg text-center">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-ink-3">
        <Compass size={22} />
      </span>
      <PageHeader title="Page not found" description="That link does not lead anywhere in DayMark." />
      <Link to="/">
        <Button variant="primary">Back to dashboard</Button>
      </Link>
    </Card>
  )
}
