import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

interface TestimonialCardProps {
  author: string;
  title?: string;
  content: string;
  rating?: number;
  image?: string;
}

export default function TestimonialCard({
  author,
  title,
  content,
  rating = 5,
  image,
}: TestimonialCardProps) {
  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={image || `https://i.pravatar.cc/150?u=${author}`} alt={author} />
          <AvatarFallback>{author[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{author}</h3>
          {title && <p className="text-sm text-gray-500">{title}</p>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <p className="text-gray-600">{content}</p>
      </CardContent>
    </Card>
  );
}
