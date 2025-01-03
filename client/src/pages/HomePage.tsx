import { Button } from "@/components/ui/button";
import TestimonialCard from "@/components/testimonials/TestimonialCard";
import type { Testimonial } from "@/types/db";

const testimonials: Testimonial[] = [
  {
    id: 1,
    user_id: 1,
    author_name: "Sarah Johnson",
    content: "This platform has completely transformed how we collect and showcase customer testimonials. The automation features save us hours every week!",
    rating: 5,
    status: "approved",
    source: "direct",
    source_metadata: {},
    source_url: null,
    platform_id: null,
    created_at: new Date(),
  },
  {
    id: 2,
    user_id: 1,
    author_name: "Michael Chen",
    content: "The widget customization options are fantastic. We were able to match our brand perfectly and the testimonials look great on our website.",
    rating: 5,
    status: "approved",
    source: "direct",
    source_metadata: {},
    source_url: null,
    platform_id: null,
    created_at: new Date(),
  },
  {
    id: 3,
    user_id: 1,
    author_name: "Emily Rodriguez",
    content: "Being able to import reviews from multiple platforms and manage them in one place is a game-changer. Highly recommended!",
    rating: 5,
    status: "approved",
    source: "direct",
    source_metadata: {},
    source_url: null,
    platform_id: null,
    created_at: new Date(),
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TestimonialHub</h1>
          <div className="space-x-4">
            <Button variant="ghost" asChild>
              <a href="/auth?mode=login">Login</a>
            </Button>
            <Button asChild>
              <a href="/auth?mode=register">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-bold mb-6">
              Showcase Your Customer Love
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Collect, manage, and display customer testimonials with ease.
              Import reviews from multiple platforms and create beautiful widgets
              for your website.
            </p>
            <Button size="lg" asChild>
              <a href="/auth?mode=register">Start Free Trial</a>
            </Button>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Trusted by Businesses Like Yours
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <TestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  showRatings={true}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-12">Ready to Get Started?</h2>
            <Button size="lg" asChild>
              <a href="/auth?mode=register">Start Your Free Trial</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground">
            © 2024 TestimonialHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}