import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useTheme } from './ThemeProvider';
import { ArrowLeft, Sun, Moon, Sparkles, Shield, Check, Loader2 } from 'lucide-react';

// Import the login function from your API library
import { login } from '../lib/auth/index';

interface LoginPageProps {
  onLogin: () => void;
  onNavigate: (page: 'landing' | 'login' | 'dashboard') => void;
}

export default function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [credentials, setCredentials] = useState({
    email: 'demo@contentflow.click', // Pre-fill with demo credentials for convenience
    password: 'demo123'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setCredentials(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call the login API function
      const response = await login(credentials);
      
      if (response.token) {
        // On success, store the token and call the onLogin prop
        localStorage.setItem('authToken', response.token);
        onLogin();
      } else {
        // Handle cases where the API might not return a token
        setError("Login failed: No authentication token received.");
      }
    } catch (err) {
      // Handle API errors (e.g., wrong password, server down)
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Real-time content updates",
    "Advanced analytics dashboard",
    "Team collaboration tools",
    "Enterprise-grade security"
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-2/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                onClick={() => onNavigate('landing')}
                className="text-muted-foreground hover:text-foreground p-2"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to home
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-9 h-9 p-0"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">ContentFlow</span>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Card */}
          <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Error Display Area */}
                {error && (
                  <div className="bg-destructive/20 text-destructive p-3 rounded-md text-sm text-center">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={credentials.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="mt-2 bg-input-background border-border"
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                    <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={credentials.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="mt-2 bg-input-background border-border"
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full py-3 text-sm font-medium" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in to ContentFlow'
                  )}
                </Button>
              </form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card text-muted-foreground">Demo Access</span>
                  </div>
                </div>
                
                <Card className="mt-4 bg-muted/30 border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Demo Environment</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Use any email and password combination to explore the platform
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Email: demo@contentflow.com</div>
                      <div>Password: demo123</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account?{' '}
              <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                Request access
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 flex-col justify-center px-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-chart-2"></div>
        </div>

        <div className="relative z-10">
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium w-fit">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Trusted by 500+ Apps
          </Badge>
          
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Join the future of mobile marketing
          </h3>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            ContentFlow empowers marketing teams to control their in-app content without technical dependencies.
          </p>

          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-chart-2 rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">SC</span>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Sarah Chen</p>
                <p className="text-xs text-muted-foreground">Head of Growth at Zenith</p>
              </div>
            </div>
            <blockquote className="mt-4 text-sm text-muted-foreground italic">
              "ContentFlow transformed how we manage our mobile campaigns. Setup took minutes, not weeks."
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}