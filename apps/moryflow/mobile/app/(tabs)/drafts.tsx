import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'

/**
 * 草稿 Tab 页面
 * 每次进入都跳转到新建草稿页面
 */
export default function DraftsScreen() {
  useEffect(() => {
    // 使用 replace 避免返回时再次触发跳转
    router.replace('/(editor)/new-draft')
  }, [])

  // 跳转前显示加载状态
  return (
    <View className="flex-1 justify-center items-center bg-background">
      <ActivityIndicator size="large" />
    </View>
  )
}
