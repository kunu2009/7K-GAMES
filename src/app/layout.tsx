import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import Header from '@/components/header';
import MainNav from '@/components/main-nav';
import { Gamepad2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Couch Chaos',
  description: 'A local multiplayer gaming app for 1-4 players.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-8 w-8 text-primary" />
                <h2 className="text-xl font-semibold">Couch Chaos</h2>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <Header />
            <main className="flex-1 p-4 md:p-6 h-[calc(100vh-4rem)]">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
