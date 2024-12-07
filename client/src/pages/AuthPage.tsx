import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface AuthPageProps {
  onClose?: () => void;
}

export default function AuthPage({ onClose }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const { login, register } = useUser();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLogin) {
        const result = await login({ email, password });
        if (!result.ok) {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: result.message,
          });
          return;
        }
      } else {
        if (!email) {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: "Email is required",
          });
          return;
        }

        const result = await register({ 
          email, 
          password, 
          marketingEmails
        });
        
        if (!result.ok) {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: result.message,
          });
          return;
        }
      }

      toast({
        title: isLogin ? "Login successful" : "Registration successful",
        description: isLogin ? "Welcome back!" : "Welcome to our platform!",
      });
      
      // Navigate to dashboard and close modal
      setLocation('/dashboard');
      onClose?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-[400px]">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle>{isLogin ? "Login" : "Register"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Welcome back! Please login to continue."
              : "Create an account to get started."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {!isLogin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="marketingEmails"
                  checked={marketingEmails}
                  onChange={(e) => setMarketingEmails(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="marketingEmails" className="text-sm text-muted-foreground ml-2">
                  I want to receive marketing emails about products and services
                </label>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full">
              {isLogin ? "Login" : "Register"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
