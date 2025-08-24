import ImageGeneratorForm from '@/components/image-generator-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Image } from 'lucide-react';

export default function ImageGeneratorPage() {
  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Image className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">AI Image Generator</CardTitle>
              <CardDescription>
                Create a unique image from a text description.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground">
            Describe anything you can imagine, and let our AI bring it to life as an image. This could be useful for creating game assets, player avatars, or just for fun!
          </p>
          <ImageGeneratorForm />
        </CardContent>
      </Card>
    </div>
  );
}
