import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTheme } from './ThemeProvider';
import { 
  Smartphone, 
  BarChart3, 
  Zap, 
  Users, 
  Star,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRight,
  Check,
  Play,
  Sparkles,
  Shield,
  Gauge,
  Globe,
  ChevronDown
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'landing' | 'login' | 'dashboard') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your interest! We\'ll be in touch soon.');
    setFormData({ name: '', email: '', message: '' });
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-Time Updates",
      description: "Push content changes instantly without app store releases. Update banners, popups, and promotions in seconds.",
      highlight: "Instant"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Deep insights into user engagement with detailed metrics on impressions, clicks, and conversion rates.",
      highlight: "Data-Driven"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Smart Targeting",
      description: "Precise audience segmentation with behavioral triggers and demographic filters for maximum impact.",
      highlight: "Intelligent"
    },
    {
      icon: <Gauge className="w-6 h-6" />,
      title: "Performance First",
      description: "Optimized for speed with minimal impact on your app's performance and user experience.",
      highlight: "Fast"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Collaboration",
      description: "Built for teams with role-based permissions, approval workflows, and seamless collaboration tools.",
      highlight: "Collaborative"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Global Scale",
      description: "Reliable infrastructure that scales with your business, supporting millions of users worldwide.",
      highlight: "Scalable"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Head of Growth",
      company: "Zenith App",
      content: "ContentFlow transformed our mobile marketing. We've seen a 67% increase in campaign engagement and can now iterate on content in real-time.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b68cdbf1?w=64&h=64&fit=crop&crop=face"
    },
    {
      name: "Marcus Rodriguez",
      role: "VP of Product",
      company: "FlowTech",
      content: "Finally, a solution that bridges the gap between marketing ambition and technical execution. Our team velocity has increased 3x.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face"
    },
    {
      name: "Emily Johnson",
      role: "Marketing Director",
      company: "Velocity Labs",
      content: "The analytics insights are incredible. We can now make data-driven decisions that directly impact our conversion rates.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face"
    }
  ];

  const stats = [
    { value: "10M+", label: "Messages Delivered" },
    { value: "500+", label: "Apps Powered" },
    { value: "99.9%", label: "Uptime" },
    { value: "12ms", label: "Response Time" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-semibold text-foreground">ContentFlow</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Features</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Customers</a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Contact</a>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="w-9 h-9 p-0"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Button>
                
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="text-sm font-medium"
                >
                  Sign In
                </Button>
                
                <Button 
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="text-sm font-medium px-4"
                >
                  Get Started
                  <ArrowRight className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-9 h-9 p-0"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Features</a>
              <a href="#testimonials" className="block py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Customers</a>
              <a href="#contact" className="block py-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Contact</a>
              <div className="pt-3 space-y-2">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="w-full justify-start text-sm font-medium"
                >
                  Sign In
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onNavigate('login')}
                  className="w-full text-sm font-medium"
                >
                  Get Started
                  <ArrowRight className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-32 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-30">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-chart-2/20 rounded-full blur-3xl"></div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium">
              <Sparkles className="w-3 h-3 mr-1.5" />
              Now in Private Beta
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6">
              Take Control of Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-2">
                In-App Content
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              A powerful no-code CMS that lets marketing teams update banners, popups, and promotions in real-time — without writing a line of code.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg" 
                onClick={() => onNavigate('login')}
                className="px-8 py-3 text-base font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="lg"
                className="px-8 py-3 text-base font-medium group"
              >
                <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Everything you need to scale
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for modern teams who demand speed, flexibility, and results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8 bg-[rgba(161,159,159,0)]">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {feature.icon}
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs font-medium">
                      {feature.highlight}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 sm:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Customer Stories
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Trusted by innovative teams
            </h2>
            <p className="text-lg text-muted-foreground">
              See how leading companies are transforming their mobile marketing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-foreground leading-relaxed mb-6">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center">
                    <ImageWithFallback
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role} at {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 sm:py-32 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Get Started
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to transform your mobile marketing?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join innovative teams already using ContentFlow to scale their in-app engagement.
            </p>
          </div>

          <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-2 bg-input-background border-border"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Work Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-2 bg-input-background border-border"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="message" className="text-sm font-medium text-foreground">Message</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-2 bg-input-background border-border resize-none"
                    placeholder="Tell us about your project and how we can help..."
                  />
                </div>
                
                <Button type="submit" className="w-full py-3 text-base font-medium">
                  Send Message
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">ContentFlow</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              The no-code CMS that empowers marketing teams to control their mobile app content.
            </p>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>© 2025 ContentFlow</span>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}