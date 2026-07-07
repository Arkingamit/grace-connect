export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-24 h-24 relative flex items-center justify-center mb-8">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
        <img src="/logo.png" alt="Grace Connect" className="w-12 h-12 object-contain animate-pulse" />
      </div>
      <h2 className="text-xl font-bold gradient-text animate-pulse">Grace Connect</h2>
      <p className="text-sm text-muted-foreground mt-2 animate-pulse">Loading...</p>
    </div>
  );
}
