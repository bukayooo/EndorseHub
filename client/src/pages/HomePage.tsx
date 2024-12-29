import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import TestimonialCard from "../components/testimonials/TestimonialCard";

interface HomePageProps {
  onGetStarted: () => void;
}

export default function HomePage({ onGetStarted }: HomePageProps) {
  return (
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
          <Button size="lg" variant="secondary" onClick={onGetStarted}>
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful Features for Your Business
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">
                  Customizable Widgets
                </h3>
                <p className="text-gray-600">
                  Create beautiful, responsive testimonial displays that match your brand.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">
                  Easy Integration
                </h3>
                <p className="text-gray-600">
                  Simple embed codes to add testimonials to any website.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-3">
                  Analytics & Insights
                </h3>
                <p className="text-gray-600">
                  Track performance and engagement with detailed analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Example Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Sample Testimonials
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <TestimonialCard
              author="Sarah Johnson"
              content="This platform has transformed how we showcase customer feedback. The widgets look amazing and the analytics help us understand their impact."
              rating={5}
            />
            <TestimonialCard
              author="Michael Chen"
              content="The customization options are fantastic. We've seen a significant increase in conversion rates since adding these testimonials to our site."
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6 text-primary-foreground">
            Ready to Showcase Your Success Stories?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Start collecting and displaying testimonials today.
          </p>
          <Button size="lg" variant="secondary" onClick={onGetStarted}>
            Get Started For Free
          </Button>
        </div>
      </section>
    </div>
  );
}