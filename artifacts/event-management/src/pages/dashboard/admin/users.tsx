import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListUsers, getListUsersQueryKey, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const queryParams = { 
    search: search || undefined, 
    role: roleFilter !== "all" ? roleFilter : undefined,
    limit: 50
  };

  const { data, isLoading } = useListUsers(queryParams, {
    query: { queryKey: getListUsersQueryKey(queryParams) }
  });

  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    updateUserMutation.mutate(
      { id, data: { isActive: !currentStatus } },
      {
        onSuccess: () => {
          toast({ title: "User status updated" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(queryParams) });
        }
      }
    );
  };

  const handleChangeRole = (id: number, newRole: string) => {
    updateUserMutation.mutate(
      { id, data: { role: newRole } },
      {
        onSuccess: () => {
          toast({ title: "User role updated" });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(queryParams) });
        }
      }
    );
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "User deleted" });
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(queryParams) });
          }
        }
      );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and roles.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <div className="flex gap-4 mt-4">
              <Input 
                placeholder="Search by name or email..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="participant">Participant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">Loading users...</div>
            ) : data?.users && data.users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select 
                          value={user.role} 
                          onValueChange={(val) => handleChangeRole(user.id, val)}
                          disabled={updateUserMutation.isPending}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="organizer">Organizer</SelectItem>
                            <SelectItem value="participant">Participant</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant={user.isActive ? "outline" : "default"} 
                          size="sm"
                          onClick={() => handleToggleStatus(user.id, user.isActive || false)}
                          disabled={updateUserMutation.isPending}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">No users found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
