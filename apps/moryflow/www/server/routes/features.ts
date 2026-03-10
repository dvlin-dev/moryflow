import { defineEventHandler, sendRedirect } from 'vinxi/http';

export default defineEventHandler((event) => {
  return sendRedirect(event, '/', 301);
});
