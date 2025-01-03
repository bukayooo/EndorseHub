import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  keep_me_logged_in: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  keep_me_logged_in: z.boolean().optional(),
  username: z.string().min(3).optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login, register: registerUser } = useUser();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data);
      if (!result.ok) {
        throw new Error(result.message);
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    try {
      const result = await registerUser(data);
      if (!result.ok) {
        throw new Error(result.message);
      }
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = mode === 'login' ? loginForm.formState.isSubmitting : registerForm.formState.isSubmitting;
  const currentForm = mode === 'login' ? loginForm : registerForm;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Login' : 'Create Account'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={mode === 'login' 
          ? loginForm.handleSubmit(onLoginSubmit)
          : registerForm.handleSubmit(onRegisterSubmit)} 
          className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...(mode === 'login' 
                ? loginForm.register('email')
                : registerForm.register('email')
              )}
              aria-invalid={currentForm.formState.errors.email ? "true" : "false"}
            />
            {currentForm.formState.errors.email && (
              <p className="text-sm text-destructive">{currentForm.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...(mode === 'login'
                ? loginForm.register('password')
                : registerForm.register('password')
              )}
              aria-invalid={currentForm.formState.errors.password ? "true" : "false"}
            />
            {currentForm.formState.errors.password && (
              <p className="text-sm text-destructive">{currentForm.formState.errors.password.message}</p>
            )}
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                id="username"
                {...registerForm.register('username')}
                aria-invalid={registerForm.formState.errors.username ? "true" : "false"}
              />
              {registerForm.formState.errors.username && (
                <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="keep_me_logged_in"
              {...(mode === 'login'
                ? loginForm.register('keep_me_logged_in')
                : registerForm.register('keep_me_logged_in')
              )}
            />
            <Label htmlFor="keep_me_logged_in">Keep me logged in</Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? mode === 'login' ? 'Logging in...' : 'Creating account...'
              : mode === 'login' ? 'Login' : 'Create Account'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setMode('register')}
                >
                  Create one
                </Button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setMode('login')}
                >
                  Login
                </Button>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
