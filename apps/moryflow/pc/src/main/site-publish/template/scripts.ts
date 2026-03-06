/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * 此文件由 site-template 的 sync 脚本自动生成
 * 如需修改，请编辑 apps/moryflow/site-template/src/ 下的源文件
 * 然后执行: cd apps/moryflow/site-template && pnpm build && pnpm sync
 */

/** 主题初始化脚本（防止闪烁，放在 <head>） */
export const THEME_INIT_SCRIPT =
  "(function(){try{var theme=localStorage.getItem('moryflow-theme')||'system';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=theme==='dark'||(theme==='system'&&prefersDark);document.documentElement.classList.toggle('dark',isDark)}catch(_error){}})()";

/** 主题切换脚本（按钮交互，放在 </body> 前） */
export const THEME_TOGGLE_SCRIPT =
  "(function(){var btn=document.getElementById('theme-toggle');if(!btn)return;var media=matchMedia('(prefers-color-scheme:dark)');function getTheme(){return localStorage.getItem('moryflow-theme')||'system'}function isDarkTheme(theme){return theme==='dark'||(theme==='system'&&media.matches)}function applyTheme(theme){localStorage.setItem('moryflow-theme',theme);document.documentElement.classList.toggle('dark',isDarkTheme(theme))}function getNextTheme(current){switch(current){case'light':return'dark';case'dark':return'system';default:return'light'}}btn.onclick=function(){applyTheme(getNextTheme(getTheme()))};media.addEventListener('change',function(){if(getTheme()==='system'){applyTheme('system')}})})()";

/** 移动端菜单脚本 */
export const MENU_TOGGLE_SCRIPT =
  "(function(){var btn=document.getElementById('menu-toggle');var sidebar=document.querySelector('.sidebar');var overlay=document.getElementById('sidebar-overlay');if(!btn||!sidebar)return;function toggle(e){e.preventDefault();e.stopPropagation();if(sidebar.classList.contains('open')){sidebar.classList.remove('open');overlay&&overlay.classList.remove('visible');document.body.classList.remove('menu-open')}else{sidebar.classList.add('open');overlay&&overlay.classList.add('visible');document.body.classList.add('menu-open')}}btn.addEventListener('click',toggle,false);if(overlay){overlay.addEventListener('click',function(){sidebar.classList.remove('open');overlay.classList.remove('visible');document.body.classList.remove('menu-open')},false)}var links=sidebar.querySelectorAll('a');for(var i=0;i<links.length;i++){links[i].addEventListener('click',function(){sidebar.classList.remove('open');overlay&&overlay.classList.remove('visible');document.body.classList.remove('menu-open')},false)}})()";
