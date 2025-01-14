import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Settings,
  Code,
  BarChart,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Code, label: "Widgets", href: "/widgets" },
  { 
    icon: BarChart, 
    label: "Analytics", 
    href: "/analytics",
    disabled: true,
    tooltip: "Coming soon!"
  },
  { 
    icon: Settings, 
    label: "Settings", 
    href: "/settings"
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { logout } = useUser();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Logout failed",
          description: result.message,
        });
        return;
      }
      
      // Use window.location for hard redirect after logout
      window.location.href = '/';
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-64 border-r bg-gray-50/40 p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">EndorseHub</h1>
      </div>

      <nav className="space-y-2 flex-1">
        {menuItems.map(({ icon: Icon, label, href, disabled, tooltip }) => {
          const ButtonContent = (
            <>
              <Icon className={cn("mr-2 h-4 w-4", disabled && "opacity-50")} />
              <span className={cn(disabled && "opacity-50")}>{label}</span>
              {tooltip && disabled && (
                <span className="ml-2 text-xs text-gray-500">({tooltip})</span>
              )}
            </>
          );

          return (
            <Button
              key={href}
              variant="ghost"
              className={cn(
                "w-full justify-start",
                location === href && "bg-gray-100",
                disabled && "cursor-not-allowed"
              )}
              disabled={disabled}
              asChild={!disabled}
            >
              {disabled ? (
                ButtonContent
              ) : (
                <Link href={href} onClick={(e) => { e.preventDefault(); window.location.href = href; }}>
                  {ButtonContent}
                </Link>
              )}
            </Button>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}
