import type { Range } from "@tiptap/core"
import type { Slice } from "@tiptap/pm/model"

export type Language =
  | "aa"
  | "ab"
  | "ae"
  | "af"
  | "ak"
  | "am"
  | "an"
  | "ar"
  | "as"
  | "av"
  | "ay"
  | "az"
  | "ba"
  | "be"
  | "bg"
  | "bh"
  | "bi"
  | "bm"
  | "bn"
  | "bo"
  | "br"
  | "bs"
  | "ca"
  | "ce"
  | "ch"
  | "co"
  | "cr"
  | "cs"
  | "cu"
  | "cv"
  | "cy"
  | "da"
  | "de"
  | "dv"
  | "dz"
  | "ee"
  | "el"
  | "en"
  | "eo"
  | "es"
  | "et"
  | "eu"
  | "fa"
  | "ff"
  | "fi"
  | "fj"
  | "fo"
  | "fr"
  | "fy"
  | "ga"
  | "gd"
  | "gl"
  | "gn"
  | "gu"
  | "gv"
  | "ha"
  | "he"
  | "hi"
  | "ho"
  | "hr"
  | "ht"
  | "hu"
  | "hy"
  | "hz"
  | "ia"
  | "id"
  | "ie"
  | "ig"
  | "ii"
  | "ik"
  | "io"
  | "is"
  | "it"
  | "iu"
  | "ja"
  | "jv"
  | "ka"
  | "kg"
  | "ki"
  | "kj"
  | "kk"
  | "kl"
  | "km"
  | "kn"
  | "ko"
  | "kr"
  | "ks"
  | "ku"
  | "kv"
  | "kw"
  | "ky"
  | "la"
  | "lb"
  | "lg"
  | "li"
  | "ln"
  | "lo"
  | "lt"
  | "lu"
  | "lv"
  | "mg"
  | "mh"
  | "mi"
  | "mk"
  | "ml"
  | "mn"
  | "mr"
  | "ms"
  | "mt"
  | "my"
  | "na"
  | "nb"
  | "nd"
  | "ne"
  | "ng"
  | "nl"
  | "nn"
  | "no"
  | "nr"
  | "nv"
  | "ny"
  | "oc"
  | "oj"
  | "om"
  | "or"
  | "os"
  | "pa"
  | "pi"
  | "pl"
  | "ps"
  | "pt"
  | "qu"
  | "rm"
  | "rn"
  | "ro"
  | "ru"
  | "rw"
  | "sa"
  | "sc"
  | "sd"
  | "se"
  | "sg"
  | "si"
  | "sk"
  | "sl"
  | "sm"
  | "sn"
  | "so"
  | "sq"
  | "sr"
  | "ss"
  | "st"
  | "su"
  | "sv"
  | "sw"
  | "ta"
  | "te"
  | "tg"
  | "th"
  | "ti"
  | "tk"
  | "tl"
  | "tn"
  | "to"
  | "tr"
  | "ts"
  | "tt"
  | "tw"
  | "ty"
  | "ug"
  | "uk"
  | "ur"
  | "uz"
  | "ve"
  | "vi"
  | "vo"
  | "wa"
  | "wo"
  | "xh"
  | "yi"
  | "yo"
  | "za"
  | "zh"
  | "zu"

type OpenAITextModel =
  | "gpt-5"
  | "gpt-5-2025-08-07"
  | "gpt-5-mini"
  | "gpt-5-mini-2025-08-07"
  | "gpt-5-nano"
  | "gpt-5-nano-2025-08-07"
  | "gpt-5-chat"
  | "gpt-5-chat-2025-08-07"
  | "gpt-4.1"
  | "gpt-4.1-2025-04-14"
  | "gpt-4.1-mini"
  | "gpt-4.1-mini-2025-04-14"
  | "gpt-4.1-nano"
  | "gpt-4.1-nano-2025-04-14"
  | "chatgpt-4o-latest"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4o"
  | "gpt-4o-2024-11-20"
  | "gpt-4o-2024-08-06"
  | "gpt-4o-2024-05-13"
  | "gpt-4-turbo"
  | "gpt-4-turbo-2024-04-09"
  | "gpt-4-turbo-preview"
  | "gpt-4"
  | "gpt-4-0125-preview"
  | "gpt-4-1106-preview"
  | "gpt-4-0613"
  | "gpt-4-0314"
  | "gpt-4-32k"
  | "gpt-4-32k-0613"
  | "gpt-3.5-turbo-0125"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-1106"
  | "gpt-3.5-turbo-16k"

type TextLength = number

type TextLengthUnit = "paragraphs" | "words" | "characters"

type ImageStyle =
  | "photorealistic"
  | "digital_art"
  | "comic_book"
  | "neon_punk"
  | "isometric"
  | "line_art"
  | "3d_model"
  | string

type ImageSize = "256x256" | "512x512" | "1024x1024"

type TextAction =
  | "shorten"
  | "bloggify"
  | "extend"
  | "emojify"
  | "de-emojify"
  | "simplify"
  | "rephrase"
  | "complete"
  | "autocomplete"
  | "fix-spelling-and-grammar"
  | "translate"
  | "adjust-tone"
  | "summarize"
  | "prompt"
  | "restructure"
  | "keypoints"
  | "tldr"

export type Tone =
  | "default"
  | "academic"
  | "business"
  | "casual"
  | "childfriendly"
  | "confident"
  | "conversational"
  | "creative"
  | "emotional"
  | "excited"
  | "formal"
  | "friendly"
  | "funny"
  | "humorous"
  | "informative"
  | "inspirational"
  | "memeify"
  | "narrative"
  | "objective"
  | "persuasive"
  | "poetic"
  | string

export interface TextOptions {
  modelName?: OpenAITextModel
  /**
   * @default editorSelection
   */
  text?: string
  tone?: Tone | string
  language?: Language
  textLength?: TextLength
  textLengthUnit?: TextLengthUnit
  /**
   * @deprecated Use `format` instead.
   */
  plainText?: boolean
  stream?: boolean
  insert?: boolean
  insertAt?: Range | number
  append?: boolean
  format?: "rich-text" | "plain-text"
  collapseToEnd?: boolean
  startsInline?: boolean
  context?: (
    | {
        type: "url"
        url: string
      }
    | {
        type: "text"
        text: string
      }
  )[]
  regenerate?: boolean
}

type ImageOptions = {
  text?: string
  modelName?: "dall-e-2" | "dall-e-3" | null
  style?: ImageStyle
  size?: ImageSize
}

type AiStorage = {
  pastResponses: string[]
  initialContent: Slice | null
} & (
  | {
      state: "loading"
      response: string
      error: undefined
      generatedWith: {
        action: TextAction
        options: TextOptions
        range: undefined
      }
    }
  | {
      state: "error"
      response: undefined
      error: Error
      generatedWith: {
        action: TextAction
        options: TextOptions
        range: undefined
      }
    }
  | {
      state: "idle"
      response: undefined
      error: undefined
      generatedWith: undefined
    }
  | {
      state: "idle"
      response: string
      error: undefined
      generatedWith: {
        action: TextAction
        options: TextOptions
        range: undefined | Range
      }
    }
)

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ai: {
      aiAdjustTone: (tone: Tone, options?: TextOptions) => ReturnType
      aiBloggify: (options?: TextOptions) => ReturnType
      aiComplete: (options?: TextOptions) => ReturnType
      aiDeEmojify: (options?: TextOptions) => ReturnType
      aiEmojify: (options?: TextOptions) => ReturnType
      aiExtend: (options?: TextOptions) => ReturnType
      aiFixSpellingAndGrammar: (options?: TextOptions) => ReturnType
      aiImagePrompt: (options?: ImageOptions) => ReturnType
      aiKeypoints: (options?: TextOptions) => ReturnType
      aiRephrase: (options?: TextOptions) => ReturnType
      aiRestructure: (options?: TextOptions) => ReturnType
      aiShorten: (options?: TextOptions) => ReturnType
      aiSimplify: (options?: TextOptions) => ReturnType
      aiSummarize: (options?: TextOptions) => ReturnType
      aiTextPrompt: (options?: TextOptions) => ReturnType
      aiTldr: (options?: TextOptions) => ReturnType
      aiTranslate: (language: Language, options?: TextOptions) => ReturnType
      aiAccept: (options?: {
        insertAt?: Range | number
        append?: boolean
      }) => ReturnType
      aiReject: (options?: { type?: "reset" | "pause" }) => ReturnType
      aiRegenerate: (options?: {
        insert?: boolean
        insertAt?: Range | number
      }) => ReturnType
    }
  }

  interface Storage {
    ai: AiStorage
    aiAdvanced: AiStorage
  }
}
