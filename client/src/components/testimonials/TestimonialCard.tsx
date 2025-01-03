import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import type { Testimonial } from "@/types/db";

interface TestimonialCardProps {
  testimonial: Testimonial;
  onDelete?: () => void;
  showRatings?: boolean;
}

export default function TestimonialCard({
  testimonial,
  onDelete,
  showRatings = true,
}: TestimonialCardProps) {
  const { author_name, content, rating = 5 } = testimonial;

  return (
    <Card className={`transition-all hover:shadow-lg relative ${onDelete ? '' : 'cursor-pointer'}`}>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{author_name && author_name.length > 0 ? author_name[0].toUpperCase() : '?'}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{author_name}</h3>
        </div>
      </CardHeader>
      <CardContent>
        {showRatings && (
          <div className="flex mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < (rating || 5) ? "text-yellow-400 fill-current" : "text-gray-300"
                }`}
              />
            ))}
          </div>
        )}
        <p className="text-gray-600">{content}</p>
      </CardContent>
    </Card>
  );
}
