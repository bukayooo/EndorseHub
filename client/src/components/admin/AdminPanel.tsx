import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

interface AdminUser {
  id: number
  email: string
  is_admin: boolean
  is_premium: boolean
  stripe_subscription_id: string | null
  premium_expires_at: string | null
}

export function AdminPanel() {
  const [searchEmail, setSearchEmail] = useState("")
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    if (!searchEmail) {
      toast.error("Please enter an email to search")
      return
    }

    setIsLoading(true)
    try {
      console.log('[Admin] Searching for user:', searchEmail);
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(searchEmail)}`)
      const { success, data, error } = await response.json()
      
      if (!success) {
        throw new Error(error || "Failed to search user")
      }
      
      console.log('[Admin] Found user:', data);
      setSelectedUser(data)
      toast.success("User found")
    } catch (error) {
      console.error('[Admin] Search error:', error);
      toast.error(error instanceof Error ? error.message : "User not found")
      setSelectedUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (updates: Partial<AdminUser>) => {
    if (!selectedUser) return

    setIsLoading(true)
    try {
      console.log('[Admin] Updating user:', { userId: selectedUser.id, updates });
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      
      const { success, data, error } = await response.json()
      
      if (!success) {
        throw new Error(error || "Failed to update user")
      }
      
      console.log('[Admin] User updated:', data);
      setSelectedUser(data)
      toast.success("User updated successfully")
    } catch (error) {
      console.error('[Admin] Update error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update user")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Search and manage user accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="email-search">Search by Email</Label>
            <Input
              id="email-search"
              type="email"
              placeholder="user@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            Search
          </Button>
        </div>

        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-status">Admin Status</Label>
              <Switch
                id="admin-status"
                checked={selectedUser.is_admin}
                onCheckedChange={(checked) => handleUpdateUser({ is_admin: checked })}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="premium-status">Premium Status</Label>
              <Switch
                id="premium-status"
                checked={selectedUser.is_premium}
                onCheckedChange={(checked) => handleUpdateUser({ 
                  is_premium: checked,
                  stripe_subscription_id: checked ? selectedUser.stripe_subscription_id : null,
                  premium_expires_at: checked ? selectedUser.premium_expires_at : null
                })}
                disabled={isLoading}
              />
            </div>

            {selectedUser.is_premium && (
              <>
                <div>
                  <Label htmlFor="subscription-id">Stripe Subscription ID</Label>
                  <Input
                    id="subscription-id"
                    value={selectedUser.stripe_subscription_id || ""}
                    onChange={(e) => handleUpdateUser({ stripe_subscription_id: e.target.value })}
                    placeholder="sub_xxxxx"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="expiry-date">Premium Expiry Date</Label>
                  <Input
                    id="expiry-date"
                    type="datetime-local"
                    value={selectedUser.premium_expires_at?.slice(0, 16) || ""}
                    onChange={(e) => handleUpdateUser({ premium_expires_at: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 