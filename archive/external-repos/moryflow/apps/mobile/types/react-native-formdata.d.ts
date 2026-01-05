// React Native FormData 追加文件类型扩展
// 使 `formData.append(name, { uri, name, type })` 在 TS 中类型安全

declare global {
  interface FormData {
    append(name: string, value: { uri: string; name: string; type: string } | string): void
  }
}

export {}

