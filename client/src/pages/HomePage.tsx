import { Button } from "@/components/ui/button";
import TestimonialCard from "@/components/testimonials/TestimonialCard";

interface HomePageProps {
  onGetStarted: () => void;
}

export default function HomePage({ onGetStarted }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            Showcase Your Customer Testimonials
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Build trust and credibility by displaying authentic customer reviews on your website.
          </p>
          <Button onClick={onGetStarted} size="lg">
            Get Started
          </Button>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Easy Integration</h3>
            <p className="text-gray-600">
              Add testimonials to your website with just a few lines of code.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Customizable Design</h3>
            <p className="text-gray-600">
              Match your brand's look and feel with our flexible styling options.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Analytics & Insights</h3>
            <p className="text-gray-600">
              Track the impact of your testimonials with detailed analytics.
            </p>
          </div>
        </div>

        {/* Example Testimonials */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-center">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              author="Sarah Johnson"
              content="EndorseHub has transformed how we display customer reviews. The integration was seamless, and our conversion rates have improved significantly."
            />
            <TestimonialCard
              author="Michael Chen"
              content="The analytics feature is a game-changer. We can now track how our testimonials impact user behavior and make data-driven decisions."
            />
            <TestimonialCard
              author="Emily Rodriguez"
              content="The customization options are fantastic. Our testimonials now perfectly match our brand's aesthetic, creating a cohesive user experience."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600">
            Join thousands of businesses using EndorseHub to showcase their customer testimonials.
          </p>
          <Button onClick={onGetStarted} size="lg">
            Start Now
          </Button>
        </div>
      </div>
    </div>
  );
}