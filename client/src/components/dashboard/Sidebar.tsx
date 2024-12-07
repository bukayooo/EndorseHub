import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Settings,
  MessageSquare,
  Code,
  BarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageSquare, label: "Testimonials", href: "/testimonials" },
  { icon: Code, label: "Widgets", href: "/widgets" },
  { icon: BarChart, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r bg-gray-50/40 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Testimonial Manager</h1>
      </div>

      <nav className="space-y-2">
        {menuItems.map(({ icon: Icon, label, href }) => (
          <Button
            key={href}
            variant="ghost"
            className={cn(
              "w-full justify-start",
              location === href && "bg-gray-100"
            )}
            asChild
          >
            <Link href={href}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Link>
          </Button>
        ))}
      </nav>
    </div>
  );
}
