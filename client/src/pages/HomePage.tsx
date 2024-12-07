import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import TestimonialCard from "../components/testimonials/TestimonialCard";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1495521939206-a217db9df264)',
            filter: 'brightness(0.3)'
          }}
        />
        <div className="container relative z-10 text-white">
          <h1 className="text-5xl font-bold mb-6">
            Showcase Your Customer Success Stories
          </h1>
          <p className="text-xl mb-8 max-w-2xl">
            Build trust and credibility with customizable testimonial widgets that 
            seamlessly integrate into your website.
          </p>
          <Button size="lg" asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
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
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            Sample Testimonials
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <TestimonialCard
              author="Sarah Johnson"
              title="Marketing Director"
              content="This platform has transformed how we showcase customer feedback. The widgets look amazing and the analytics help us understand their impact."
              image="https://images.unsplash.com/photo-1517702087178-fa967a8e8169"
              rating={5}
            />
            <TestimonialCard
              author="Michael Chen"
              title="E-commerce Owner"
              content="The customization options are fantastic. We've seen a significant increase in conversion rates since adding these testimonials to our site."
              image="https://images.unsplash.com/photo-1556745753-b2904692b3cd"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Showcase Your Success Stories?
          </h2>
          <p className="text-xl mb-8">
            Start collecting and displaying testimonials today.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/dashboard">Get Started For Free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
