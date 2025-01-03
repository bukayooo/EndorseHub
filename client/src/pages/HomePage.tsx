import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import TestimonialCard from "@/components/testimonials/TestimonialCard";
import PricingDialog from "@/components/pricing/PricingDialog";
import AuthPage from "@/pages/AuthPage";

const mockTestimonials = [
  {
    id: 1,
    user_id: 1,
    author_name: "Sarah Johnson",
    content: "This platform has transformed how we collect and showcase customer testimonials. The widgets are beautiful and the analytics provide valuable insights.",
    rating: 5,
    status: "approved",
    source: "direct",
    source_metadata: {},
    source_url: null,
    platform_id: null,
    created_at: new Date()
  },
  {
    id: 2,
    user_id: 1,
    author_name: "Michael Chen",
    content: "Easy to use, great customization options, and excellent support. Our conversion rates have improved significantly since we started using the testimonial widgets.",
    rating: 5,
    status: "approved",
    source: "direct",
    source_metadata: {},
    source_url: null,
    platform_id: null,
    created_at: new Date()
  },
  {
    id: 3,
    user_id: 1,
    author_name: "Emily Rodriguez",
    content: "The social proof this platform provides has been invaluable for our online store. Setup was quick and the results were immediate.",
    rating: 5,
    status: "approved",
    source: "direct",
    source_metadata: {},
    source_url: null,
    platform_id: null,
    created_at: new Date()
  }
];

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const handleGetStarted = () => {
    if (!user) {
      setShowAuthDialog(true);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-24">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Showcase Your Customer Success Stories
            </h1>
            <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Build trust and credibility with beautiful testimonial widgets. Easy to set up, fully customizable, and ready to boost your conversions.
            </p>
            <button
              onClick={handleGetStarted}
              className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {mockTestimonials.map((testimonial) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                showRatings={true}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
                  <path d="M7 7h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Easy Integration</h3>
              <p className="text-gray-500">
                Add testimonials to your website with just a few lines of code. No technical expertise required.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 7h-9" />
                  <path d="M14 17H5" />
                  <circle cx="17" cy="17" r="3" />
                  <circle cx="7" cy="7" r="3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Fully Customizable</h3>
              <p className="text-gray-500">
                Customize the look and feel to match your brand perfectly. Choose from multiple layouts and styles.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                <svg
                  className="h-10 w-10"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Analytics & Insights</h3>
              <p className="text-gray-500">
                Track performance and gather insights about how your testimonials impact conversions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-[425px] p-0" hideCloseButton>
          <AuthPage onClose={() => setShowAuthDialog(false)} />
        </DialogContent>
      </Dialog>

      <PricingDialog
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
      />
    </div>
  );
}