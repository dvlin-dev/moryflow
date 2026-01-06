/**
 * 用户详情页面
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, SubscriptionTier } from '@/types';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [newTier, setNewTier] = useState<SubscriptionTier>('FREE');
  const [creditsAmount, setCreditsAmount] = useState('');
  const [creditsReason, setCreditsReason] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get<User>(`/admin/users/${id}`),
    enabled: !!id,
  });

  const setTierMutation = useMutation({
    mutationFn: (tier: SubscriptionTier) => api.post(`/admin/users/${id}/tier`, { tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success('Tier updated successfully');
    },
    onError: () => toast.error('Failed to update tier'),
  });

  const grantCreditsMutation = useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      api.post(`/admin/users/${id}/credits`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      setCreditsAmount('');
      setCreditsReason('');
      toast.success('Credits granted successfully');
    },
    onError: () => toast.error('Failed to grant credits'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const restoreMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success('User restored');
    },
    onError: () => toast.error('Failed to restore user'),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    );
  }

  const tierColors = {
    FREE: 'secondary',
    STARTER: 'outline',
    PRO: 'default',
    MAX: 'success',
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">User Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <div className="font-medium">{user.email}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <div className="font-medium">{user.name || '-'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Tier</Label>
              <div>
                <Badge variant={tierColors[user.tier]}>{user.tier}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Credit Balance</Label>
              <div className="font-medium">{user.creditBalance}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Admin</Label>
              <div>
                {user.isAdmin ? (
                  <Badge variant="success">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <div className="font-medium">
                {format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm')}
              </div>
            </div>
            {user.deletedAt && (
              <div>
                <Label className="text-muted-foreground">Deleted</Label>
                <div className="font-medium text-destructive">
                  {format(new Date(user.deletedAt), 'yyyy-MM-dd HH:mm')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Set Tier</CardTitle>
              <CardDescription>Change user subscription tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {(['FREE', 'STARTER', 'PRO', 'MAX'] as SubscriptionTier[]).map((tier) => (
                  <Button
                    key={tier}
                    variant={newTier === tier ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewTier(tier)}
                  >
                    {tier}
                  </Button>
                ))}
              </div>
              <Button
                onClick={() => setTierMutation.mutate(newTier)}
                disabled={setTierMutation.isPending}
              >
                Update Tier
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grant Credits</CardTitle>
              <CardDescription>Add credits to user account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={creditsReason}
                  onChange={(e) => setCreditsReason(e.target.value)}
                  placeholder="Manual grant"
                />
              </div>
              <Button
                onClick={() =>
                  grantCreditsMutation.mutate({
                    amount: parseInt(creditsAmount),
                    reason: creditsReason,
                  })
                }
                disabled={grantCreditsMutation.isPending || !creditsAmount || !creditsReason}
              >
                Grant Credits
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              {user.deletedAt ? (
                <Button
                  variant="outline"
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                >
                  Restore User
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  Delete User
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
