import { Link } from 'react-router-dom'
import { FileQuestion, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
