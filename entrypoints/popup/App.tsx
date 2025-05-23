import { Button } from '@/components/ui/button';

function App() {
  return (
    <div className="min-h-[400px] w-[350px] p-6 bg-background">
      <h1 className="text-2xl font-bold mb-4">Etta Keychain</h1>
      <div className="space-y-4">
        <p className="text-muted-foreground">Welcome to Etta Keychain for STEEM</p>
        <Button className="w-full">Connect to STEEM</Button>
        <Button variant="outline" className="w-full">Import Account</Button>
      </div>
    </div>
  );
}

export default App;
