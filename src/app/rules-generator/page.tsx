import RuleGeneratorForm from '@/components/rule-generator-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function RuleGeneratorPage() {
  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">AI Rule Generator</CardTitle>
              <CardDescription>
                Create new, exciting rules for your games.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground">
            Describe your play style and the game type, and let our AI craft a unique challenge for you and your friends. This adds a fun twist to your favorite games, making each session unpredictable!
          </p>
          <RuleGeneratorForm />
        </CardContent>
      </Card>
    </div>
  );
}
