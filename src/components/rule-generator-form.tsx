'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { onGenerate, type FormState } from '@/app/rules-generator/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Sparkles } from 'lucide-react'

const initialState: FormState = {
  message: '',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        'Generating...'
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" /> Generate Rules
        </>
      )}
    </Button>
  )
}

export default function RuleGeneratorForm() {
  const [state, formAction] = useActionState(onGenerate, initialState)
  const { toast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.message && !state.data) {
      toast({
        title: 'Error',
        description: state.issues ? state.issues.join('\n') : state.message,
        variant: 'destructive',
      })
    }
    if (state.data) {
      toast({
        title: 'Success!',
        description: 'New rules have been generated below.',
      })
    }
  }, [state, toast])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gameType">Game Type</Label>
        <Input
          id="gameType"
          name="gameType"
          placeholder="e.g., 2D Platformer, Space Shooter"
          defaultValue={state.fields?.gameType}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="playerStyles">Player Styles & Strategies</Label>
        <Textarea
          id="playerStyles"
          name="playerStyles"
          placeholder="Describe how you and your friends play. e.g., 'One player is very aggressive and always rushes, another prefers to play defensively and set traps...'"
          className="min-h-[120px]"
          defaultValue={state.fields?.playerStyles}
          required
        />
      </div>
      <SubmitButton />

      {state.data?.newRules && (
        <Card className="mt-6 bg-secondary animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary" />
              Your New Rules
            </CardTitle>
            <CardDescription>
              Try these rules in your next game session for a new challenge!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap font-body text-sm text-card-foreground/90 rounded-md border bg-background/50 p-4">
              {state.data.newRules}
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
