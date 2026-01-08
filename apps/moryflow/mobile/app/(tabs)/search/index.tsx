/**
 * 搜索页面
 *
 * 功能：
 * - 搜索笔记（按文件名过滤）
 * - 显示最近打开的文档（按时间分组）
 */

import { View, SectionList } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useRecentlyOpened } from '@/lib/vault/recently-opened';

import { SearchInput, SearchResultItem, SectionHeader, EmptyState } from './components';
import { groupByTime, filterByQuery, toSearchResults } from './helper';
import type { SearchResultItem as SearchResultItemType } from './const';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { items: recentItems } = useRecentlyOpened();

  // 数据处理：转换 -> 过滤 -> 分组
  const searchResults = useMemo(() => {
    const converted = toSearchResults(recentItems);
    const filtered = filterByQuery(converted, debouncedQuery);
    return groupByTime(filtered);
  }, [recentItems, debouncedQuery]);

  // 点击文件（使用 fileId 路由）
  const handleItemPress = useCallback(
    (item: SearchResultItemType) => {
      router.push({ pathname: '/(editor)/[fileId]', params: { fileId: item.fileId } });
    },
    [router]
  );

  const hasQuery = query.trim().length > 0;
  const isEmpty =
    searchResults.length === 0 || searchResults.every((section) => section.data.length === 0);

  return (
    <View className="bg-page-background flex-1">
      {/* 搜索栏 */}
      <View className="px-4 pb-2" style={{ paddingTop: insets.top }}>
        <SearchInput value={query} onChangeText={setQuery} />
      </View>

      {/* 结果列表 */}
      {isEmpty ? (
        <EmptyState hasQuery={hasQuery} query={query} />
      ) : (
        <SectionList
          sections={searchResults}
          keyExtractor={(item) => item.fileId}
          renderItem={({ item }) => (
            <SearchResultItem item={item} onPress={() => handleItemPress(item)} />
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          contentContainerStyle={{ paddingBottom: 120 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
