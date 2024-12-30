import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TestimonialCard from "../components/testimonials/TestimonialCard";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import AuthPage from "./AuthPage";

interface HomePageProps {
  onGetStarted?: () => void;
}

export default function HomePage({ onGetStarted }: HomePageProps) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else if (user) {
      navigate("/dashboard");
    } else {
      setShowAuthDialog(true);
    }
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative h-[600px] flex items-center">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1495521939206-a217db9df264)',
              filter: 'brightness(0.3)'
            }}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-white">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Showcase Your Customer Success Stories
            </h1>
            <p className="text-lg sm:text-xl mb-8 max-w-2xl">
              Build trust and credibility with customizable testimonial widgets that 
              seamlessly integrate into your website.
            </p>
            <Button size="lg" variant="secondary" onClick={handleGetStarted}>
              Get Started
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">
              Powerful Features for Your Business
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Customizable Widgets</h3>
                  <p className="text-gray-600">
                    Create beautiful, responsive testimonial displays that match your brand.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Easy Integration</h3>
                  <p className="text-gray-600">
                    Simple embed codes to add testimonials to any website.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-2">Analytics & Insights</h3>
                  <p className="text-gray-600">
                    Track performance and engagement with detailed analytics.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">
              What Our Customers Say
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard
                author="Sarah Johnson"
                content="TestimonialHub has transformed how we collect and showcase customer feedback. The widgets are beautiful and the analytics help us understand our testimonials' impact."
              />
              <TestimonialCard
                author="Michael Chen"
                content="As a small business owner, I needed a simple way to display customer reviews. TestimonialHub delivered exactly what I needed, and more!"
              />
              <TestimonialCard
                author="Emily Rodriguez"
                content="The ease of importing reviews from different platforms and customizing how they're displayed is fantastic. Our conversion rates have improved significantly."
              />
            </div>
          </div>
        </section>
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px] p-0" hideCloseButton>
          <AuthPage onClose={() => setShowAuthDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}