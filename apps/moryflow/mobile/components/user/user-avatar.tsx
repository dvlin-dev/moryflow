import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useUser } from '@/lib/contexts/auth.context';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, Pressable } from 'react-native';
import { useThemeColors } from '@/lib/theme';

export interface UserAvatarProps extends Omit<React.ComponentProps<typeof Avatar>, 'alt'> {
  size?: string;
  showEditIcon?: boolean;
  editIcon?: LucideIcon;
  onEdit?: () => void;
}

export function UserAvatar({ 
  size = 'size-20',
  showEditIcon = false,
  editIcon: EditIcon,
  onEdit,
  ...avatarProps
}: UserAvatarProps) {
  const { user } = useUser();
  const theme = useThemeColors();

  const { initials, userName } = React.useMemo(() => {
    const userName = user?.name || user?.email || 'Unknown'
    const initials = userName
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 1)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()

    return { initials, userName }
  }, [user?.name, user?.email])

  const AvatarComponent = (
    <Avatar alt={`${userName}'s avatar`} className={size} {...avatarProps}>
      <AvatarFallback className="bg-primary/10">
        <Text className="text-primary font-semibold text-lg">{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );

  if (showEditIcon && EditIcon && onEdit) {
    return (
      <View className="relative">
        {AvatarComponent}
        <Pressable 
          onPress={onEdit}
          className="absolute -bottom-1 -right-1 bg-primary rounded-full p-2"
        >
          <Icon as={EditIcon} className="size-4" color={theme.textInverse} />
        </Pressable>
      </View>
    );
  }

  return AvatarComponent;
}
