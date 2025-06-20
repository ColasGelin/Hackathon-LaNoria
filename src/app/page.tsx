import Image from "next/image";

export default function Home() {
  return (
    <div className="safe-area min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Lanoria</h1>
          <p className="text-lg text-foreground/80 mb-8">Your PWA is ready!</p>
        </div>
        
        <div className="w-24 h-24 bg-foreground/10 rounded-full flex items-center justify-center">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="App logo"
            width={60}
            height={30}
            priority
          />
        </div>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button className="w-full py-4 px-6 bg-foreground text-background rounded-lg font-medium text-lg active:scale-95 transition-transform">
            Get Started
          </button>
          <button className="w-full py-4 px-6 border border-foreground/20 rounded-lg font-medium text-lg active:scale-95 transition-transform">
            Learn More
          </button>
        </div>
      </main>
    </div>
  );
}