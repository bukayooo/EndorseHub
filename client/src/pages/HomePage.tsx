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
      <section className="relative min-h-[600px] flex items-center py-20 overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1495521939206-a217db9df264)',
            filter: 'brightness(0.2)'
          }}
        />
        <div className="container relative z-10 text-white mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-8 leading-tight">
              Showcase Your Customer Success Stories
            </h1>
            <p className="text-lg sm:text-xl mb-10 text-gray-200 max-w-2xl leading-relaxed">
              Build trust and credibility with customizable testimonial widgets that 
              seamlessly integrate into your website.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium shadow-lg transition-all" asChild>
              <button onClick={onGetStarted}>Get Started Free</button>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Powerful Features for Your Business
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Customizable Widgets
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Create beautiful, responsive testimonial displays that match your brand perfectly.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Easy Integration
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Simple embed codes to add testimonials to any website in minutes.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Analytics & Insights
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Track performance and engagement with detailed, real-time analytics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Example Testimonials */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <TestimonialCard
              author="Sarah Johnson"
              content="This platform has transformed how we showcase customer feedback. The widgets look amazing and the analytics help us understand their impact. Highly recommended for any business looking to build trust with potential customers."
              rating={5}
            />
            <TestimonialCard
              author="Michael Chen"
              content="The customization options are fantastic. We've seen a significant increase in conversion rates since adding these testimonials to our site. The analytics feature provides valuable insights into how our testimonials perform."
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8">
              Ready to Showcase Your Success Stories?
            </h2>
            <p className="text-xl mb-10 text-gray-100">
              Start collecting and displaying testimonials today. No credit card required.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="bg-white text-primary hover:bg-gray-100 px-8 py-3 rounded-lg font-medium shadow-lg transition-all"
              asChild
            >
              <button onClick={onGetStarted}>Get Started For Free</button>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
