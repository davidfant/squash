import { trpc } from "@/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Activity } from "lucide-react";

export function Dashboard() {
  // Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  // Fetch DAU data
  const dauQuery = trpc.posthog.getDailyActiveUsers.useQuery({
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  });

  // Fetch users data
  const usersQuery = trpc.posthog.getUsers.useQuery({
    limit: 100,
  });

  const totalUsers = usersQuery.data?.results.length || 0;
  const averageDAU =
    dauQuery.data && dauQuery.data.length > 0
      ? Math.round(
          dauQuery.data.reduce((sum, day) => sum + day.value, 0) / dauQuery.data.length
        )
      : 0;

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            PostHog analytics for the last 30 days
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : usersQuery.isError ? (
                <span className="text-destructive text-sm">Error loading</span>
              ) : (
                <div className="text-2xl font-bold">{totalUsers}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Total registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average DAU</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dauQuery.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : dauQuery.isError ? (
                <span className="text-destructive text-sm">Error loading</span>
              ) : (
                <div className="text-2xl font-bold">{averageDAU}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Daily active users (30-day avg)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DAU Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
            <CardDescription>
              Active users per day over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dauQuery.isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : dauQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {dauQuery.error.message || "Failed to load DAU data"}
                </AlertDescription>
              </Alert>
            ) : (
              <ChartContainer
                config={{
                  value: {
                    label: "Active Users",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px]"
              >
                <AreaChart data={dauQuery.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              List of users tracked in PostHog
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : usersQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {usersQuery.error.message || "Failed to load users data"}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {usersQuery.data.results.slice(0, 10).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.distinct_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ID: {user.id}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {usersQuery.data.results.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No users found
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
