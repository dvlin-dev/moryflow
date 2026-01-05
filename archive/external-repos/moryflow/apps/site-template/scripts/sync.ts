/**
 * [INPUT]: dist/styles.min.css, src/templates/*.html, src/templates/*.css
 * [OUTPUT]: apps/pc/src/main/site-publish/template/*.ts
 * [POS]: 同步脚本，将模板产物生成为 PC 端可导入的 TS 模块
 *
 * 用法: pnpm --filter site-template sync
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TEMPLATES_SRC = path.resolve(ROOT, 'src/templates')
const TEMPLATE_OUTPUT = path.resolve(ROOT, '../pc/src/main/site-publish/template')

// ── 文件头注释 ────────────────────────────────────────────────
const FILE_HEADER = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * 此文件由 site-template 的 sync 脚本自动生成
 * 如需修改，请编辑 apps/site-template/src/ 下的源文件
 * 然后执行: cd apps/site-template && pnpm build && pnpm sync
 *
 * Generated at: ${new Date().toISOString()}
 */

`

// ── 主题脚本 ────────────────────────────────────────────────
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('moryflow-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

const THEME_TOGGLE_SCRIPT = `(function(){var btn=document.getElementById('theme-toggle');if(!btn)return;function getTheme(){return localStorage.getItem('moryflow-theme')||'system'}function setTheme(theme){localStorage.setItem('moryflow-theme',theme);var isDark=theme==='dark'||(theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',isDark)}btn.onclick=function(){var c=getTheme();var n=c==='light'?'dark':c==='dark'?'system':'light';setTheme(n)};matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(){if(getTheme()==='system')setTheme('system')})})()`

const MENU_TOGGLE_SCRIPT = `(function(){var btn=document.getElementById('menu-toggle');var sidebar=document.querySelector('.sidebar');var overlay=document.getElementById('sidebar-overlay');if(!btn||!sidebar)return;function toggle(e){e.preventDefault();e.stopPropagation();if(sidebar.classList.contains('open')){sidebar.classList.remove('open');overlay&&overlay.classList.remove('visible');document.body.classList.remove('menu-open')}else{sidebar.classList.add('open');overlay&&overlay.classList.add('visible');document.body.classList.add('menu-open')}}btn.addEventListener('click',toggle,false);if(overlay){overlay.addEventListener('click',function(){sidebar.classList.remove('open');overlay.classList.remove('visible');document.body.classList.remove('menu-open')},false)}var links=sidebar.querySelectorAll('a');for(var i=0;i<links.length;i++){links[i].addEventListener('click',function(){sidebar.classList.remove('open');overlay&&overlay.classList.remove('visible');document.body.classList.remove('menu-open')},false)}})()`

// ── Assets 路径 ────────────────────────────────────────────────
const ASSETS_SRC = path.resolve(ROOT, 'assets')

// ── 工具函数 ────────────────────────────────────────────────
function toConstName(filename: string): string {
  // page.html -> PAGE_TEMPLATE
  // index-page.css -> INDEX_PAGE_STYLES
  // 404.html -> ERROR_404_TEMPLATE (数字开头需要加前缀)
  let name = path.basename(filename, path.extname(filename))
  const ext = path.extname(filename)
  const suffix = ext === '.css' ? 'STYLES' : 'TEMPLATE'
  // 处理以数字开头的文件名
  if (/^\d/.test(name)) {
    name = 'ERROR_' + name
  }
  return name.toUpperCase().replace(/-/g, '_') + '_' + suffix
}

function toFileName(filename: string): string {
  // page.html -> page.ts
  // index-page.css -> index-page-styles.ts
  const name = path.basename(filename, path.extname(filename))
  const ext = path.extname(filename)
  if (ext === '.css') {
    return name + '-styles.ts'
  }
  return name + '.ts'
}

// ── 主函数 ────────────────────────────────────────────────
async function main() {
  console.log('🔄 Syncing site-template to PC app...\n')

  // 1. 检查 dist 是否存在
  const stylesPath = path.join(ROOT, 'dist/styles.min.css')
  try {
    await fs.access(stylesPath)
  } catch {
    console.error('❌ dist/styles.min.css not found. Run `pnpm build` first.')
    process.exit(1)
  }

  // 2. 确保输出目录存在
  await fs.mkdir(TEMPLATE_OUTPUT, { recursive: true })

  // 3. 读取核心样式
  const baseStyles = await fs.readFile(stylesPath, 'utf-8')
  console.log(`📦 Read styles.min.css (${baseStyles.length} chars)`)

  // 4. 读取模板文件
  const templateFiles = await fs.readdir(TEMPLATES_SRC)
  const htmlFiles = templateFiles.filter(f => f.endsWith('.html'))
  const cssFiles = templateFiles.filter(f => f.endsWith('.css'))

  console.log(`📄 Found ${htmlFiles.length} HTML templates, ${cssFiles.length} CSS files`)

  // 5. 生成 styles.ts (核心样式)
  const stylesOutput = `${FILE_HEADER}/** 设计系统 CSS（Notion+Arc 风格） */
export const STYLES = ${JSON.stringify(baseStyles)}
`
  await fs.writeFile(path.join(TEMPLATE_OUTPUT, 'styles.ts'), stylesOutput)
  console.log('✅ Generated: styles.ts')

  // 6. 生成 scripts.ts (交互脚本)
  const scriptsOutput = `${FILE_HEADER}/** 主题初始化脚本（防止闪烁，放在 <head>） */
export const THEME_INIT_SCRIPT = ${JSON.stringify(THEME_INIT_SCRIPT)}

/** 主题切换脚本（按钮交互，放在 </body> 前） */
export const THEME_TOGGLE_SCRIPT = ${JSON.stringify(THEME_TOGGLE_SCRIPT)}

/** 移动端菜单脚本 */
export const MENU_TOGGLE_SCRIPT = ${JSON.stringify(MENU_TOGGLE_SCRIPT)}
`
  await fs.writeFile(path.join(TEMPLATE_OUTPUT, 'scripts.ts'), scriptsOutput)
  console.log('✅ Generated: scripts.ts')

  // 7. 生成 favicon.ts (网站图标，可选)
  const faviconPath = path.join(ASSETS_SRC, 'favicon.ico')
  let hasFavicon = false
  try {
    await fs.access(faviconPath)
    const faviconBuffer = await fs.readFile(faviconPath)
    const faviconBase64 = faviconBuffer.toString('base64')
    const faviconOutput = `${FILE_HEADER}/** favicon.ico 网站图标（base64 编码） */
export const FAVICON_ICO = ${JSON.stringify(faviconBase64)}
`
    await fs.writeFile(path.join(TEMPLATE_OUTPUT, 'favicon.ts'), faviconOutput)
    console.log(`✅ Generated: favicon.ts (${faviconBuffer.length} bytes)`)
    hasFavicon = true
  } catch {
    console.log('⚠️  Skipped: favicon.ico not found in assets/')
  }

  // 8. 生成各 CSS 文件
  for (const cssFile of cssFiles) {
    const content = await fs.readFile(path.join(TEMPLATES_SRC, cssFile), 'utf-8')
    const constName = toConstName(cssFile)
    const outputName = toFileName(cssFile)
    const output = `${FILE_HEADER}/** ${cssFile} 额外样式 */
export const ${constName} = ${JSON.stringify(content)}
`
    await fs.writeFile(path.join(TEMPLATE_OUTPUT, outputName), output)
    console.log(`✅ Generated: ${outputName}`)
  }

  // 9. 生成各 HTML 模板文件
  for (const htmlFile of htmlFiles) {
    const content = await fs.readFile(path.join(TEMPLATES_SRC, htmlFile), 'utf-8')
    const constName = toConstName(htmlFile)
    const outputName = toFileName(htmlFile)
    const output = `${FILE_HEADER}/** ${htmlFile} 模板 */
export const ${constName} = ${JSON.stringify(content)}
`
    await fs.writeFile(path.join(TEMPLATE_OUTPUT, outputName), output)
    console.log(`✅ Generated: ${outputName}`)
  }

  // 10. 生成 index.ts (统一导出)
  const indexExports = [
    `export { STYLES } from './styles.js'`,
    `export { THEME_INIT_SCRIPT, THEME_TOGGLE_SCRIPT, MENU_TOGGLE_SCRIPT } from './scripts.js'`,
    ...(hasFavicon ? [`export { FAVICON_ICO } from './favicon.js'`] : []),
    ...cssFiles.map(f => {
      const constName = toConstName(f)
      const moduleName = toFileName(f).replace('.ts', '.js')
      return `export { ${constName} } from './${moduleName}'`
    }),
    ...htmlFiles.map(f => {
      const constName = toConstName(f)
      const moduleName = toFileName(f).replace('.ts', '.js')
      return `export { ${constName} } from './${moduleName}'`
    }),
  ]
  const indexOutput = `${FILE_HEADER}// 统一导出所有模板资源
${indexExports.join('\n')}
`
  await fs.writeFile(path.join(TEMPLATE_OUTPUT, 'index.ts'), indexOutput)
  console.log('✅ Generated: index.ts')

  // 11. 输出摘要
  console.log('\n📊 Summary:')
  console.log(`   - Base styles: ${baseStyles.length} chars`)
  console.log(`   - HTML templates: ${htmlFiles.join(', ')}`)
  console.log(`   - CSS files: ${cssFiles.join(', ')}`)
  console.log(`   - Output files: ${2 + cssFiles.length + htmlFiles.length + 1} files`)
  console.log('\n🎉 Sync complete!')
}

main().catch((err) => {
  console.error('❌ Sync failed:', err)
  process.exit(1)
})
