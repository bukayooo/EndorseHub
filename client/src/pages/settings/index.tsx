import { useUser } from "@/hooks/use-user";
import Sidebar from "@/components/dashboard/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPanel } from "@/components/admin/AdminPanel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function SettingsPage() {
  const { user } = useUser();

  console.log('[Settings] Current user:', {
    id: user?.id,
    email: user?.email,
    isAdmin: user?.is_admin,
    isPremium: user?.is_premium,
    raw: user
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>

          <Tabs defaultValue="account" className="space-y-4">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              {user?.is_admin && (
                <TabsTrigger value="admin">Admin Panel</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Account settings content */}
                </CardContent>
              </Card>
            </TabsContent>

            {user?.is_admin && (
              <TabsContent value="admin">
                <AdminPanel />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
} 